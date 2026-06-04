import { paystackRequest } from "@/lib/payments/paystack-api";

export type PaystackRefundData = {
    id: number;
    transaction: {
        id: number;
        reference: string;
    };
    status: string;
};

export async function initiatePaystackRefund(input: {
    transactionId: string;
    amountCents: number;
}): Promise<PaystackRefundData> {
    return paystackRequest<PaystackRefundData>("POST", "/refund", {
        transaction: input.transactionId,
        amount: input.amountCents,
    });
}
