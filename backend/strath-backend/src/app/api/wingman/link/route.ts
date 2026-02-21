import { NextRequest } from "next/server";
import crypto from "crypto";
import { and, eq, gt } from "drizzle-orm";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { session as sessionTable, wingmanLinks, agentAnalytics } from "@/db/schema";

export const dynamic = "force-dynamic";

type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;

async function getSession(req: NextRequest): Promise<AuthSession> {
    let session: AuthSession = await auth.api.getSession({ headers: req.headers });

    if (!session) {
        const authHeader = req.headers.get("authorization");
        if (authHeader?.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            const dbSession = await db.query.session.findFirst({
                where: eq(sessionTable.token, token),
                with: { user: true },
            });
            if (dbSession && dbSession.expiresAt > new Date()) {
                session = { session: dbSession, user: dbSession.user } as unknown as AuthSession;
            }
        }
    }

    return session;
}

export async function POST(req: NextRequest) {
    try {
        const session = await getSession(req);
        if (!session?.user?.id) return errorResponse("Unauthorized", 401);
        const userId = session.user.id;

        // Remove any existing active collecting link for this user
        await db
            .delete(wingmanLinks)
            .where(
                and(
                    eq(wingmanLinks.profileUserId, userId),
                    eq(wingmanLinks.status, "collecting"),
                    gt(wingmanLinks.expiresAt, new Date())
                )
            );

        const last = await db.query.wingmanLinks.findFirst({
            where: eq(wingmanLinks.profileUserId, userId),
            orderBy: (t, { desc }) => [desc(t.roundNumber)],
            columns: { roundNumber: true },
        });

        const roundNumber = (last?.roundNumber ?? 0) + 1;

        const token = crypto.randomBytes(24).toString("hex");
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const [link] = await db
            .insert(wingmanLinks)
            .values({
                profileUserId: userId,
                roundNumber,
                token,
                targetSubmissions: 3,
                currentSubmissions: 0,
                expiresAt,
                status: "collecting",
            })
            .returning();

        // Lightweight analytics (non-blocking)
        db.insert(agentAnalytics)
            .values({
                userId,
                eventType: "wingman_link_created",
                metadata: { roundNumber },
            })
            .catch(() => {});

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;

        return successResponse({
            roundNumber: link.roundNumber,
            token: link.token,
            url: `${baseUrl}/wingman/${link.token}`,
            targetSubmissions: link.targetSubmissions ?? 3,
            currentSubmissions: link.currentSubmissions ?? 0,
            expiresAt: link.expiresAt,
            status: link.status,
        });
    } catch (error) {
        console.error("[POST /api/wingman/link]", error);
        return errorResponse("Failed to start wingman round", 500);
    }
}
