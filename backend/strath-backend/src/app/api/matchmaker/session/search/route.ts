import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { AI_CONSENT_REQUIRED_MESSAGE, hasAiConsent } from "@/lib/ai-consent";
import { getSessionWithBearerFallback } from "@/lib/security";
import { presentNextMatchmakerCandidateForUser } from "@/lib/services/matchmaker-session-service";
import { requireMatchmakingAccess } from "@/lib/services/profile-access";

export const dynamic = "force-dynamic";

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

        const conversation = await presentNextMatchmakerCandidateForUser(session.user.id);
        return successResponse(conversation);
    } catch (error) {
        console.error("[matchmaker/session/search] Error:", error);
        return errorResponse(error);
    }
}
