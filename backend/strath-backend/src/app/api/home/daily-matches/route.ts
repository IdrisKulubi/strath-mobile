import { NextRequest } from "next/server";

import { successResponse, errorResponse } from "@/lib/api-response";
import { getSessionWithFallback } from "@/lib/auth-helpers";
import { getActiveAdminCuratedCandidatePairsForUser } from "@/lib/services/candidate-pairs-service";
import { getActiveMatchHoldForUser } from "@/lib/services/match-hold-service";
import { getManualMatchmakingCopy, isManualMatchmakingModeEnabled } from "@/lib/services/manual-matchmaking-mode";
import { createMatchExclusionContext, isAdminMatchPreviewUser } from "@/lib/services/match-exclusion-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const session = await getSessionWithFallback(req);
        if (!session?.user?.id) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const userId = session.user.id;
        const sessionUserRole = (session.user as { role?: string }).role ?? null;
        const manualMode = isManualMatchmakingModeEnabled();
        const isAdminPreview = await isAdminMatchPreviewUser(userId, { sessionUserRole });
        const exclusionContext = await createMatchExclusionContext(sessionUserRole);
        console.log("[daily-matches] GET", {
            userId,
            userRole: sessionUserRole,
            manualMode,
            isAdminPreview,
        });

        if (manualMode && isAdminPreview) {
            console.log("[daily-matches] admin match preview bypassing manual matchmaking mode", { userId });
        }

        const hold = await getActiveMatchHoldForUser(userId);
        if (hold) {
            console.log("[daily-matches] hold active", {
                userId,
                status: hold.status,
                mutualMatchId: hold.mutualMatchId,
            });
            return successResponse({
                mode: "hold" as const,
                hold,
                matches: [],
                hasUpcomingQueued: false,
                manualCuration: null,
            });
        }

        const curatedMatches = await getActiveAdminCuratedCandidatePairsForUser(userId, exclusionContext);
        console.log("[daily-matches] curated override lookup", {
            userId,
            curatedCount: curatedMatches.length,
            manualMode,
        });

        if (curatedMatches.length > 0) {
            return successResponse({
                mode: "matches" as const,
                matches: curatedMatches,
                hasUpcomingQueued: false,
                hold: null,
                manualCuration: null,
            });
        }

        return successResponse({
            mode: manualMode && !isAdminPreview ? "manual_curation" as const : "matches" as const,
            matches: [],
            hasUpcomingQueued: false,
            hold: null,
            manualCuration: manualMode && !isAdminPreview ? getManualMatchmakingCopy() : null,
        });
    } catch (error) {
        return errorResponse(error);
    }
}
