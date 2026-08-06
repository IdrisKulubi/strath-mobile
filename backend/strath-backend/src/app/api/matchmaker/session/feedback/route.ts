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
    shortlistId: z.string().uuid().optional(),
    reasonCode: z.enum(["lifestyle_mismatch", "relationship_goals", "communication_style", "attraction", "practical_mismatch", "something_else"]).optional(),
    detail: z.string().trim().max(240).optional(),
    learningScope: z.enum(["candidate_only", "future_matches"]).default("candidate_only"),
    confirmLearning: z.boolean().default(false),
    baseVersion: z.number().int().min(0).optional(),
    submissionId: z.string().trim().min(8).max(100).optional(),
}).superRefine((value, context) => {
    if (value.reasonCode && (!value.shortlistId || !value.candidateUserId)) {
        context.addIssue({ code: "custom", message: "Structured feedback requires a shortlist candidate" });
    }
    if (value.learningScope === "future_matches" && (!value.confirmLearning || value.baseVersion === undefined)) {
        context.addIssue({ code: "custom", message: "Future learning requires explicit confirmation against the latest brief" });
    }
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
            shortlistId: body.shortlistId,
            reasonCode: body.reasonCode,
            detail: body.detail,
            learningScope: body.learningScope,
            confirmLearning: body.confirmLearning,
            baseVersion: body.baseVersion,
            submissionId: body.submissionId,
        });

        return successResponse(conversation);
    } catch (error) {
        console.error("[matchmaker/session/feedback] Error:", error);
        return matchmakerRouteErrorResponse(error);
    }
}
