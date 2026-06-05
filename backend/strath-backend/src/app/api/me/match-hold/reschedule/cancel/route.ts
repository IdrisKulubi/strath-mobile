import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getSessionWithFallback } from "@/lib/auth-helpers";
import { ensureRescheduleEnabled } from "@/lib/meetup-reschedule/route-helpers";
import { getActiveMatchHoldForUser } from "@/lib/services/match-hold-service";
import { cancelPendingReschedule } from "@/lib/services/meetup-reschedule-service";
import { meetupRescheduleCancelSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * POST /api/me/match-hold/reschedule/cancel
 * Body: { mutualMatchId }
 */
export async function POST(req: NextRequest) {
    try {
        const disabled = await ensureRescheduleEnabled();
        if (disabled) return disabled;

        const session = await getSessionWithFallback(req);
        if (!session?.user?.id) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const json = await req.json();
        const parsed = meetupRescheduleCancelSchema.parse(json);

        const result = await cancelPendingReschedule(parsed.mutualMatchId, session.user.id);

        if (!result.ok) {
            if (result.reason === "not_found") {
                return errorResponse(new Error("Mutual match not found"), 404);
            }
            if (result.reason === "not_participant") {
                return errorResponse(new Error("You do not belong to this mutual"), 403);
            }
            if (result.reason === "not_requester") {
                return errorResponse(
                    new Error("Only the person who requested the change can cancel it"),
                    403,
                );
            }
            if (result.reason === "not_pending") {
                return errorResponse(new Error("No pending date change request"), 409);
            }
            return errorResponse(new Error("Reschedule is not available"), 404);
        }

        const hold = await getActiveMatchHoldForUser(session.user.id);

        return successResponse({ status: "cancelled", hold });
    } catch (error) {
        console.error("[me/match-hold/reschedule/cancel] Error:", error);
        return errorResponse(error);
    }
}
