/** Pure helpers for payment-gated meetup confirmation (unit-tested without DB). */

export function shouldBlockFinalizeForPayment(input: {
    paymentsEnabled: boolean;
    paymentState: string | null | undefined;
}): boolean {
    if (!input.paymentsEnabled) return false;
    return input.paymentState !== "both_paid";
}

export function shouldRequirePaymentToConfirm(input: {
    paymentsEnabled: boolean;
    userPaymentStatus: string | null | undefined;
}): boolean {
    if (!input.paymentsEnabled) return false;
    return input.userPaymentStatus !== "paid";
}
