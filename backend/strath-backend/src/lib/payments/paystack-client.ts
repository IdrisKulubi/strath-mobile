import { getPaymentConfig } from "@/lib/payments/config";
import { paystackRequest } from "@/lib/payments/paystack-api";
import type {
    PaystackInitializeData,
    PaystackInitializeResult,
    PaystackVerifyData,
    PaystackVerifyResult,
} from "@/lib/payments/types";

export interface InitializeTransactionInput {
    email: string;
    reference: string;
    callbackUrl: string;
    dateMatchId: string;
    userId: string;
}

export async function initializeTransaction(
    input: InitializeTransactionInput,
): Promise<PaystackInitializeResult> {
    const { amountCents, currency } = getPaymentConfig();

    const data = await paystackRequest<PaystackInitializeData>("POST", "/transaction/initialize", {
        email: input.email,
        amount: amountCents,
        reference: input.reference,
        currency,
        callback_url: input.callbackUrl,
        metadata: {
            dateMatchId: input.dateMatchId,
            userId: input.userId,
            reference: input.reference,
        },
    });

    return {
        authorizationUrl: data.authorization_url,
        reference: data.reference,
        accessCode: data.access_code,
    };
}

export async function verifyTransaction(reference: string): Promise<PaystackVerifyResult> {
    const data = await paystackRequest<PaystackVerifyData>(
        "GET",
        `/transaction/verify/${encodeURIComponent(reference)}`,
    );

    return {
        status: data.status,
        amount: data.amount,
        currency: data.currency,
        reference: data.reference,
        transactionId: data.id,
        metadata: data.metadata,
    };
}
