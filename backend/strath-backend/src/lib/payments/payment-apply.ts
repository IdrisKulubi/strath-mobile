import { and, eq, sql } from "drizzle-orm";

import db from "@/db/drizzle";
import { dateMatches, datePayments, mutualMatches } from "@/db/schema";
import { tryFinalizeConfirmedMeetup } from "@/lib/services/meetup-confirmation-service";
import { notifyPartnerAfterSlotConfirm } from "@/lib/services/meetup-push-notifications-service";

export type PaymentApplyTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type ApplyPaidParticipantResult = {
    paidCount: number;
    mutualMatchId: string | null;
    paymentState: string;
};

/** Assumes the payment row is already `paid` within the transaction. */
export async function applyPaidParticipantInTransaction(
    tx: PaymentApplyTx,
    input: {
        dateMatchId: string;
        userId: string;
        now: Date;
    },
): Promise<ApplyPaidParticipantResult> {
    const [countRow] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(datePayments)
        .where(
            and(
                eq(datePayments.dateMatchId, input.dateMatchId),
                eq(datePayments.status, "paid"),
            ),
        );
    const paidCount = Number(countRow?.count ?? 0);
    const paymentState = paidCount >= 2 ? "both_paid" : "paid_waiting_for_other";

    await tx
        .update(dateMatches)
        .set({
            paidUserCount: paidCount,
            paymentState,
        })
        .where(eq(dateMatches.id, input.dateMatchId));

    let mutualMatchId: string | null = null;

    const mutual = await tx.query.mutualMatches.findFirst({
        where: eq(mutualMatches.legacyDateMatchId, input.dateMatchId),
    });

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

export async function runPaidParticipantSideEffects(input: {
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
    currentUserPaid: boolean;
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
        currentUserPaid: true,
        otherUserPaid,
        finalized: input.finalized,
        alreadyProcessed: input.alreadyProcessed,
    };
}
