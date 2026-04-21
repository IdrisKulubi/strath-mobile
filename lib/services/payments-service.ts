import { apiFetch } from '@/lib/api-client';

/**
 * Client wrapper for the StrathSpace payments API.
 *
 * Server is the source of truth for "did this user pay for this date" — the
 * mobile app must always confirm a store purchase with the backend before
 * unlocking anything. See `docs/payment.md` §8 for the full contract.
 */

// ─── Shared types ────────────────────────────────────────────────────────────

export type PaymentState =
    | 'not_required'
    | 'awaiting_payment'
    | 'paid_waiting_for_other'
    | 'being_arranged'
    | 'confirmed'
    | 'expired'
    | 'refunded';

export interface PaymentStatusResponse {
    /** Master flag echoed by the server so the client never gates on stale state. */
    required: boolean;
    /** Payment state for this match (per §4.1 of payment.md). */
    state: PaymentState;
    /** ISO timestamp when the payment window expires, if applicable. */
    paymentDueBy: string | null;
    /** Has the current user paid for this date yet? */
    mePaid: boolean;
    /** Has the partner paid? */
    partnerPaid: boolean;
    /** Current user's credit balance in KES cents (used to offer "Use credit" CTA). */
    creditBalanceCents: number;
    /** Amount this purchase costs, in KES cents. Presentational only. */
    amountCents: number;
    /** Currency code — always 'KES' for now, but echoed from server for forward-compat. */
    currency: string;
}

export interface ConfirmPaymentRequest {
    dateMatchId: string;
    /** RevenueCat store transaction id — backend uses this as idempotency key. */
    transactionIdentifier: string;
    productIdentifier: string;
    /** Android-only. Backend cross-checks with Google. */
    purchaseToken?: string | null;
    /** RevenueCat app-user-id the purchase was made under. */
    rcAppUserId: string;
    platform: 'ios' | 'android';
    /** ISO purchase date from the store. Backend tolerates up to 10 min skew. */
    purchaseDate: string;
}

export interface ConfirmPaymentResponse {
    ok: true;
    state: PaymentState;
    partnerPaid: boolean;
}

export interface UseCreditRequest {
    dateMatchId: string;
}

export interface UseCreditResponse {
    ok: true;
    state: PaymentState;
    partnerPaid: boolean;
    creditBalanceCents: number;
}

// ─── API helpers ─────────────────────────────────────────────────────────────

interface ApiEnvelope<T> {
    success?: boolean;
    data?: T;
    error?: string;
}

function unwrap<T>(payload: ApiEnvelope<T> | T): T {
    if (payload && typeof payload === 'object' && 'data' in payload) {
        const envelope = payload as ApiEnvelope<T>;
        if (envelope.data !== undefined) return envelope.data;
    }
    return payload as T;
}

export const PaymentsService = {
    /**
     * Fetch the current payment state for a specific date match.
     * Server returns `{required: false}` when the `payments_enabled` flag is OFF —
     * caller should then skip the paywall entirely.
     */
    async getStatus(dateMatchId: string): Promise<PaymentStatusResponse> {
        const response = await apiFetch<ApiEnvelope<PaymentStatusResponse>>(
            `/api/payments/status?dateMatchId=${encodeURIComponent(dateMatchId)}`
        );
        return unwrap(response);
    },

    /**
     * Confirm a just-completed RevenueCat purchase. Backend verifies against
     * RevenueCat's REST API before writing the `date_payments` row.
     *
     * Safe to retry — idempotent on `transactionIdentifier`.
     */
    async confirmPurchase(request: ConfirmPaymentRequest): Promise<ConfirmPaymentResponse> {
        const response = await apiFetch<ApiEnvelope<ConfirmPaymentResponse>>(
            '/api/payments/confirm',
            {
                method: 'POST',
                body: request,
            }
        );
        return unwrap(response);
    },

    /**
     * Spend an existing StrathSpace credit instead of paying again. Backend
     * enforces balance >= price and writes a matching `date_payments` row with
     * `provider = 'credit'`.
     */
    async useCredit(request: UseCreditRequest): Promise<UseCreditResponse> {
        const response = await apiFetch<ApiEnvelope<UseCreditResponse>>(
            '/api/payments/use-credit',
            {
                method: 'POST',
                body: request,
            }
        );
        return unwrap(response);
    },
};
