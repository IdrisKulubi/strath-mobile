import { eq } from "drizzle-orm";

import db from "@/db/drizzle";
import type { DatePayment } from "@/db/schema";
import { datePayments } from "@/db/schema";
import { getPaymentConfig } from "@/lib/payments/config";
import {
    applyPaidParticipantInTransaction,
    buildPaymentSuccessSnapshot,
    isMutualFinalized,
    runPaidParticipantSideEffects,
} from "@/lib/payments/payment-apply";
import { verifyTransaction } from "@/lib/payments/paystack-client";
import type { PaystackVerifyResult } from "@/lib/payments/types";
import type {
    MarkPaymentPaidResult,
    PaymentVerificationSource,
} from "@/lib/payments/payment-verification-types";

export function validatePaystackVerification(
    payment: DatePayment,
    verified: PaystackVerifyResult,
): { ok: true } | { ok: false; reason: string } {
    const { amountCents, currency } = getPaymentConfig();

    if (verified.status !== "success") {
        return { ok: false, reason: "transaction_not_successful" };
    }

    if (verified.amount !== amountCents) {
        return { ok: false, reason: "amount_mismatch" };
    }

    if (verified.currency.toUpperCase() !== currency.toUpperCase()) {
        return { ok: false, reason: "currency_mismatch" };
    }

    if (verified.reference !== payment.paystackReference) {
        return { ok: false, reason: "reference_mismatch" };
    }

    const metadata = verified.metadata ?? {};
    const metaDateMatchId = String(metadata.dateMatchId ?? metadata.date_match_id ?? "");
    const metaUserId = String(metadata.userId ?? metadata.user_id ?? "");

    if (metaDateMatchId !== payment.dateMatchId || metaUserId !== payment.userId) {
        return { ok: false, reason: "metadata_mismatch" };
    }

    return { ok: true };
}

export async function markPaymentPaid(
    reference: string,
    source: PaymentVerificationSource,
    rawPayload: unknown,
): Promise<MarkPaymentPaidResult> {
    const payment = await db.query.datePayments.findFirst({
        where: eq(datePayments.paystackReference, reference),
    });

    if (!payment) {
        console.warn("[payments] markPaymentPaid: unknown reference", { reference, source });
        return { status: "not_found" };
    }

    if (payment.status === "paid") {
        const snapshot = await buildPaymentSuccessSnapshot({
            dateMatchId: payment.dateMatchId,
            userId: payment.userId,
            alreadyProcessed: true,
            finalized: await isMutualFinalized(payment.dateMatchId),
        });
        return { status: "success", ...snapshot };
    }

    let verified: PaystackVerifyResult;
    try {
        verified = await verifyTransaction(reference);
    } catch (error) {
        console.error("[payments] Paystack verify failed", { reference, source, error });
        return { status: "verification_failed", reason: "paystack_verify_failed" };
    }

    const validation = validatePaystackVerification(payment, verified);
    if (!validation.ok) {
        console.warn("[payments] verification rejected", {
            reference,
            source,
            reason: validation.reason,
        });
        return { status: "verification_failed", reason: validation.reason };
    }

    const verifyPayload = {
        verified,
        clientPayload: rawPayload,
    };

    const now = new Date();
    let applyResult: Awaited<ReturnType<typeof applyPaidParticipantInTransaction>> | null = null;
    let applied = false;

    await db.transaction(async (tx) => {
        const locked = await tx.query.datePayments.findFirst({
            where: eq(datePayments.paystackReference, reference),
        });
        if (!locked) return;
        if (locked.status === "paid") return;

        await tx
            .update(datePayments)
            .set({
                status: "paid",
                paidAt: now,
                paystackTransactionId: String(verified.transactionId),
                ...(source === "verify"
                    ? { rawVerifyPayload: verifyPayload }
                    : { rawWebhookPayload: rawPayload as Record<string, unknown> }),
                updatedAt: now,
            })
            .where(eq(datePayments.id, locked.id));

        applyResult = await applyPaidParticipantInTransaction(tx, {
            dateMatchId: locked.dateMatchId,
            userId: locked.userId,
            now,
        });
        applied = true;
    });

    if (!applied) {
        const fresh = await db.query.datePayments.findFirst({
            where: eq(datePayments.paystackReference, reference),
        });
        if (fresh?.status === "paid") {
            const snapshot = await buildPaymentSuccessSnapshot({
                dateMatchId: payment.dateMatchId,
                userId: payment.userId,
                alreadyProcessed: true,
                finalized: await isMutualFinalized(payment.dateMatchId),
            });
            return { status: "success", ...snapshot };
        }
        return { status: "verification_failed", reason: "persist_failed" };
    }

    const finalized = await runPaidParticipantSideEffects({
        dateMatchId: payment.dateMatchId,
        userId: payment.userId,
        paidCount: applyResult!.paidCount,
        mutualMatchId: applyResult!.mutualMatchId,
    });

    const snapshot = await buildPaymentSuccessSnapshot({
        dateMatchId: payment.dateMatchId,
        userId: payment.userId,
        alreadyProcessed: false,
        finalized,
    });

    return { status: "success", ...snapshot };
}
