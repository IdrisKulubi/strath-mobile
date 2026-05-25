import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { session as sessionTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { successResponse, errorResponse } from "@/lib/api-response";
import { logEvent, EVENT_TYPES } from "@/lib/analytics";
import { z } from "zod";

const outcomeSchema = z.object({
    context: z.enum(["mutual_match", "after_confirm", "settings"]),
    outcome: z.enum(["accepted", "dismissed"]),
});

async function getSessionWithFallback(req: NextRequest) {
    let session = await auth.api.getSession({ headers: req.headers });

    if (!session) {
        const authHeader = req.headers.get("authorization");
        if (authHeader?.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            const dbSession = await db.query.session.findFirst({
                where: eq(sessionTable.token, token),
                with: { user: true },
            });

            if (dbSession && dbSession.expiresAt > new Date()) {
                session = { session: dbSession, user: dbSession.user } as typeof session;
            }
        }
    }

    return session;
}

export async function POST(req: NextRequest) {
    try {
        const session = await getSessionWithFallback(req);
        if (!session?.user?.id) return errorResponse(new Error("Unauthorized"), 401);

        const body = await req.json();
        const { context, outcome } = outcomeSchema.parse(body);

        await logEvent(EVENT_TYPES.PUSH_PRE_PROMPT, session.user.id, {
            context,
            outcome,
        });

        return successResponse({ success: true });
    } catch (error) {
        return errorResponse(error);
    }
}
