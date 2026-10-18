import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';

import {
    buildHostedPaymentUrl,
    getPaymentAuthRedirectUrl,
    pollPaymentStatusUntilPaid,
    postConfirmMeetupSlot,
} from '@/lib/payment-api';

export type PayToConfirmInput = {
    mutualMatchId: string;
    dateMatchId: string;
    partnerFirstName: string;
};

export type PayToConfirmResult = {
    outcome: 'confirmed' | 'paid_waiting' | 'finalized' | 'cancelled' | 'unpaid';
    paymentState?: string;
};

async function runPayToConfirmFlow(input: PayToConfirmInput): Promise<PayToConfirmResult> {
    const slotResult = await postConfirmMeetupSlot(input.mutualMatchId);

    if (slotResult.kind === 'confirmed') {
        if (slotResult.finalized) {
            return { outcome: 'finalized' };
        }
        return { outcome: 'confirmed' };
    }

    const checkoutUrl = buildHostedPaymentUrl(slotResult.webPaymentUrl, slotResult.paymentToken);
    const redirectUrl = getPaymentAuthRedirectUrl();

    const browserResult = await WebBrowser.openAuthSessionAsync(checkoutUrl, redirectUrl);

    if (browserResult.type !== 'success') {
        const status = await pollPaymentStatusUntilPaid(input.dateMatchId, {
            maxAttempts: 2,
            intervalMs: 800,
        });
        if (status.currentUserPaid) {
            if (status.paymentState === 'both_paid' || status.otherUserPaid) {
                return {
                    outcome: status.otherUserPaid ? 'finalized' : 'paid_waiting',
                    paymentState: status.paymentState,
                };
            }
            return { outcome: 'paid_waiting', paymentState: status.paymentState };
        }
        return { outcome: 'cancelled' };
    }

    const status = await pollPaymentStatusUntilPaid(input.dateMatchId);

    if (!status.currentUserPaid) {
        return { outcome: 'unpaid', paymentState: status.paymentState };
    }

    if (status.paymentState === 'both_paid' || status.otherUserPaid) {
        await postConfirmMeetupSlot(input.mutualMatchId).catch(() => undefined);
        return {
            outcome: status.otherUserPaid ? 'finalized' : 'paid_waiting',
            paymentState: status.paymentState,
        };
    }

    return { outcome: 'paid_waiting', paymentState: status.paymentState };
}

export function usePayToConfirm() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: runPayToConfirmFlow,
        onSuccess: async (_result, input) => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['paymentStatus', input.dateMatchId] }),
                queryClient.invalidateQueries({ queryKey: ['candidatePairs', 'daily'] }),
                queryClient.invalidateQueries({ queryKey: ['mutualDates'] }),
                queryClient.invalidateQueries({ queryKey: ['publicFeatureFlags'] }),
            ]);
        },
    });
}
