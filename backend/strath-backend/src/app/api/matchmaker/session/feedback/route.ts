import { NextRequest } from "next/server";
import { z } from "zod";

import { errorResponse, successResponse } from "@/lib/api-response";
import { AI_CONSENT_REQUIRED_MESSAGE, hasAiConsent } from "@/lib/ai-consent";
import { getSessionWithBearerFallback } from "@/lib/security";
import { matchmakerRouteErrorResponse } from "@/lib/services/matchmaker-route-errors";
import { addMatchmakerConversationFeedback } from "@/lib/services/matchmaker-session-service";
import { requireMatchmakingAccess } from "@/lib/services/profile-access";

export const dynamic = "force-dynamic";

const feedbackSchema = z.object({
    outcome: z.enum(["interested", "passed", "not_this_one", "refinement"]).default("not_this_one"),
    reason: z.string().trim().max(120).optional(),
    candidateUserId: z.string().min(1).optional(),
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

        const body = feedbackSchema.parse(await req.json());
        const conversation = await addMatchmakerConversationFeedback({
            userId: session.user.id,
            outcome: body.outcome,
            reason: body.reason,
            candidateUserId: body.candidateUserId,
        });

        return successResponse(conversation);
    } catch (error) {
        console.error("[matchmaker/session/feedback] Error:", error);
        return matchmakerRouteErrorResponse(error);
    }
}
