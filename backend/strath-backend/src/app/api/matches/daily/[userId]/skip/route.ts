import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dailyMatchSkips, profiles } from "@/db/schema";
import { eq, and, gte, lt } from "drizzle-orm";
import { successResponse, errorResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

async function getSessionWithFallback(req: NextRequest) {
    let session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
        const authHeader = req.headers.get("authorization");
        if (authHeader?.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            const { session: sessionTable } = await import("@/db/schema");
            const dbSession = await db.query.session.findFirst({
                where: eq(sessionTable.token, token),
                with: { user: true },
            });
            if (dbSession && dbSession.expiresAt > new Date()) {
                session = { session: dbSession, user: dbSession.user } as any;
            }
        }
    }
    return session;
}

/**
 * POST /api/matches/daily/[userId]/skip
 *
 * Soft-skip a daily match. The skipped user is excluded from today's matches
 * but may appear again tomorrow.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const session = await getSessionWithFallback(req);
        if (!session?.user?.id) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const { userId: skippedUserId } = await params;
        if (!skippedUserId) {
            return errorResponse(new Error("Missing userId"), 400);
        }

        if (skippedUserId === session.user.id) {
            return errorResponse(new Error("Cannot skip yourself"), 400);
        }

        const targetProfile = await db.query.profiles.findFirst({
            where: eq(profiles.userId, skippedUserId),
        });

        if (!targetProfile || !targetProfile.isVisible) {
            return errorResponse(new Error("User not found"), 404);
        }

        const startOfToday = new Date();
        startOfToday.setUTCHours(0, 0, 0, 0);
        const startOfTomorrow = new Date(startOfToday);
        startOfTomorrow.setUTCDate(startOfTomorrow.getUTCDate() + 1);

        const existing = await db.query.dailyMatchSkips.findFirst({
            where: and(
                eq(dailyMatchSkips.userId, session.user.id),
                eq(dailyMatchSkips.skippedUserId, skippedUserId),
                gte(dailyMatchSkips.skippedAt, startOfToday),
                lt(dailyMatchSkips.skippedAt, startOfTomorrow)
            ),
        });

        if (existing) {
            return successResponse({ skipped: true, userId: skippedUserId });
        }

        await db.insert(dailyMatchSkips).values({
            userId: session.user.id,
            skippedUserId,
        });

        return successResponse({ skipped: true, userId: skippedUserId });
    } catch (error) {
        console.error("[matches/daily/[userId]/skip] Error:", error);
        return errorResponse(error);
    }
}
