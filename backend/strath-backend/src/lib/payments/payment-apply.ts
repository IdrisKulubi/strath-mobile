import { and, eq, sql } from "drizzle-orm";

import db from "@/db/drizzle";
import { dateMatches, datePayments, mutualMatches } from "@/db/schema";
import {
    countParticipantsWithReservedOrPaid,
    grantConfirmationPack,
    reserveConfirmationForMatch,
} from "@/lib/payments/confirmation-balance";
import { getPaymentsEnabled } from "@/lib/payments/payment-flags";
import type { DateMatchPaymentState } from "@/lib/payments/payment-session-types";
import { tryFinalizeConfirmedMeetup } from "@/lib/services/meetup-confirmation-service";
import { notifyPartnerAfterSlotConfirm } from "@/lib/services/meetup-push-notifications-service";
import {
    sendPaymentBothPaidPushes,
    sendPaymentPartnerPaidPush,
} from "@/lib/services/payment-push-notifications-service";

export type PaymentApplyTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type ApplyPaidParticipantResult = {
    paidCount: number;
    mutualMatchId: string | null;
    paymentState: DateMatchPaymentState;
};

/** Assumes the payment row is already `paid` within the transaction when paymentId is set. */
export async function applyPaidParticipantInTransaction(
    tx: PaymentApplyTx,
    input: {
        dateMatchId: string;
        userId: string;
        now: Date;
        paymentId?: string;
    },
): Promise<ApplyPaidParticipantResult> {
    const mutual = await tx.query.mutualMatches.findFirst({
        where: eq(mutualMatches.legacyDateMatchId, input.dateMatchId),
    });

    if (input.paymentId) {
        await grantConfirmationPack(tx, {
            userId: input.userId,
            paymentId: input.paymentId,
            now: input.now,
        });
    }

    const reserved = await reserveConfirmationForMatch(tx, input.userId, input.dateMatchId, input.now);
    if (!reserved.reserved && !input.paymentId) {
        throw new Error("insufficient_confirmation_balance");
    }

    let paidCount = 0;
    let paymentState: DateMatchPaymentState = "awaiting_payment";

    if (mutual) {
        paidCount = await countParticipantsWithReservedOrPaid(
            input.dateMatchId,
            mutual.userAId,
            mutual.userBId,
            tx,
        );
        paymentState = paidCount >= 2 ? "both_paid" : paidCount >= 1 ? "paid_waiting_for_other" : "awaiting_payment";
    } else {
        const [countRow] = await tx
            .select({ count: sql<number>`count(*)::int` })
            .from(datePayments)
            .where(
                and(
                    eq(datePayments.dateMatchId, input.dateMatchId),
                    eq(datePayments.status, "paid"),
                ),
            );
        paidCount = Number(countRow?.count ?? 0);
        paymentState = paidCount >= 2 ? "both_paid" : "paid_waiting_for_other";
    }

    await tx
        .update(dateMatches)
        .set({
            paidUserCount: paidCount,
            paymentState,
        })
        .where(eq(dateMatches.id, input.dateMatchId));

    let mutualMatchId: string | null = null;

    if (mutual) {
        mutualMatchId = mutual.id;
        const isUserA = mutual.userAId === input.userId;
        const slotPatch = isUserA
            ? { userASlotConfirmedAt: input.now }
            : { userBSlotConfirmedAt: input.now };

        await tx
            .update(mutualMatches)
            .set({ ...slotPatch, updatedAt: input.now })
            .where(eq(mutualMatches.id, mutual.id));
    }

    return { paidCount, mutualMatchId, paymentState };
}

/** Reserve a confirmation and confirm slot without Paystack (existing pack balance). */
export async function applyBalanceConfirmedParticipantInTransaction(
    tx: PaymentApplyTx,
    input: {
        dateMatchId: string;
        userId: string;
        now: Date;
    },
): Promise<ApplyPaidParticipantResult> {
    return applyPaidParticipantInTransaction(tx, {
        dateMatchId: input.dateMatchId,
        userId: input.userId,
        now: input.now,
    });
}

export async function runPaidParticipantSideEffects(input: {
    dateMatchId: string;
    userId: string;
    paidCount: number;
    mutualMatchId: string | null;
}): Promise<boolean> {
    const paymentsEnabled = await getPaymentsEnabled();

    if (input.paidCount === 1) {
        if (paymentsEnabled) {
            await sendPaymentPartnerPaidPush({
                dateMatchId: input.dateMatchId,
                payingUserId: input.userId,
            });
        } else if (input.mutualMatchId) {
            await notifyPartnerAfterSlotConfirm(input.mutualMatchId, input.userId);
        }
    }

    if (input.paidCount >= 2) {
        if (paymentsEnabled) {
            await sendPaymentBothPaidPushes({ dateMatchId: input.dateMatchId });
        }
        if (input.mutualMatchId) {
            const finalize = await tryFinalizeConfirmedMeetup(input.mutualMatchId);
            return finalize.finalized;
        }
    }

    return false;
}

export async function isMutualFinalized(dateMatchId: string): Promise<boolean> {
    const mutual = await db.query.mutualMatches.findFirst({
        where: eq(mutualMatches.legacyDateMatchId, dateMatchId),
    });
    return mutual?.status === "upcoming";
}

export async function buildPaymentSuccessSnapshot(input: {
    dateMatchId: string;
    userId: string;
    alreadyProcessed: boolean;
    finalized: boolean;
}): Promise<{
    dateMatchId: string;
    userId: string;
    paymentState: string;
    currentUserPaid: true;
    otherUserPaid: boolean;
    finalized: boolean;
    alreadyProcessed: boolean;
}> {
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
        dateMatchId: input.dateMatchId,
        userId: input.userId,
        paymentState: dateMatch?.paymentState ?? "awaiting_payment",
        currentUserPaid: true as const,
        otherUserPaid,
        finalized: input.finalized,
        alreadyProcessed: input.alreadyProcessed,
    };
}
