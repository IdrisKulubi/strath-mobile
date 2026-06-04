import { NextRequest, NextResponse } from "next/server";

import { markPaymentPaid } from "@/lib/payments/payment-verification";
import { verifyWebhookSignature } from "@/lib/payments/paystack-webhook";

export const dynamic = "force-dynamic";

type PaystackWebhookEvent = {
    event?: string;
    data?: {
        reference?: string;
    };
};

/**
 * POST /api/webhooks/paystack
 *
 * Paystack charge.success → mark payment paid (re-verifies with Paystack API).
 */
export async function POST(req: NextRequest) {
    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    if (!verifyWebhookSignature(rawBody, signature)) {
        console.warn("[payments/webhook] invalid signature");
        return NextResponse.json({ success: false, error: "Invalid signature" }, { status: 401 });
    }

    let payload: PaystackWebhookEvent;
    try {
        payload = JSON.parse(rawBody) as PaystackWebhookEvent;
    } catch {
        return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
    }

    const event = payload.event;

    if (event === "refund.processed" || event === "refund.failed") {
        console.info("[payments/webhook] refund event stub", { event });
        return NextResponse.json({ success: true, received: true });
    }

    if (event !== "charge.success") {
        return NextResponse.json({ success: true, received: true, ignored: true });
    }

    const reference = payload.data?.reference;
    if (!reference) {
        console.warn("[payments/webhook] charge.success without reference");
        return NextResponse.json({ success: true, received: true, ignored: true });
    }

    const result = await markPaymentPaid(reference, "webhook", payload);

    if (result.status === "not_found") {
        console.warn("[payments/webhook] unknown reference", { reference });
    } else if (result.status === "verification_failed") {
        console.warn("[payments/webhook] verification failed", {
            reference,
            reason: result.reason,
        });
    }

    return NextResponse.json({ success: true, received: true });
}
