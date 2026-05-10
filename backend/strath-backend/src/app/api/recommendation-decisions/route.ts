import { NextRequest } from "next/server";
import { z } from "zod";

import { successResponse, errorResponse } from "@/lib/api-response";
import { getSessionWithBearerFallback } from "@/lib/security";
import { handleRecommendationDecision } from "@/lib/services/match-intelligence-service";
import { requireMatchmakingAccess } from "@/lib/services/profile-access";

export const dynamic = "force-dynamic";

const decisionSchema = z.object({
    candidateUserId: z.string().min(1),
    decision: z.enum(["open_to_meet", "maybe", "passed"]),
    source: z.enum(["daily_recommendations", "browse", "admin_curated", "available_now"]).default("browse"),
    matchType: z.enum(["similarity", "complementary", "discovery", "high_activity", "admin_curated"]).optional(),
});

export async function POST(req: NextRequest) {
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

        const body = decisionSchema.parse(await req.json());
        const result = await handleRecommendationDecision({
            viewerUserId: session.user.id,
            ...body,
        });

        return successResponse(result);
    } catch (error) {
        console.error("[recommendation-decisions] Error:", error);
        return errorResponse(error);
    }
}
