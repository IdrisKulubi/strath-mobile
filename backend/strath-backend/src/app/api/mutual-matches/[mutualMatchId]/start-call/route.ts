import { NextRequest } from "next/server";

import { successResponse, errorResponse } from "@/lib/api-response";
import { getSessionWithFallback } from "@/lib/auth-helpers";
import { startCallForMutualMatch } from "@/lib/services/mutual-match-call-service";

export const dynamic = "force-dynamic";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ mutualMatchId: string }> },
) {
    try {
        const session = await getSessionWithFallback(req);
        if (!session?.user?.id) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const { mutualMatchId } = await params;
        if (!mutualMatchId) {
            return errorResponse(new Error("mutualMatchId is required"), 400);
        }

        const result = await startCallForMutualMatch(mutualMatchId, session.user.id);
        return successResponse(result);
    } catch (error) {
        console.error("[mutual-matches/start-call] Error:", error);
        return errorResponse(error);
    }
}
