import { getPaymentConfig } from "@/lib/payments/config";

export type DateMatchPaymentInsertFields = {
    paymentState: "not_required" | "awaiting_payment";
    paymentDueBy?: Date | null;
    paymentAmountCents?: number;
    paymentCurrency?: string;
};

export function buildDateMatchPaymentInsert(input: {
    confirmBy: Date;
    enabled: boolean;
}): DateMatchPaymentInsertFields {
    if (!input.enabled) {
        return { paymentState: "not_required" };
    }

    const { amountCents, currency } = getPaymentConfig();

    return {
        paymentState: "awaiting_payment",
        paymentDueBy: input.confirmBy,
        paymentAmountCents: amountCents,
        paymentCurrency: currency,
    };
}
