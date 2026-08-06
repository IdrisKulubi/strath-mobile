import { NextRequest } from "next/server";
import { z } from "zod";

import { errorResponse, successResponse } from "@/lib/api-response";
import { AI_CONSENT_REQUIRED_MESSAGE, hasAiConsent } from "@/lib/ai-consent";
import { getSessionWithBearerFallback } from "@/lib/security";
import { requireMatchmakingAccess } from "@/lib/services/profile-access";
import { searchMatchmakerCandidates } from "@/lib/services/matchmaker-search-service";

export const dynamic = "force-dynamic";

const searchSchema = z.object({
    intent: z.string().trim().min(3).max(500),
    limit: z.number().int().min(1).max(10).default(3),
    excludeUserIds: z.array(z.string().min(1)).max(50).default([]),
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

        if (!(await hasAiConsent(session.user.id))) {
            return errorResponse(AI_CONSENT_REQUIRED_MESSAGE, 403);
        }

        const body = searchSchema.parse(await req.json());
        const result = await searchMatchmakerCandidates({
            viewerUserId: session.user.id,
            intentText: body.intent,
            limit: body.limit,
            excludeUserIds: body.excludeUserIds,
        });

        return successResponse({
            ...result,
            candidates: result.candidates.map(({ matchingEvidence, ...candidate }) => {
                void matchingEvidence;
                return candidate;
            }),
        });
    } catch (error) {
        console.error("[matchmaker/search] Error:", error);
        return errorResponse(error);
    }
}
