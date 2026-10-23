import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { getPaymentCheckoutContext } from "@/lib/payments/payment-checkout-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/payments/checkout?token=<signed_payment_token>
 * Public summary for the hosted payment page (token-gated, no session required).
 */
export async function GET(req: NextRequest) {
    try {
        const token = req.nextUrl.searchParams.get("token")?.trim();
        if (!token) {
            return errorResponse(new Error("token is required"), 400);
        }

        const context = await getPaymentCheckoutContext(token);
        if (context.status === "invalid") {
            return errorResponse(new Error("This payment link is invalid or has expired"), 410);
        }

        return successResponse(context);
    } catch (error) {
        console.error("[payments/checkout] Error:", error);
        return errorResponse(error);
    }
}
