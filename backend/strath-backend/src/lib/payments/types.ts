export interface PaymentTokenPayload {
    dateMatchId: string;
    userId: string;
    exp: number;
}

export interface PaystackInitializeResult {
    authorizationUrl: string;
    reference: string;
    accessCode: string;
}

export type PaystackTransactionStatus = "success" | "failed" | "abandoned";

export interface PaystackVerifyResult {
    status: PaystackTransactionStatus;
    amount: number;
    currency: string;
    reference: string;
    transactionId: number;
    metadata?: Record<string, unknown>;
}

export interface PaystackApiEnvelope<T> {
    status: boolean;
    message: string;
    data: T;
}

export interface PaystackInitializeData {
    authorization_url: string;
    access_code: string;
    reference: string;
}

export interface PaystackVerifyData {
    status: PaystackTransactionStatus;
    amount: number;
    currency: string;
    reference: string;
    id: number;
    metadata?: Record<string, unknown>;
}
