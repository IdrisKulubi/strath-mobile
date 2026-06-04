function shortId(value: string): string {
    return value.replace(/-/g, "").slice(0, 6);
}

/** Unique, traceable Paystack reference for a date setup payment. */
export function buildPaymentReference(dateMatchId: string, userId: string): string {
    return `strath_date_${shortId(dateMatchId)}_${shortId(userId)}_${Date.now().toString(36)}`;
}
