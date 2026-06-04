import { NextRequest } from "next/server";
import { z } from "zod";

import { errorResponse, successResponse } from "@/lib/api-response";
import { markPaymentPaid } from "@/lib/payments/payment-verification";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
    reference: z.string().min(8),
});

/**
 * POST /api/payments/verify
 * Body: { reference }
 *
 * Confirms a Paystack payment server-side (callback page + manual retry).
 * Webhook remains the durable source of truth; this path is idempotent.
 */
export async function POST(req: NextRequest) {
    try {
        const body = bodySchema.parse(await req.json());
        const result = await markPaymentPaid(body.reference, "verify", body);

        if (result.status === "not_found") {
            return errorResponse(new Error("Payment reference not found"), 404);
        }

        if (result.status === "verification_failed") {
            return errorResponse(new Error(`Payment verification failed: ${result.reason}`), 422);
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
        console.error("[payments/verify] Error:", error);
        return errorResponse(error);
    }
}
