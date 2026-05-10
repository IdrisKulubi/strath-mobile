import { NextRequest } from "next/server";

import { successResponse, errorResponse } from "@/lib/api-response";
import { getSessionWithBearerFallback } from "@/lib/security";
import { requireMatchmakingAccess } from "@/lib/services/profile-access";
import { getDailyRecommendations } from "@/lib/services/match-intelligence-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const session = await getSessionWithBearerFallback(req);
        if (!session?.user?.id) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        try {
            await requireMatchmakingAccess(session.user.id);
        } catch (accessError) {
            return errorResponse(accessError, accessError instanceof Error && accessError.message === "Profile not found" ? 404 : 403);
        }

        const recommendations = await getDailyRecommendations(session.user.id);
        return successResponse(recommendations);
    } catch (error) {
        console.error("[recommendations/daily] Error:", error);
        return errorResponse(error);
    }
}
