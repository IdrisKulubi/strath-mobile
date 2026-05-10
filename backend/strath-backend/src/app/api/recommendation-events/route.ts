import { NextRequest } from "next/server";
import { z } from "zod";

import { successResponse, errorResponse } from "@/lib/api-response";
import { getSessionWithBearerFallback } from "@/lib/security";
import { recordRecommendationEvent } from "@/lib/services/match-intelligence-service";

export const dynamic = "force-dynamic";

const eventSchema = z.object({
    candidateUserId: z.string().min(1),
    source: z.enum(["daily_recommendations", "browse", "admin_curated", "available_now"]),
    matchType: z.enum(["similarity", "complementary", "discovery", "high_activity", "admin_curated"]).optional(),
    event: z.enum(["shown", "viewed", "ignored"]),
    finalScore: z.number().int().min(0).max(100).optional(),
    compatibilityScore: z.number().int().min(0).max(100).optional(),
    activityScore: z.number().int().min(0).max(100).optional(),
    responseScore: z.number().int().min(0).max(100).optional(),
    diversityScore: z.number().int().min(0).max(100).optional(),
    mutualProbabilityScore: z.number().int().min(0).max(100).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
    try {
        const session = await getSessionWithBearerFallback(req);
        if (!session?.user?.id) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const body = eventSchema.parse(await req.json());
        if (body.candidateUserId === session.user.id) {
            return errorResponse(new Error("Cannot log a recommendation event for your own profile"), 400);
        }

        const event = await recordRecommendationEvent({
            viewerUserId: session.user.id,
            ...body,
        });
        return successResponse({ event });
    } catch (error) {
        console.error("[recommendation-events] Error:", error);
        return errorResponse(error);
    }
}
