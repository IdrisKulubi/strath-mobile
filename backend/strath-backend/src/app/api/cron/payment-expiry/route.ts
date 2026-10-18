import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { runPaymentExpirySweep } from "@/lib/payments/payment-expiry";
import { isAuthorizedCronRequest } from "@/lib/security";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/cron/payment-expiry
 *
 * Expires payment-window matches, grants credit when one user paid, bumps low intent.
 */
export async function GET(req: NextRequest) {
    try {
        if (!isAuthorizedCronRequest(req)) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const summary = await runPaymentExpirySweep();

        console.log("[cron/payment-expiry] sweep complete", summary);

        return successResponse({ ok: true, ...summary });
    } catch (error) {
        console.error("[cron/payment-expiry] Error:", error);
        return errorResponse(error);
    }
}
