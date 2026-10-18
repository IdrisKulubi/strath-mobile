import * as Linking from 'expo-linking';

import { getAuthToken } from '@/lib/auth-helpers';
import { parseApiError } from '@/lib/api-errors';
import type { PaymentStatusData } from '@/hooks/use-payment-status';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export type ConfirmSlotResult =
    | {
          kind: 'confirmed';
          status: string;
          arrangementStatus?: string;
          finalized?: boolean;
      }
    | {
          kind: 'payment_required';
          paymentToken: string;
          webPaymentUrl: string;
      };

export async function fetchPaymentStatus(dateMatchId: string): Promise<PaymentStatusData> {
    const token = await getAuthToken();
    if (!token) {
        throw new Error('Not authenticated');
    }

    const res = await fetch(
        `${API_URL}/api/payments/status?dateMatchId=${encodeURIComponent(dateMatchId)}`,
        { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!res.ok) {
        throw await parseApiError(res, 'Could not load payment status');
    }

    const json = await res.json();
    return json?.data as PaymentStatusData;
}

export async function postConfirmMeetupSlot(mutualMatchId: string): Promise<ConfirmSlotResult> {
    const token = await getAuthToken();
    if (!token) {
        throw new Error('Not authenticated');
    }

    const res = await fetch(`${API_URL}/api/me/match-hold/confirm-slot`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mutualMatchId }),
    });

    const json = await res.json().catch(() => ({}));

    if (res.status === 402 && json?.reason === 'payment_required') {
        const paymentToken = typeof json.paymentToken === 'string' ? json.paymentToken : '';
        const webPaymentUrl = typeof json.webPaymentUrl === 'string' ? json.webPaymentUrl : '';
        if (!paymentToken || !webPaymentUrl) {
            throw new Error('Payment is required but checkout details were missing');
        }
        return { kind: 'payment_required', paymentToken, webPaymentUrl };
    }

    if (!res.ok) {
        throw await parseApiError(res, 'Could not confirm your date');
    }

    const data = json?.data ?? {};
    return {
        kind: 'confirmed',
        status: data.status ?? 'confirmed',
        arrangementStatus: data.arrangementStatus,
        finalized: data.status === 'finalized',
    };
}

export function buildHostedPaymentUrl(webPaymentUrl: string, paymentToken: string): string {
    const base = webPaymentUrl.replace(/\/$/, '');
    const separator = base.includes('?') ? '&' : '?';
    return `${base}${separator}token=${encodeURIComponent(paymentToken)}`;
}

export function getPaymentAuthRedirectUrl(): string {
    return Linking.createURL('payments');
}

export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function pollPaymentStatusUntilPaid(
    dateMatchId: string,
    options?: { maxAttempts?: number; intervalMs?: number },
): Promise<PaymentStatusData> {
    const maxAttempts = options?.maxAttempts ?? 8;
    const intervalMs = options?.intervalMs ?? 1_500;

    let last: PaymentStatusData | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        last = await fetchPaymentStatus(dateMatchId);
        if (last.currentUserPaid || last.paymentState === 'both_paid') {
            return last;
        }
        if (attempt < maxAttempts - 1) {
            await sleep(intervalMs);
        }
    }

    return last ?? fetchPaymentStatus(dateMatchId);
}
