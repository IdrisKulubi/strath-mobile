import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getSessionWithFallback } from "@/lib/auth-helpers";
import { ensureRescheduleEnabled } from "@/lib/meetup-reschedule/route-helpers";
import { listRescheduleOptionsForMutual } from "@/lib/services/meetup-reschedule-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/me/match-hold/reschedule/options?mutualMatchId=...
 */
export async function GET(req: NextRequest) {
    try {
        const disabled = await ensureRescheduleEnabled();
        if (disabled) return disabled;

        const session = await getSessionWithFallback(req);
        if (!session?.user?.id) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const mutualMatchId = req.nextUrl.searchParams.get("mutualMatchId");
        if (!mutualMatchId) {
            return errorResponse(new Error("mutualMatchId is required"), 400);
        }

        const result = await listRescheduleOptionsForMutual(mutualMatchId, session.user.id);

        if (!result.ok) {
            if (result.reason === "not_found") {
                return errorResponse(new Error("Mutual match not found"), 404);
            }
            if (result.reason === "not_participant") {
                return errorResponse(new Error("You do not belong to this mutual"), 403);
            }
            return errorResponse(new Error("Reschedule is not available"), 404);
        }

        return successResponse({
            options: result.options,
            currentScheduledAt: result.currentScheduledAt,
        });
    } catch (error) {
        console.error("[me/match-hold/reschedule/options] Error:", error);
        return errorResponse(error);
    }
}
