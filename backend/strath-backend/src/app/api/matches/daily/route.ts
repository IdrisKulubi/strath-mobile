import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getSessionWithFallback } from "@/lib/auth-helpers";
import {
    generateCandidatePairsForUser,
    getActiveCandidatePairsForUser,
} from "@/lib/services/candidate-pairs-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/matches/daily
 *
 * Compatibility alias for legacy clients. Reads from candidate_pairs.
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getSessionWithFallback(req);
        if (!session?.user?.id) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        let matches = await getActiveCandidatePairsForUser(session.user.id);
        if (matches.length === 0) {
            matches = await generateCandidatePairsForUser(session.user.id);
        }

        return successResponse({ matches });
    } catch (error) {
        console.error("[matches/daily] Error:", error);
        return errorResponse(error);
    }
}
