import { NextRequest } from "next/server";
import { z } from "zod";

import { errorResponse, successResponse } from "@/lib/api-response";
import { getSessionWithFallback } from "@/lib/auth-helpers";
import { getPaymentStatusForUser } from "@/lib/payments/payment-status-service";

export const dynamic = "force-dynamic";

const querySchema = z.object({
    dateMatchId: z.string().uuid(),
});

/**
 * GET /api/payments/status?dateMatchId=<id>
 *
 * Poll-friendly read of payment state for the authenticated participant.
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getSessionWithFallback(req);
        if (!session?.user?.id) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const query = querySchema.parse({
            dateMatchId: req.nextUrl.searchParams.get("dateMatchId"),
        });

        const result = await getPaymentStatusForUser(query.dateMatchId, session.user.id);

        if (result.status === "not_found") {
            return errorResponse(new Error("Date match not found"), 404);
        }
        if (result.status === "forbidden") {
            return errorResponse(new Error("You do not belong to this date match"), 403);
        }

        return successResponse({
            dateMatchId: result.dateMatchId,
            paymentState: result.paymentState,
            currentUserPaid: result.currentUserPaid,
            otherUserPaid: result.otherUserPaid,
            amount: result.amount,
            currency: result.currency,
            paymentDueBy: result.paymentDueBy,
            creditBalanceCents: result.creditBalanceCents,
            canUseCredit: result.canUseCredit,
            canChooseRefund: result.canChooseRefund,
            userPaymentStatus: result.userPaymentStatus,
        });
    } catch (error) {
        console.error("[payments/status] Error:", error);
        return errorResponse(error);
    }
}
