import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { redis } from "@/lib/redis";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    let session = await auth.api.getSession({ headers: req.headers });

    // Fallback: Manual token check for Bearer token auth (mobile clients)
    if (!session) {
        const authHeader = req.headers.get('authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const { session: sessionTable } = await import("@/db/schema");
            const dbSession = await db.query.session.findFirst({
                where: eq(sessionTable.token, token),
                with: { user: true }
            });

            if (dbSession && dbSession.expiresAt > new Date()) {
                session = { session: dbSession, user: dbSession.user } as any;
            }
        }
    }

    if (!session) {
        return new Response("Unauthorized", { status: 401 });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            // Keep-alive interval
            const keepAlive = setInterval(() => {
                controller.enqueue(encoder.encode(": keep-alive\n\n"));
            }, 30000);

            // Function to send events
            const sendEvent = (data: any) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            };

            // Initial events from Redis (latest 10 pulses)
            try {
                const recentPulses = await redis.lrange('pulse_events', 0, 9);
                recentPulses.reverse().forEach(pulse => {
                    sendEvent(pulse);
                });
            } catch (err) {
                console.error("Pulse SSE: Error fetching initial events", err);
            }

            // Simple polling for new events in serverless
            let lastChecked = Date.now();
            const pollInterval = setInterval(async () => {
                try {
                    const latest: any = await redis.lindex('pulse_events', 0);
                    if (latest && latest.timestamp > lastChecked) {
                        sendEvent(latest);
                        lastChecked = latest.timestamp;
                    }
                } catch (err) {
                    // Fail silently or close
                }
            }, 5000);

            req.signal.addEventListener("abort", () => {
                clearInterval(keepAlive);
                clearInterval(pollInterval);
            });
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    });
}
