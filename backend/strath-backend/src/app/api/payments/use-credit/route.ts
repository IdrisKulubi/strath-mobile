import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse, successResponse } from "@/lib/api-response";
import { getSessionWithFallback } from "@/lib/auth-helpers";
import { spendCreditOnDateMatch } from "@/lib/payments/payment-credit";
import type { PaymentCreditConflictCode } from "@/lib/payments/payment-credit-types";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
    dateMatchId: z.string().uuid(),
});

const CONFLICT_STATUS: Record<PaymentCreditConflictCode, number> = {
    already_paid: 409,
    insufficient_credit: 409,
    not_eligible: 409,
    payment_expired: 409,
    not_found: 404,
    forbidden: 403,
    cannot_refund: 409,
};

/**
 * POST /api/payments/use-credit
 * Body: { dateMatchId }
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getSessionWithFallback(req);
        if (!session?.user?.id) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const body = bodySchema.parse(await req.json());
        const result = await spendCreditOnDateMatch(session.user.id, body.dateMatchId);

        if (result.status === "not_found") {
            return errorResponse(new Error("Date match not found"), 404);
        }
        if (result.status === "forbidden") {
            return errorResponse(new Error("You do not belong to this date match"), 403);
        }
        if (result.status === "conflict") {
            return NextResponse.json(
                {
                    success: false,
                    error: result.reason,
                    code: result.code,
                },
                { status: CONFLICT_STATUS[result.code] ?? 409 },
            );
        }

        return successResponse({
            success: true,
            paymentState: result.paymentState,
            currentUserPaid: result.currentUserPaid,
            otherUserPaid: result.otherUserPaid,
            finalized: result.finalized,
            alreadyProcessed: result.alreadyProcessed,
            dateMatchId: result.dateMatchId,
        });
    } catch (error) {
        console.error("[payments/use-credit] Error:", error);
        return errorResponse(error);
    }
}
