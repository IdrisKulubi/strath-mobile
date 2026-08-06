import { errorResponse } from "@/lib/api-response";
import { AI_CONSENT_REQUIRED_MESSAGE, hasAiConsent } from "@/lib/ai-consent";
import { APP_FEATURE_KEYS, isFeatureEnabled } from "@/lib/feature-flags";
import { requireMatchmakingAccess } from "@/lib/services/profile-access";

export async function requireMatchmakerBriefAccess(userId: string) {
    try {
        await requireMatchmakingAccess(userId);
    } catch (error) {
        return errorResponse(
            error,
            error instanceof Error && error.message === "Profile not found" ? 404 : 403,
        );
    }

    if (!(await hasAiConsent(userId))) {
        return errorResponse(AI_CONSENT_REQUIRED_MESSAGE, 403);
    }

    if (!(await isFeatureEnabled(APP_FEATURE_KEYS.matchmakerPersonalizationV2, false))) {
        return errorResponse("Matchmaker personalization V2 is not enabled", 404);
    }

    return null;
}
