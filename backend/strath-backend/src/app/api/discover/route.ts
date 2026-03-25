import { NextRequest } from "next/server";
import { getRecommendations } from "@/lib/matching";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getProfileAccessState } from "@/lib/services/profile-access";
import { getSessionWithBearerFallback } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const session = await getSessionWithBearerFallback(req);
        if (!session) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        // Pagination & Vibe params
        const { searchParams } = new URL(req.url);
        const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
        const offset = parseInt(searchParams.get("offset") || "0");
        const vibe = searchParams.get("vibe") || "all";

        const accessState = await getProfileAccessState(session.user.id);
        if (!accessState.profile) {
            return errorResponse(new Error("Profile not found"), 404);
        }

        if (!accessState.canAccessMatchmaking) {
            return errorResponse(new Error("Face verification required before using discovery"), 403);
        }

        const recommendations = await getRecommendations(session.user.id, limit, offset, vibe);

        return successResponse({
            profiles: recommendations,
            hasMore: recommendations.length === limit,
            nextOffset: offset + recommendations.length,
        });
    } catch (error) {
        console.error("Discover API error:", error);
        return errorResponse(error);
    }
}

