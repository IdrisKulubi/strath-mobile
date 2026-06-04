import { eq } from "drizzle-orm";

import db from "@/db/drizzle";
import { datePayments } from "@/db/schema";
import { getPaymentConfig } from "@/lib/payments/config";
import { initiatePaystackRefund } from "@/lib/payments/paystack-refund";
import { PaystackApiError } from "@/lib/payments/paystack-api";

export type AdminRefundResult =
    | { ok: true; paymentId: string; reference: string }
    | { ok: false; reason: string };

/**
 * Marks a paid/credited payment as refund_requested and calls Paystack refund API.
 */
export async function adminRequestRefundForPayment(
    paymentId: string,
    options?: { refundReason?: string },
): Promise<AdminRefundResult> {
    const payment = await db.query.datePayments.findFirst({
        where: eq(datePayments.id, paymentId),
    });

    if (!payment) {
        return { ok: false, reason: "Payment not found" };
    }

    if (payment.status === "refunded") {
        return { ok: true, paymentId: payment.id, reference: payment.paystackReference };
    }

    if (payment.status === "refund_requested") {
        return { ok: true, paymentId: payment.id, reference: payment.paystackReference };
    }

    if (payment.status !== "paid" && payment.status !== "credited") {
        return {
            ok: false,
            reason: `Cannot refund payment in status "${payment.status}"`,
        };
    }

    if (!payment.paystackTransactionId) {
        return { ok: false, reason: "No Paystack transaction id on this payment" };
    }

    const now = new Date();
    const { amountCents } = getPaymentConfig();
    const refundReason = options?.refundReason ?? "admin_refund";

    await db
        .update(datePayments)
        .set({
            status: "refund_requested",
            refundReason,
            updatedAt: now,
        })
        .where(eq(datePayments.id, payment.id));

    try {
        await initiatePaystackRefund({
            transactionId: payment.paystackTransactionId,
            amountCents: payment.amountCents ?? amountCents,
        });
    } catch (error) {
        await db
            .update(datePayments)
            .set({
                status: payment.status,
                refundReason: payment.refundReason,
                updatedAt: now,
            })
            .where(eq(datePayments.id, payment.id));

        if (error instanceof PaystackApiError) {
            return { ok: false, reason: error.message };
        }
        return { ok: false, reason: "Paystack refund could not be initiated" };
    }

    return { ok: true, paymentId: payment.id, reference: payment.paystackReference };
}
