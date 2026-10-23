import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getSessionWithFallback } from "@/lib/auth-helpers";
import {
    ensureRescheduleEnabled,
    rescheduleRespondError,
} from "@/lib/meetup-reschedule/route-helpers";
import { getActiveMatchHoldForUser } from "@/lib/services/match-hold-service";
import {
    acceptReschedule,
    declineWithCounter,
} from "@/lib/services/meetup-reschedule-service";
import { meetupRescheduleRespondSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * POST /api/me/match-hold/reschedule/respond
 * Body: { requestId, action: "accept" | "decline", declineReason?, counterScheduledAt? }
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
        const parsed = meetupRescheduleRespondSchema.parse(json);

        if (parsed.action === "accept") {
            const result = await acceptReschedule(parsed.requestId, session.user.id);
            if (!result.ok) {
                return rescheduleRespondError(result.reason);
            }

            const hold = await getActiveMatchHoldForUser(session.user.id);

            return successResponse({
                status: result.status,
                scheduledAt: result.scheduledAt,
                confirmBy: result.confirmBy,
                proposedSlot: result.proposedSlot,
                mutualStatus: result.arrangementStatus,
                finalized: result.finalized,
                hold,
            });
        }

        const result = await declineWithCounter(parsed.requestId, session.user.id, {
            reason: parsed.declineReason,
            counterScheduledAt: parsed.counterScheduledAt,
        });

        if (!result.ok) {
            return rescheduleRespondError(result.reason);
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
        console.error("[me/match-hold/reschedule/respond] Error:", error);
        return errorResponse(error);
    }
}
