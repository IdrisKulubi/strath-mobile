import { verifyPaymentToken } from "@/lib/payments/payment-token";

export type PaymentActorSource = "session" | "token";

export interface PaymentActor {
    userId: string;
    source: PaymentActorSource;
}

/**
 * Resolves who is paying: authenticated session (app) or signed payment token (web checkout).
 */
export function resolvePaymentActor(input: {
    sessionUserId?: string | null;
    paymentToken?: string | null;
    dateMatchId: string;
}): PaymentActor | null {
    if (input.sessionUserId) {
        return { userId: input.sessionUserId, source: "session" };
    }

    if (!input.paymentToken?.trim()) {
        return null;
    }

    const payload = verifyPaymentToken(input.paymentToken.trim());
    if (!payload || payload.dateMatchId !== input.dateMatchId) {
        return null;
    }

    return { userId: payload.userId, source: "token" };
}
