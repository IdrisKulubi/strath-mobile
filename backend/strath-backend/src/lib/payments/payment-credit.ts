import { randomUUID } from "node:crypto";

import { and, eq, inArray, sql } from "drizzle-orm";

import db from "@/db/drizzle";
import { dateMatches, datePayments, userCredits } from "@/db/schema";
import {
    applyPaidParticipantInTransaction,
    buildPaymentSuccessSnapshot,
    isMutualFinalized,
    runPaidParticipantSideEffects,
    type ApplyPaidParticipantResult,
} from "@/lib/payments/payment-apply";
import { getPaymentConfig } from "@/lib/payments/config";
import type {
    RefundChoice,
    RefundChoiceResult,
    SpendCreditResult,
} from "@/lib/payments/payment-credit-types";
import { initiatePaystackRefund } from "@/lib/payments/paystack-refund";
import { PaystackApiError } from "@/lib/payments/paystack-api";
import {
    findDateMatchById,
    findUserPaymentForMatch,
} from "@/lib/payments/payment-repository";
import {
    isDateMatchParticipant,
    resolveOtherUserId,
} from "@/lib/payments/payment-status-service";
import { PAYABLE_PAYMENT_STATES } from "@/lib/payments/payment-session-types";
import { isPaymentDueExpired } from "@/lib/payments/payment-expiry";
import { CREDIT_CANCEL_REASON } from "@/lib/payments/payment-cancel";

const CREDIT_GRANT_REASON = "partner_did_not_pay";
const REFUND_ELIGIBLE_CREDIT_REASONS = [CREDIT_GRANT_REASON, CREDIT_CANCEL_REASON] as const;
const CREDIT_SPEND_REASON = "spent_on_date";

export function canUseCreditForMatch(input: {
    paymentState: string;
    paymentDueBy: Date | null | undefined;
    currentUserPaid: boolean;
    creditBalanceCents: number;
    amountCents: number;
}): boolean {
    if (input.currentUserPaid) return false;
    if (isPaymentDueExpired(input.paymentDueBy)) return false;
    if (!PAYABLE_PAYMENT_STATES.includes(input.paymentState as (typeof PAYABLE_PAYMENT_STATES)[number])) {
        return false;
    }
    return input.creditBalanceCents >= input.amountCents;
}

export function canChooseRefundForMatch(input: {
    paymentState: string;
    userPaymentStatus: string | null | undefined;
}): boolean {
    if (input.paymentState !== "expired" && input.paymentState !== "cancelled") {
        return false;
    }
    if (input.userPaymentStatus === "refunded") return false;
    if (input.userPaymentStatus === "refund_requested") return false;
    return input.userPaymentStatus === "credited";
}

export async function getCreditBalanceCents(userId: string): Promise<number> {
    const [row] = await db
        .select({
            balance: sql<number>`coalesce(sum(${userCredits.amountCents}), 0)::int`,
        })
        .from(userCredits)
        .where(and(eq(userCredits.userId, userId), eq(userCredits.status, "active")));

    return Number(row?.balance ?? 0);
}

export async function spendCreditOnDateMatch(
    userId: string,
    dateMatchId: string,
): Promise<SpendCreditResult> {
    const dateMatch = await findDateMatchById(dateMatchId);
    if (!dateMatch) {
        return { status: "not_found" };
    }

    if (!isDateMatchParticipant(dateMatch, userId)) {
        return { status: "forbidden" };
    }

    const existingPayment = await findUserPaymentForMatch(dateMatchId, userId);
    if (existingPayment?.status === "paid") {
        const snapshot = await buildPaymentSuccessSnapshot({
            dateMatchId,
            userId,
            alreadyProcessed: true,
            finalized: await isMutualFinalized(dateMatchId),
        });
        return {
            status: "success",
            ...snapshot,
        };
    }

    const { amountCents, currency } = getPaymentConfig();
    const balance = await getCreditBalanceCents(userId);

    if (isPaymentDueExpired(dateMatch.paymentDueBy)) {
        return {
            status: "conflict",
            code: "payment_expired",
            reason: "The payment window for this date has expired",
        };
    }

    if (!PAYABLE_PAYMENT_STATES.includes(dateMatch.paymentState as (typeof PAYABLE_PAYMENT_STATES)[number])) {
        return {
            status: "conflict",
            code: "not_eligible",
            reason: "Credit cannot be used for this date match",
        };
    }

    if (balance < amountCents) {
        return {
            status: "conflict",
            code: "insufficient_credit",
            reason: "You do not have enough StrathSpace credit for this date",
        };
    }

    const now = new Date();
    const reference = `credit_${randomUUID()}`;

    const applyResult = await db.transaction(async (tx) => {
        const lockedPayment = await tx.query.datePayments.findFirst({
            where: and(eq(datePayments.dateMatchId, dateMatchId), eq(datePayments.userId, userId)),
        });

        if (lockedPayment?.status === "paid") {
            return null;
        }

        await tx.insert(userCredits).values({
            userId,
            amountCents: -amountCents,
            currency,
            reason: CREDIT_SPEND_REASON,
            dateMatchId,
            status: "active",
            createdAt: now,
        });

        if (lockedPayment) {
            await tx
                .update(datePayments)
                .set({
                    provider: "credit",
                    paystackReference: reference,
                    amountCents,
                    currency,
                    status: "paid",
                    paidAt: now,
                    updatedAt: now,
                })
                .where(eq(datePayments.id, lockedPayment.id));
        } else {
            await tx.insert(datePayments).values({
                dateMatchId,
                userId,
                amountCents,
                currency,
                provider: "credit",
                paystackReference: reference,
                status: "paid",
                paidAt: now,
                createdAt: now,
                updatedAt: now,
            });
        }

        return applyPaidParticipantInTransaction(tx, {
            dateMatchId,
            userId,
            now,
        });
    });

    const freshPayment = await findUserPaymentForMatch(dateMatchId, userId);
    if (freshPayment?.status !== "paid") {
        return {
            status: "conflict",
            code: "not_eligible",
            reason: "Could not apply credit to this date",
        };
    }

    if (!applyResult) {
        const snapshot = await buildPaymentSuccessSnapshot({
            dateMatchId,
            userId,
            alreadyProcessed: true,
            finalized: await isMutualFinalized(dateMatchId),
        });
        return { status: "success", ...snapshot };
    }

    const finalized = await runPaidParticipantSideEffects({
        dateMatchId,
        userId,
        paidCount: applyResult.paidCount,
        mutualMatchId: applyResult.mutualMatchId,
    });

    const snapshot = await buildPaymentSuccessSnapshot({
        dateMatchId,
        userId,
        alreadyProcessed: false,
        finalized,
    });

    return { status: "success", ...snapshot };
}

export async function handleRefundChoice(
    userId: string,
    dateMatchId: string,
    choice: RefundChoice,
): Promise<RefundChoiceResult> {
    const dateMatch = await findDateMatchById(dateMatchId);
    if (!dateMatch) {
        return { status: "not_found" };
    }

    if (!isDateMatchParticipant(dateMatch, userId)) {
        return { status: "forbidden" };
    }

    const userPayment = await findUserPaymentForMatch(dateMatchId, userId);
    if (!userPayment) {
        return {
            status: "conflict",
            code: "not_eligible",
            reason: "No payment found for this date",
        };
    }

    if (dateMatch.paymentState !== "expired" && dateMatch.paymentState !== "cancelled") {
        return {
            status: "conflict",
            code: "not_eligible",
            reason: "Refund choice is only available for expired or cancelled dates",
        };
    }

    const otherUserId = resolveOtherUserId(dateMatch, userId);
    if (otherUserId) {
        const otherPayment = await findUserPaymentForMatch(dateMatchId, otherUserId);
        if (otherPayment?.status === "paid") {
            return {
                status: "conflict",
                code: "not_eligible",
                reason: "Refund choice is not available when both users paid",
            };
        }
    }

    if (userPayment.status === "refunded") {
        return {
            status: "success",
            choice,
            paymentStatus: "refunded",
            creditKept: false,
        };
    }

    if (userPayment.status === "refund_requested") {
        return {
            status: "success",
            choice: "refund",
            paymentStatus: "refund_requested",
            creditKept: false,
        };
    }

    if (userPayment.status !== "credited" && userPayment.status !== "paid") {
        return {
            status: "conflict",
            code: "not_eligible",
            reason: "You are not eligible for a refund on this date",
        };
    }

    if (choice === "credit") {
        return {
            status: "success",
            choice: "credit",
            paymentStatus: userPayment.status,
            creditKept: true,
        };
    }

    if (!userPayment.paystackTransactionId) {
        return {
            status: "conflict",
            code: "cannot_refund",
            reason: "This payment cannot be refunded through Paystack",
        };
    }

    const now = new Date();
    const { amountCents } = getPaymentConfig();

    await db.transaction(async (tx) => {
        await tx
            .update(userCredits)
            .set({ status: "expired" })
            .where(
                and(
                    eq(userCredits.userId, userId),
                    eq(userCredits.dateMatchId, dateMatchId),
                    inArray(userCredits.reason, [...REFUND_ELIGIBLE_CREDIT_REASONS]),
                    eq(userCredits.status, "active"),
                ),
            );

        await tx
            .update(datePayments)
            .set({
                status: "refund_requested",
                refundReason: CREDIT_GRANT_REASON,
                updatedAt: now,
            })
            .where(eq(datePayments.id, userPayment.id));
    });

    try {
        await initiatePaystackRefund({
            transactionId: userPayment.paystackTransactionId,
            amountCents: userPayment.amountCents ?? amountCents,
        });
    } catch (error) {
        console.error("[payments] Paystack refund initiation failed", {
            dateMatchId,
            userId,
            error,
        });
        if (error instanceof PaystackApiError) {
            return {
                status: "conflict",
                code: "cannot_refund",
                reason: error.message,
            };
        }
        return {
            status: "conflict",
            code: "cannot_refund",
            reason: "Could not initiate refund. Please try again later.",
        };
    }

    return {
        status: "success",
        choice: "refund",
        paymentStatus: "refund_requested",
        creditKept: false,
    };
}
