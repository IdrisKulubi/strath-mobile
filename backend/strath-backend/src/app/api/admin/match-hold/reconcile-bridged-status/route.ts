import { NextRequest } from "next/server";
import { eq, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { mutualMatches, profiles } from "@/db/schema";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getSessionWithFallback } from "@/lib/auth-helpers";
import { syncMutualMatchFromDateMatch } from "@/lib/services/mutual-match-service";

export const dynamic = "force-dynamic";

function isAuthorizedInternalRequest(req: NextRequest) {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization") || "";
    const bearer = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
    const xCronSecret = req.headers.get("x-cron-secret");
    return !!cronSecret && (bearer === cronSecret || xCronSecret === cronSecret);
}

/**
 * POST /api/admin/match-hold/reconcile-bridged-status
 *
 * Walks every `mutualMatches` row that has a linked `legacyDateMatchId` and re-syncs it from
 * the admin-facing `dateMatches` row (status + venue/schedule fields). Repairs stuck entries
 * created before `syncMutualMatchFromDateMatch` was wired into admin actions — e.g. dates that
 * were scheduled or marked attended but whose mutual row is still `being_arranged`, so the
 * mobile Arranging tab and home hold card keep showing a date that's actually done.
 *
 * Idempotent. Safe to re-run.
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

        const bridgedRows = await db
            .select({
                id: mutualMatches.id,
                legacyDateMatchId: mutualMatches.legacyDateMatchId,
                status: mutualMatches.status,
            })
            .from(mutualMatches)
            .where(isNotNull(mutualMatches.legacyDateMatchId));

        const results: Array<{
            mutualMatchId: string;
            dateMatchId: string;
            previousStatus: string;
            nextStatus: string;
            synced: boolean;
        }> = [];

        for (const row of bridgedRows) {
            if (!row.legacyDateMatchId) continue;
            const outcome = await syncMutualMatchFromDateMatch(row.legacyDateMatchId);
            results.push({
                mutualMatchId: row.id,
                dateMatchId: row.legacyDateMatchId,
                previousStatus: outcome.previousStatus ?? row.status,
                nextStatus: outcome.nextStatus ?? row.status,
                synced: outcome.synced,
            });
        }

        const syncedCount = results.filter((r) => r.synced).length;

        console.log("[admin/match-hold/reconcile-bridged-status] done", {
            scanned: bridgedRows.length,
            synced: syncedCount,
        });

        return successResponse({
            scanned: bridgedRows.length,
            synced: syncedCount,
            results,
        });
    } catch (error) {
        console.error("[admin/match-hold/reconcile-bridged-status] Error:", error);
        return errorResponse(error);
    }
}
