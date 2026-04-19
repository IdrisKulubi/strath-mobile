import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { mutualMatches, profiles, vibeChecks } from "@/db/schema";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getSessionWithFallback } from "@/lib/auth-helpers";
import { bridgeMutualToBeingArranged } from "@/lib/services/mutual-match-service";

export const dynamic = "force-dynamic";

function isAuthorizedInternalRequest(req: NextRequest) {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization") || "";
    const bearer = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
    const xCronSecret = req.headers.get("x-cron-secret");
    return !!cronSecret && (bearer === cronSecret || xCronSecret === cronSecret);
}

/**
 * POST /api/admin/match-hold/reconcile-arranging
 *
 * For every `mutualMatches` row stuck at `call_pending`, look up the linked vibe check.
 * If both users agreed to meet but the previous (broken) decision handler never bridged the
 * pair, run `bridgeMutualToBeingArranged` so the admin "Arranging" page surfaces them.
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

        const stuckRows = await db
            .select()
            .from(mutualMatches)
            .where(eq(mutualMatches.status, "call_pending"));

        const results: {
            mutualMatchId: string;
            action: "bridged" | "skipped" | "no_vibe_check" | "not_both_agreed" | "no_legacy_match";
            dateMatchId?: string;
        }[] = [];

        for (const row of stuckRows) {
            if (!row.legacyMatchId) {
                results.push({ mutualMatchId: row.id, action: "no_legacy_match" });
                continue;
            }

            const check = await db.query.vibeChecks.findFirst({
                where: eq(vibeChecks.matchId, row.legacyMatchId),
            });

            if (!check) {
                results.push({ mutualMatchId: row.id, action: "no_vibe_check" });
                continue;
            }

            if (!check.bothAgreedToMeet) {
                results.push({ mutualMatchId: row.id, action: "not_both_agreed" });
                continue;
            }

            const bridged = await bridgeMutualToBeingArranged({
                user1Id: row.userAId,
                user2Id: row.userBId,
                candidatePairId: row.candidatePairId,
            });

            if (bridged) {
                results.push({
                    mutualMatchId: row.id,
                    action: "bridged",
                    dateMatchId: bridged.dateMatchId,
                });
            } else {
                results.push({ mutualMatchId: row.id, action: "skipped" });
            }
        }

        const bridgedCount = results.filter((r) => r.action === "bridged").length;

        console.log("[admin/match-hold/reconcile-arranging] done", {
            scanned: stuckRows.length,
            bridged: bridgedCount,
        });

        return successResponse({
            scanned: stuckRows.length,
            bridged: bridgedCount,
            results,
        });
    } catch (error) {
        console.error("[admin/match-hold/reconcile-arranging] Error:", error);
        return errorResponse(error);
    }
}
