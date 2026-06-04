import { useMutation, useQueryClient } from '@tanstack/react-query';

import { getAuthToken } from '@/lib/auth-helpers';
import { parseApiError } from '@/lib/api-errors';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export type RefundChoice = 'credit' | 'refund';

async function postPaymentJson(path: string, body: Record<string, unknown>) {
    const token = await getAuthToken();
    if (!token) {
        throw new Error('Not authenticated');
    }

    const res = await fetch(`${API_URL}${path}`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        throw await parseApiError(res, 'Payment request failed');
    }

    const json = await res.json();
    return json?.data ?? {};
}

export function useUsePaymentCredit() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (dateMatchId: string) =>
            postPaymentJson('/api/payments/use-credit', { dateMatchId }),
        onSuccess: async (_data, dateMatchId) => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['paymentStatus', dateMatchId] }),
                queryClient.invalidateQueries({ queryKey: ['candidatePairs', 'daily'] }),
                queryClient.invalidateQueries({ queryKey: ['mutualDates'] }),
            ]);
        },
    });
}

export function useRefundChoice() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: { dateMatchId: string; choice: RefundChoice }) =>
            postPaymentJson('/api/payments/refund-choice', input),
        onSuccess: async (_data, input) => {
            await queryClient.invalidateQueries({
                queryKey: ['paymentStatus', input.dateMatchId],
            });
        },
    });
}
