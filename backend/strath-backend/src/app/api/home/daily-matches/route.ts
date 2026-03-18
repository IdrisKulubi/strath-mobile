import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getSessionWithFallback } from "@/lib/auth-helpers";
import {
    generateCandidatePairsForUser,
    getActiveCandidatePairsForUser,
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

        let matches = await getActiveCandidatePairsForUser(userId);
        console.log("[daily-matches] existing active pairs:", matches.length);

        if (matches.length === 0) {
            console.log("[daily-matches] no existing pairs, generating...");
            matches = await generateCandidatePairsForUser(userId);
            console.log("[daily-matches] after generate:", matches.length);
        }

        return successResponse({ matches });
    } catch (error) {
        console.error("[home/daily-matches] Error:", error);
        return errorResponse(error);
    }
}
