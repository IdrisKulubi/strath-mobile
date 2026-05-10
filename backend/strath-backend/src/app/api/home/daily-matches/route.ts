import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getSessionWithFallback } from "@/lib/auth-helpers";
import {
    generateCandidatePairsForUser,
    getActiveAdminCuratedCandidatePairsForUser,
    getActiveCandidatePairsForUser,
    getHasUpcomingQueuedForUser,
    promoteDueQueuedPairsForUser,
    DAILY_CANDIDATE_PAIR_LIMIT,
} from "@/lib/services/candidate-pairs-service";
import { runPairExpiration } from "@/lib/services/pair-expiration-service";
import { getActiveMatchHoldForUser } from "@/lib/services/match-hold-service";
import { getManualMatchmakingCopy, isManualMatchmakingModeEnabled } from "@/lib/services/manual-matchmaking-mode";
import { isTemporaryAdminMatchPreviewUser } from "@/lib/services/match-exclusion-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const session = await getSessionWithFallback(req);
        if (!session?.user?.id) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const userId = session.user.id;
        const isAdminPreview = await isTemporaryAdminMatchPreviewUser(userId);
        console.log("[daily-matches] GET", {
            userId,
            userRole: (session.user as { role?: string }).role ?? null,
            manualMode: isManualMatchmakingModeEnabled(),
            isAdminPreview,
        });

        if (isManualMatchmakingModeEnabled() && !isAdminPreview) {
            const curatedMatches = await getActiveAdminCuratedCandidatePairsForUser(userId);
            console.log("[daily-matches] manual mode curated lookup", {
                userId,
                curatedCount: curatedMatches.length,
            });
            if (curatedMatches.length > 0) {
                return successResponse({
                    mode: "matches" as const,
                    matches: curatedMatches,
                    hasUpcomingQueued: false,
                    hold: null,
                });
            }

            console.log("[daily-matches] manual matchmaking mode active", { userId });
            return successResponse({
                mode: "manual_curation" as const,
                matches: [],
                hasUpcomingQueued: false,
                hold: null,
                manualCuration: getManualMatchmakingCopy(),
            });
        } else if (isManualMatchmakingModeEnabled() && isAdminPreview) {
            console.log("[daily-matches] admin preview bypassing manual matchmaking mode", { userId });
        }

        const expiration = await runPairExpiration();
        if (expiration.expiredCount > 0) {
            console.log("[daily-matches] expired", expiration.expiredCount, "pairs for user", userId);
        }

        // Match hold short-circuit: if the user already has an active mutual / arranged date,
        // we pause matching until it resolves (cancelled / completed + feedback / auto-released).
        const hold = await getActiveMatchHoldForUser(userId);
        if (hold) {
            console.log("[daily-matches] HOLD active — returning hold mode", {
                userId,
                status: hold.status,
                mutualMatchId: hold.mutualMatchId,
            });
            return successResponse({
                mode: "hold" as const,
                hold,
                matches: [],
                hasUpcomingQueued: false,
            });
        }

        await promoteDueQueuedPairsForUser(userId);

        let matches = await getActiveCandidatePairsForUser(userId);
        console.log("[daily-matches] active pairs after promotion:", matches.length);

        if (matches.length < DAILY_CANDIDATE_PAIR_LIMIT) {
            console.log("[daily-matches] topping up active pairs...", { userId, activeCount: matches.length });
            matches = await generateCandidatePairsForUser(userId);
            console.log("[daily-matches] after generate:", matches.length, { userId });
            if (matches.length === 0) {
                console.log(
                    "[daily-matches] zero matches after generate — check [candidate-pairs] SKIP or pool logs for",
                    { userId },
                );
            }
        }

        const hasUpcomingQueued = await getHasUpcomingQueuedForUser(userId);

        return successResponse({
            mode: "matches" as const,
            matches,
            hasUpcomingQueued,
            hold: null,
        });
    } catch (error) {
        console.error("[home/daily-matches] Error:", error);
        return errorResponse(error);
    }
}
