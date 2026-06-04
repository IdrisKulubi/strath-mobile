import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse, successResponse } from "@/lib/api-response";
import { getSessionWithFallback } from "@/lib/auth-helpers";
import { PaystackApiError } from "@/lib/payments";
import { createPaymentSession } from "@/lib/payments/payment-session-service";
import type { PaymentSessionConflictCode } from "@/lib/payments/payment-session-types";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
    dateMatchId: z.string().uuid(),
});

const CONFLICT_STATUS: Record<PaymentSessionConflictCode, number> = {
    payments_disabled: 409,
    not_payable: 409,
    payment_expired: 409,
    already_paid: 409,
};

/**
 * POST /api/payments/create-session
 * Body: { dateMatchId }
 *
 * Creates or reuses a pending date_payments row and returns a Paystack checkout URL.
 * Query (dev only): ?force=1 — treat not_required matches as payable for local testing.
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getSessionWithFallback(req);
        if (!session?.user?.id) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const body = bodySchema.parse(await req.json());
        const devForcePayability =
            process.env.NODE_ENV === "development"
            && req.nextUrl.searchParams.get("force") === "1";

        const result = await createPaymentSession({
            dateMatchId: body.dateMatchId,
            userId: session.user.id,
            devForcePayability,
        });

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
            authorizationUrl: result.authorizationUrl,
            reference: result.reference,
        });
    } catch (error) {
        if (error instanceof PaystackApiError) {
            console.error("[payments/create-session] Paystack error:", error.message);
            return errorResponse(new Error("Could not start payment. Please try again."), 502);
        }
        console.error("[payments/create-session] Error:", error);
        return errorResponse(error);
    }
}
