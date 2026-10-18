/** Pure helpers for payment-gated meetup confirmation (unit-tested without DB). */

export function shouldBlockFinalizeForPayment(input: {
    paymentsEnabled: boolean;
    paymentState: string | null | undefined;
    readyParticipantCount?: number;
}): boolean {
    if (!input.paymentsEnabled) return false;
    if (typeof input.readyParticipantCount === "number") {
        return input.readyParticipantCount < 2;
    }
    return input.paymentState !== "both_paid";
}

export function shouldRequirePaymentToConfirm(input: {
    paymentsEnabled: boolean;
    userPaymentStatus: string | null | undefined;
    hasReserved?: boolean;
    canUseBalance?: boolean;
}): boolean {
    if (!input.paymentsEnabled) return false;
    if (input.userPaymentStatus === "paid") return false;
    if (input.hasReserved) return false;
    if (input.canUseBalance) return false;
    return true;
}
