import { and, eq, sql } from "drizzle-orm";

import db from "@/db/drizzle";
import type { DatePayment } from "@/db/schema";
import { dateMatches, datePayments, mutualMatches } from "@/db/schema";
import { getPaymentConfig } from "@/lib/payments/config";
import { verifyTransaction } from "@/lib/payments/paystack-client";
import type { PaystackVerifyResult } from "@/lib/payments/types";
import type {
    MarkPaymentPaidResult,
    PaymentVerificationSource,
} from "@/lib/payments/payment-verification-types";
import { tryFinalizeConfirmedMeetup } from "@/lib/services/meetup-confirmation-service";
import { notifyPartnerAfterSlotConfirm } from "@/lib/services/meetup-push-notifications-service";

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

async function buildSuccessSnapshot(input: {
    dateMatchId: string;
    userId: string;
    alreadyProcessed: boolean;
    finalized: boolean;
}): Promise<Extract<MarkPaymentPaidResult, { status: "success" }>> {
    const dateMatch = await db.query.dateMatches.findFirst({
        where: eq(dateMatches.id, input.dateMatchId),
    });

    let otherUserPaid = false;
    if (dateMatch) {
        const otherUserId =
            dateMatch.userAId === input.userId ? dateMatch.userBId : dateMatch.userAId;
        const otherPayment = await db.query.datePayments.findFirst({
            where: and(
                eq(datePayments.dateMatchId, input.dateMatchId),
                eq(datePayments.userId, otherUserId),
            ),
        });
        otherUserPaid = otherPayment?.status === "paid";
    }

    return {
        status: "success",
        dateMatchId: input.dateMatchId,
        userId: input.userId,
        paymentState: dateMatch?.paymentState ?? "awaiting_payment",
        currentUserPaid: true,
        otherUserPaid,
        finalized: input.finalized,
        alreadyProcessed: input.alreadyProcessed,
    };
}

async function isMutualFinalized(dateMatchId: string): Promise<boolean> {
    const mutual = await db.query.mutualMatches.findFirst({
        where: eq(mutualMatches.legacyDateMatchId, dateMatchId),
    });
    return mutual?.status === "upcoming";
}

async function applyPaidSideEffects(input: {
    dateMatchId: string;
    userId: string;
    paidCount: number;
    mutualMatchId: string | null;
}): Promise<boolean> {
    if (input.mutualMatchId && input.paidCount === 1) {
        await notifyPartnerAfterSlotConfirm(input.mutualMatchId, input.userId);
    }

    if (input.paidCount >= 2 && input.mutualMatchId) {
        const finalize = await tryFinalizeConfirmedMeetup(input.mutualMatchId);
        return finalize.finalized;
    }

    return false;
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
        return buildSuccessSnapshot({
            dateMatchId: payment.dateMatchId,
            userId: payment.userId,
            alreadyProcessed: true,
            finalized: await isMutualFinalized(payment.dateMatchId),
        });
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
    let mutualMatchId: string | null = null;
    let paidCount = 0;
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

        const [countRow] = await tx
            .select({ count: sql<number>`count(*)::int` })
            .from(datePayments)
            .where(
                and(
                    eq(datePayments.dateMatchId, locked.dateMatchId),
                    eq(datePayments.status, "paid"),
                ),
            );
        paidCount = Number(countRow?.count ?? 0);

        const paymentState = paidCount >= 2 ? "both_paid" : "paid_waiting_for_other";

        await tx
            .update(dateMatches)
            .set({
                paidUserCount: paidCount,
                paymentState,
            })
            .where(eq(dateMatches.id, locked.dateMatchId));

        const mutual = await tx.query.mutualMatches.findFirst({
            where: eq(mutualMatches.legacyDateMatchId, locked.dateMatchId),
        });

        if (mutual) {
            mutualMatchId = mutual.id;
            const isUserA = mutual.userAId === locked.userId;
            const slotPatch = isUserA
                ? { userASlotConfirmedAt: now }
                : { userBSlotConfirmedAt: now };

            await tx
                .update(mutualMatches)
                .set({ ...slotPatch, updatedAt: now })
                .where(eq(mutualMatches.id, mutual.id));
        }

        applied = true;
    });

    if (!applied) {
        const fresh = await db.query.datePayments.findFirst({
            where: eq(datePayments.paystackReference, reference),
        });
        if (fresh?.status === "paid") {
            return buildSuccessSnapshot({
                dateMatchId: payment.dateMatchId,
                userId: payment.userId,
                alreadyProcessed: true,
                finalized: await isMutualFinalized(payment.dateMatchId),
            });
        }
        return { status: "verification_failed", reason: "persist_failed" };
    }

    const finalized = await applyPaidSideEffects({
        dateMatchId: payment.dateMatchId,
        userId: payment.userId,
        paidCount,
        mutualMatchId,
    });

    return buildSuccessSnapshot({
        dateMatchId: payment.dateMatchId,
        userId: payment.userId,
        alreadyProcessed: false,
        finalized,
    });
}
