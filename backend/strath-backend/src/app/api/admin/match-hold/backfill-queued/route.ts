import { NextRequest } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { mutualMatches, profiles } from "@/db/schema";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getSessionWithFallback } from "@/lib/auth-helpers";
import { expireQueuedPairsForUser } from "@/lib/services/match-hold-service";

export const dynamic = "force-dynamic";

const ACTIVE_HOLD_STATUSES = [
    "mutual",
    "call_pending",
    "being_arranged",
    "upcoming",
    "completed",
] as const;

function isAuthorizedInternalRequest(req: NextRequest) {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization") || "";
    const bearer = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
    const xCronSecret = req.headers.get("x-cron-secret");
    return !!cronSecret && (bearer === cronSecret || xCronSecret === cronSecret);
}

/**
 * POST /api/admin/match-hold/backfill-queued
 *
 * One-shot (idempotent) cleanup that, for every user currently in an active mutual / arrangement,
 * expires their `queued` and non-mutual `active` candidate_pairs so the partners on the other
 * side can be re-matched with someone else. Safe to re-run.
 *
 * Returns: { processedUsers, totalExpired, perUser: [{ userId, expired }] }
 */
export async function POST(req: NextRequest) {
    try {
        let isAdmin = false;
        const session = await getSessionWithFallback(req);
        if (session?.user?.id) {
            const profile = await db.query.profiles.findFirst({
                where: eq(profiles.userId, session.user.id),
            });
            isAdmin = profile?.role === "admin";
        }

        if (!isAdmin && !isAuthorizedInternalRequest(req)) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const rows = await db
            .select({
                userAId: mutualMatches.userAId,
                userBId: mutualMatches.userBId,
                candidatePairId: mutualMatches.candidatePairId,
            })
            .from(mutualMatches)
            .where(inArray(mutualMatches.status, [...ACTIVE_HOLD_STATUSES]));

        const userIdToExcludePairs = new Map<string, Set<string>>();
        for (const row of rows) {
            for (const userId of [row.userAId, row.userBId]) {
                const set = userIdToExcludePairs.get(userId) ?? new Set<string>();
                set.add(row.candidatePairId);
                userIdToExcludePairs.set(userId, set);
            }
        }

        const perUser: { userId: string; expired: number }[] = [];
        let totalExpired = 0;

        for (const [userId, excludeSet] of userIdToExcludePairs.entries()) {
            const expired = await expireQueuedPairsForUser(userId, {
                excludePairIds: Array.from(excludeSet),
                reason: "backfill_existing_mutual",
            });
            perUser.push({ userId, expired });
            totalExpired += expired;
        }

        console.log("[admin/match-hold/backfill-queued] done", {
            processedUsers: perUser.length,
            totalExpired,
        });

        return successResponse({
            processedUsers: perUser.length,
            totalExpired,
            perUser,
        });
    } catch (error) {
        console.error("[admin/match-hold/backfill-queued] Error:", error);
        return errorResponse(error);
    }
}
