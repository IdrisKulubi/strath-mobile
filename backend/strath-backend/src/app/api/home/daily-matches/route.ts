import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getSessionWithFallback } from "@/lib/auth-helpers";
import {
    generateCandidatePairsForUser,
    getActiveCandidatePairsForUser,
    getHasUpcomingQueuedForUser,
    promoteDueQueuedPairsForUser,
} from "@/lib/services/candidate-pairs-service";
import { runPairExpiration } from "@/lib/services/pair-expiration-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const session = await getSessionWithFallback(req);
        if (!session?.user?.id) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const userId = session.user.id;
        console.log("[daily-matches] GET", { userId });

        // Expire pairs first so we don't return stale/expired pairs
        const expiration = await runPairExpiration();
        if (expiration.expiredCount > 0) {
            console.log("[daily-matches] expired", expiration.expiredCount, "pairs for user", userId);
        }

        await promoteDueQueuedPairsForUser(userId);

        let matches = await getActiveCandidatePairsForUser(userId);
        console.log("[daily-matches] active pairs after promotion:", matches.length);

        if (matches.length === 0) {
            console.log("[daily-matches] no active pairs, generating...", { userId });
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

        return successResponse({ matches, hasUpcomingQueued });
    } catch (error) {
        console.error("[home/daily-matches] Error:", error);
        return errorResponse(error);
    }
}
