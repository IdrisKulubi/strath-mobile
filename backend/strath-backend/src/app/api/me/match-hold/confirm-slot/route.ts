import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getSessionWithFallback } from "@/lib/auth-helpers";
import { confirmMeetupSlot } from "@/lib/services/meetup-confirmation-service";
import { getActiveMatchHoldForUser } from "@/lib/services/match-hold-service";

export const dynamic = "force-dynamic";

/**
 * POST /api/me/match-hold/confirm-slot
 * Body: { mutualMatchId }
 *
 * Confirms the system-assigned meetup window for the current user.
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getSessionWithFallback(req);
        if (!session?.user?.id) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const json = await req.json();
        const mutualMatchId =
            typeof json?.mutualMatchId === "string" ? json.mutualMatchId : null;
        if (!mutualMatchId) {
            return errorResponse(new Error("mutualMatchId is required"), 400);
        }

        const result = await confirmMeetupSlot(mutualMatchId, session.user.id);

        if (result.status === "not_found") {
            return errorResponse(new Error("Mutual match not found"), 404);
        }
        if (result.status === "forbidden") {
            return errorResponse(new Error("You do not belong to this mutual"), 403);
        }
        if (result.status === "expired") {
            return errorResponse(new Error("This match has expired"), 410);
        }
        if (result.status === "confirm_window_closed") {
            return errorResponse(
                new Error("The confirmation window for this date has closed"),
                409,
            );
        }

        const hold = await getActiveMatchHoldForUser(session.user.id);

        return successResponse({
            status: result.status,
            arrangementStatus: result.arrangementStatus,
            slot: result.slot,
            hold,
        });
    } catch (error) {
        console.error("[me/match-hold/confirm-slot] Error:", error);
        return errorResponse(error);
    }
}
