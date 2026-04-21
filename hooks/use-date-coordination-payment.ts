import { Platform } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
    PaywallCancelledError,
    PurchaseFailedError,
    RevenueCatUnavailableError,
    fetchDateCoordinationPackage,
    purchaseDateCoordination,
} from '@/lib/revenuecat';
import {
    PaymentsService,
    type PaymentStatusResponse,
} from '@/lib/services/payments-service';

/**
 * Orchestrates the full pay-per-date flow for a single `dateMatchId`:
 *
 *   1. Reads live payment state from the backend (source of truth).
 *   2. Surfaces the displayed price from RevenueCat (localised, currency-
 *      aware — ignores what the backend thinks the price is for display).
 *   3. Exposes two mutations — `pay()` (IAP) and `redeemCredit()` — with
 *      matching error shapes so the UI can handle them uniformly.
 *   4. Invalidates all related queries on success so the rest of the app
 *      (pair detail sheet, match card, cron-driven timers) sees the new
 *      state without bespoke cache surgery.
 *
 * Errors are NEVER thrown out of the hook — they're surfaced via
 * `mutation.error` so the UI can react declaratively.
 *
 * Usage:
 *
 *     const {
 *       status,           // PaymentStatusResponse | undefined
 *       displayPrice,     // "KES 200.00" — from the store
 *       isLoading,
 *       pay,              // () => void — kicks off the IAP sheet
 *       isPaying,
 *       redeemCredit,
 *       isRedeeming,
 *       error,            // Error | null
 *     } = useDateCoordinationPayment(dateMatchId);
 */

interface UseDateCoordinationPaymentOptions {
    enabled?: boolean;
    onPaid?: (state: PaymentStatusResponse['state']) => void;
}

const STATUS_QUERY_KEY = (dateMatchId: string) =>
    ['payments', 'status', dateMatchId] as const;

const PACKAGE_QUERY_KEY = ['payments', 'rc', 'package'] as const;

export function useDateCoordinationPayment(
    dateMatchId: string | null | undefined,
    options: UseDateCoordinationPaymentOptions = {}
) {
    const queryClient = useQueryClient();
    const { enabled = true, onPaid } = options;

    const statusQuery = useQuery<PaymentStatusResponse>({
        queryKey: STATUS_QUERY_KEY(dateMatchId ?? ''),
        queryFn: () => PaymentsService.getStatus(dateMatchId as string),
        enabled: enabled && !!dateMatchId,
        staleTime: 15_000,
        refetchOnWindowFocus: true,
    });

    const packageQuery = useQuery({
        queryKey: PACKAGE_QUERY_KEY,
        queryFn: fetchDateCoordinationPackage,
        staleTime: 10 * 60 * 1000,
        enabled: enabled && !!dateMatchId && statusQuery.data?.required !== false,
    });

    const invalidate = () => {
        if (dateMatchId) {
            queryClient.invalidateQueries({ queryKey: STATUS_QUERY_KEY(dateMatchId) });
        }
        queryClient.invalidateQueries({ queryKey: ['daily-matches'] });
        queryClient.invalidateQueries({ queryKey: ['date-matches'] });
    };

    const payMutation = useMutation({
        mutationFn: async () => {
            if (!dateMatchId) throw new Error('Missing dateMatchId');

            const purchase = await purchaseDateCoordination();

            // Backend verification. If this fails the user has been charged
            // but we haven't advanced the date — surface an error and rely on
            // the RevenueCat webhook as a fallback (§8 of payment.md).
            return PaymentsService.confirmPurchase({
                dateMatchId,
                transactionIdentifier: purchase.transactionIdentifier,
                productIdentifier: purchase.productIdentifier,
                purchaseToken: purchase.purchaseToken,
                rcAppUserId: purchase.rcAppUserId,
                platform: Platform.OS === 'android' ? 'android' : 'ios',
                purchaseDate: purchase.purchaseDate,
            });
        },
        onSuccess: (result) => {
            invalidate();
            onPaid?.(result.state);
        },
    });

    const redeemMutation = useMutation({
        mutationFn: async () => {
            if (!dateMatchId) throw new Error('Missing dateMatchId');
            return PaymentsService.useCredit({ dateMatchId });
        },
        onSuccess: (result) => {
            invalidate();
            onPaid?.(result.state);
        },
    });

    const pkg = packageQuery.data ?? null;
    const displayPrice = pkg?.product?.priceString ?? null;
    const amountCents = statusQuery.data?.amountCents ?? 20000;
    const creditBalanceCents = statusQuery.data?.creditBalanceCents ?? 0;
    const canUseCredit = creditBalanceCents >= amountCents;

    const combinedError =
        payMutation.error ??
        redeemMutation.error ??
        packageQuery.error ??
        statusQuery.error ??
        null;

    return {
        status: statusQuery.data ?? null,
        displayPrice,
        amountCents,
        creditBalanceCents,
        canUseCredit,
        isLoading: statusQuery.isLoading,
        isPackageLoading: packageQuery.isLoading,
        isPackageAvailable: !!pkg,
        pay: () => payMutation.mutate(),
        isPaying: payMutation.isPending,
        paymentSucceeded: payMutation.isSuccess,
        redeemCredit: () => redeemMutation.mutate(),
        isRedeeming: redeemMutation.isPending,
        redemptionSucceeded: redeemMutation.isSuccess,
        error: combinedError,
        isUserCancelled: payMutation.error instanceof PaywallCancelledError,
        isRevenueCatUnavailable:
            packageQuery.error instanceof RevenueCatUnavailableError ||
            payMutation.error instanceof RevenueCatUnavailableError,
        isPurchaseError: payMutation.error instanceof PurchaseFailedError,
        refresh: () => statusQuery.refetch(),
    };
}
