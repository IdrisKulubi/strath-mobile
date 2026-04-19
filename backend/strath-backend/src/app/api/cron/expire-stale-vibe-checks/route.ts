import { NextRequest } from "next/server";
import { and, eq, isNotNull, lt, ne, or } from "drizzle-orm";
import { successResponse, errorResponse } from "@/lib/api-response";
import { db } from "@/lib/db";
import { mutualMatches, vibeChecks } from "@/db/schema";
import { isAuthorizedCronRequest } from "@/lib/security";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEFAULT_HARD_EXPIRY_HOURS = 24;

function getHardExpiryHours(): number {
    const raw = Number(process.env.VIBE_CHECK_DECISION_HARD_EXPIRY_HOURS);
    if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_HARD_EXPIRY_HOURS;
    return Math.min(raw, 24 * 14);
}

/**
 * GET /api/cron/expire-stale-vibe-checks
 *
 * Hard-expires vibe checks that:
 *   - have an `endedAt` older than VIBE_CHECK_DECISION_HARD_EXPIRY_HOURS
 *   - have status not already in (`expired`, `cancelled`)
 *   - did not result in a mutual meet
 *
 * For each, sets `vibeChecks.status = 'expired'` and flips the linked
 * `mutualMatches.status` (when still `call_pending`) to `expired`, releasing both
 * users from the date hold per `match-hold-service` rules.
 */
export async function GET(req: NextRequest) {
    try {
        if (!isAuthorizedCronRequest(req)) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const cutoff = new Date(Date.now() - getHardExpiryHours() * 60 * 60 * 1000);

        const stale = await db
            .select()
            .from(vibeChecks)
            .where(
                and(
                    isNotNull(vibeChecks.endedAt),
                    lt(vibeChecks.endedAt, cutoff),
                    eq(vibeChecks.bothAgreedToMeet, false),
                    ne(vibeChecks.status, "expired"),
                    ne(vibeChecks.status, "cancelled"),
                ),
            );

        let expiredVibeChecks = 0;
        let releasedHolds = 0;
        const now = new Date();

        for (const check of stale) {
            const bothDecided = !!check.user1Decision && !!check.user2Decision;
            // If both already decided (one or both said pass), nothing to release here.
            // Only the "deciding-user-waiting-forever" case needs cleanup.
            await db
                .update(vibeChecks)
                .set({ status: "expired", endedAt: check.endedAt ?? now })
                .where(eq(vibeChecks.id, check.id));
            expiredVibeChecks++;

            if (!bothDecided) {
                const result = await db
                    .update(mutualMatches)
                    .set({ status: "expired", updatedAt: now })
                    .where(
                        and(
                            eq(mutualMatches.legacyMatchId, check.matchId),
                            or(
                                eq(mutualMatches.status, "call_pending"),
                                eq(mutualMatches.status, "mutual"),
                            ),
                        ),
                    )
                    .returning({ id: mutualMatches.id });
                releasedHolds += result.length;
            }
        }

        console.log("[cron/expire-stale-vibe-checks] done", {
            scanned: stale.length,
            expiredVibeChecks,
            releasedHolds,
            cutoff: cutoff.toISOString(),
        });

        return successResponse({
            ok: true,
            scanned: stale.length,
            expiredVibeChecks,
            releasedHolds,
            cutoff: cutoff.toISOString(),
        });
    } catch (error) {
        console.error("[cron/expire-stale-vibe-checks] Error:", error);
        return errorResponse(error);
    }
}
