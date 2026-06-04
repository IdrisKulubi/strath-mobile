import type { DatePayment } from "@/db/schema";
import { getPaymentConfig } from "@/lib/payments/config";
import {
    canChooseRefundForMatch,
    canUseCreditForMatch,
    getCreditBalanceCents,
} from "@/lib/payments/payment-credit";
import {
    findDateMatchById,
    findUserPaymentForMatch,
} from "@/lib/payments/payment-repository";
import type { PaymentStatusResult } from "@/lib/payments/payment-status-types";

export function isDateMatchParticipant(
    dateMatch: { userAId: string; userBId: string },
    userId: string,
): boolean {
    return dateMatch.userAId === userId || dateMatch.userBId === userId;
}

export function resolveOtherUserId(
    dateMatch: { userAId: string; userBId: string },
    userId: string,
): string | null {
    if (dateMatch.userAId === userId) return dateMatch.userBId;
    if (dateMatch.userBId === userId) return dateMatch.userAId;
    return null;
}

export function isPaymentRowPaid(payment: DatePayment | null | undefined): boolean {
    return payment?.status === "paid";
}

export async function getPaymentStatusForUser(
    dateMatchId: string,
    userId: string,
): Promise<PaymentStatusResult> {
    const dateMatch = await findDateMatchById(dateMatchId);
    if (!dateMatch) {
        return { status: "not_found" };
    }

    if (!isDateMatchParticipant(dateMatch, userId)) {
        return { status: "forbidden" };
    }

    const otherUserId = resolveOtherUserId(dateMatch, userId);
    if (!otherUserId) {
        return { status: "forbidden" };
    }

    const [currentPayment, otherPayment, creditBalanceCents] = await Promise.all([
        findUserPaymentForMatch(dateMatchId, userId),
        findUserPaymentForMatch(dateMatchId, otherUserId),
        getCreditBalanceCents(userId),
    ]);

    const { amountCents, currency: configCurrency } = getPaymentConfig();
    const amountCentsResolved = dateMatch.paymentAmountCents ?? amountCents;
    const currentUserPaid = isPaymentRowPaid(currentPayment);

    const canUseCredit = canUseCreditForMatch({
        paymentState: dateMatch.paymentState,
        paymentDueBy: dateMatch.paymentDueBy,
        currentUserPaid,
        creditBalanceCents,
        amountCents: amountCentsResolved,
    });

    const canChooseRefund = canChooseRefundForMatch({
        paymentState: dateMatch.paymentState,
        userPaymentStatus: currentPayment?.status ?? null,
    });

    return {
        status: "ok",
        dateMatchId,
        paymentState: dateMatch.paymentState,
        currentUserPaid,
        otherUserPaid: isPaymentRowPaid(otherPayment),
        amount: amountCentsResolved / 100,
        currency: dateMatch.paymentCurrency ?? configCurrency,
        paymentDueBy: dateMatch.paymentDueBy?.toISOString() ?? null,
        creditBalanceCents,
        canUseCredit,
        canChooseRefund,
        userPaymentStatus: currentPayment?.status ?? null,
    };
}
