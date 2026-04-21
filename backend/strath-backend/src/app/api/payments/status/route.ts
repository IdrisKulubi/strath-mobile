import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getSessionWithFallback } from "@/lib/auth-helpers";
import { isPaymentsEnabled } from "@/lib/feature-flags";
import {
    getUserCreditBalanceCents,
    loadDateMatchSnapshot,
    type PaymentState,
} from "@/lib/services/payments-service";
import { getExpectedPriceCents } from "@/lib/revenuecat-server";

export const dynamic = "force-dynamic";

/**
 * GET /api/payments/status?dateMatchId=…
 *
 * Returns the authoritative payment snapshot for a specific match, as seen
 * by the requesting user. If `payments_enabled` is OFF or this particular
 * match was created before the flag flipped on, `required=false` and the
 * client skips the paywall entirely.
 *
 * Contract is mirrored by `strath-mobile/lib/services/payments-service.ts`.
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getSessionWithFallback(req);
        if (!session?.user?.id) return errorResponse("Unauthorized", 401);
        const userId = session.user.id;

        const { searchParams } = new URL(req.url);
        const dateMatchId = searchParams.get("dateMatchId");
        if (!dateMatchId) return errorResponse("dateMatchId is required", 400);

        const [paymentsOn, snapshot, creditBalanceCents] = await Promise.all([
            isPaymentsEnabled(),
            loadDateMatchSnapshot(dateMatchId),
            getUserCreditBalanceCents(userId),
        ]);

        if (!snapshot) return errorResponse("Date match not found", 404);
        if (snapshot.userAId !== userId && snapshot.userBId !== userId) {
            return errorResponse("Forbidden", 403);
        }

        const state: PaymentState = snapshot.paymentState;
        const required =
            paymentsOn
            && state !== "not_required"
            && state !== "confirmed"
            && state !== "refunded"
            && state !== "expired";

        const partnerId = snapshot.userAId === userId ? snapshot.userBId : snapshot.userAId;
        const mePaid = !!snapshot.paidByUser[userId];
        const partnerPaid = !!snapshot.paidByUser[partnerId];

        return successResponse({
            required,
            state,
            paymentDueBy: snapshot.paymentDueBy
                ? snapshot.paymentDueBy.toISOString()
                : null,
            mePaid,
            partnerPaid,
            creditBalanceCents,
            amountCents: getExpectedPriceCents(),
            currency: "KES",
        });
    } catch (error) {
        console.error("[api/payments/status] error:", error);
        return errorResponse(error);
    }
}
