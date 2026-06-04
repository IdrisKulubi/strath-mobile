import { useQuery } from '@tanstack/react-query';

import { getAuthToken } from '@/lib/auth-helpers';
import { usePaymentsEnabled } from '@/hooks/use-payments-enabled';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export type PaymentStatusData = {
    dateMatchId: string;
    paymentState: string;
    currentUserPaid: boolean;
    otherUserPaid: boolean;
    amount: number;
    currency: string;
    paymentDueBy: string | null;
    creditBalanceCents: number;
    canUseCredit: boolean;
    canChooseRefund: boolean;
    userPaymentStatus: string | null;
};

async function fetchPaymentStatus(dateMatchId: string): Promise<PaymentStatusData> {
    const token = await getAuthToken();
    if (!token) {
        throw new Error('Not authenticated');
    }

    const res = await fetch(
        `${API_URL}/api/payments/status?dateMatchId=${encodeURIComponent(dateMatchId)}`,
        {
            headers: { Authorization: `Bearer ${token}` },
        },
    );

    if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || 'Could not load payment status');
    }

    const json = await res.json();
    return json?.data as PaymentStatusData;
}

export function usePaymentStatus(dateMatchId: string | null | undefined) {
    const { paymentsEnabled } = usePaymentsEnabled();

    return useQuery({
        queryKey: ['paymentStatus', dateMatchId],
        queryFn: () => fetchPaymentStatus(dateMatchId!),
        enabled: Boolean(paymentsEnabled && dateMatchId),
        staleTime: 5_000,
    });
}
