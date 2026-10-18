import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getSessionWithFallback } from "@/lib/auth-helpers";
import {
    ensureRescheduleEnabled,
    rescheduleRequestError,
} from "@/lib/meetup-reschedule/route-helpers";
import { getActiveMatchHoldForUser } from "@/lib/services/match-hold-service";
import { requestReschedule } from "@/lib/services/meetup-reschedule-service";
import { meetupRescheduleRequestSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * POST /api/me/match-hold/reschedule/request
 * Body: { mutualMatchId, proposedScheduledAt }
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
        const parsed = meetupRescheduleRequestSchema.parse(json);

        const result = await requestReschedule(
            parsed.mutualMatchId,
            session.user.id,
            parsed.proposedScheduledAt,
        );

        if (!result.ok) {
            return rescheduleRequestError(result.reason);
        }

        const hold = await getActiveMatchHoldForUser(session.user.id);

        return successResponse({
            status: "pending",
            requestId: result.requestId,
            proposedScheduledAt: result.proposedScheduledAt,
            proposedConfirmBy: result.proposedConfirmBy,
            proposedSlot: result.proposedSlot,
            partnerUserId: result.partnerUserId,
            hold,
        });
    } catch (error) {
        console.error("[me/match-hold/reschedule/request] Error:", error);
        return errorResponse(error);
    }
}
