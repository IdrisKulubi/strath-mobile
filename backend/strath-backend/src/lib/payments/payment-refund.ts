import { eq } from "drizzle-orm";

import db from "@/db/drizzle";
import { datePayments } from "@/db/schema";
import { sendRefundCompletedPush } from "@/lib/services/payment-push-notifications-service";

type PaystackRefundWebhookData = {
    transaction?: {
        reference?: string;
        id?: number;
    };
    status?: string;
};

export function extractRefundPaymentLookup(
    payload: PaystackRefundWebhookData,
): { reference?: string; transactionId?: string } {
    return {
        reference: payload.transaction?.reference,
        transactionId:
            payload.transaction?.id !== undefined
                ? String(payload.transaction.id)
                : undefined,
    };
}

export async function markPaymentRefundedFromWebhook(
    payload: PaystackRefundWebhookData,
): Promise<{ updated: boolean; reference?: string }> {
    const { reference, transactionId } = extractRefundPaymentLookup(payload);

    if (!reference && !transactionId) {
        return { updated: false };
    }

    const payment = reference
        ? await db.query.datePayments.findFirst({
              where: eq(datePayments.paystackReference, reference),
          })
        : await db.query.datePayments.findFirst({
              where: eq(datePayments.paystackTransactionId, transactionId!),
          });

    if (!payment) {
        return { updated: false, reference };
    }

    if (payment.status === "refunded") {
        return { updated: true, reference: payment.paystackReference };
    }

    const now = new Date();
    await db
        .update(datePayments)
        .set({
            status: "refunded",
            refundedAt: now,
            updatedAt: now,
        })
        .where(eq(datePayments.id, payment.id));

    await sendRefundCompletedPush({
        userId: payment.userId,
        dateMatchId: payment.dateMatchId,
    }).catch((err) => {
        console.warn("[payments] refund push failed", {
            paymentId: payment.id,
            err,
        });
    });

    return { updated: true, reference: payment.paystackReference };
}

export function logRefundFailed(payload: unknown): void {
    console.warn("[payments] refund.failed webhook", { payload });
}
