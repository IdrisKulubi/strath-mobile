'use client';

import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import {
    addCustomerInfoListener,
    configureRevenueCat,
    identifyRevenueCatUser,
} from '@/lib/revenuecat';
import { getCurrentUserId } from '@/lib/auth-helpers';

/**
 * Mounts once under the auth provider. Responsible for:
 *
 *   1. Calling `Purchases.configure` exactly once on cold boot.
 *   2. Keeping the RevenueCat app-user-id in sync with the StrathSpace user
 *      id whenever the app comes to foreground (picks up sign-in / sign-out
 *      changes without needing every screen to hand-wire it).
 *   3. Listening for CustomerInfo updates so React Query refetches payment
 *      state the moment a store-side change (refund, receipt validation)
 *      lands while the app is open.
 *
 * Renders nothing.
 */
export function RevenueCatBootstrap() {
    const queryClient = useQueryClient();
    const appState = useRef(AppState.currentState);
    const unsubRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        let cancelled = false;

        const syncIdentity = async () => {
            try {
                const userId = await getCurrentUserId();
                await identifyRevenueCatUser(userId);
            } catch {
                // never block the app on RC identify
            }
        };

        const bootstrap = async () => {
            const ready = await configureRevenueCat();
            if (!ready || cancelled) return;

            await syncIdentity();

            const unsub = await addCustomerInfoListener(() => {
                // Customer info changed (new receipt, refund, restore sync, etc.)
                // Nudge any open payment-status queries to refetch.
                queryClient.invalidateQueries({ queryKey: ['payments'] });
            });
            if (cancelled) {
                unsub();
                return;
            }
            unsubRef.current = unsub;
        };

        bootstrap();

        const subscription = AppState.addEventListener(
            'change',
            (nextState: AppStateStatus) => {
                if (
                    appState.current.match(/inactive|background/) &&
                    nextState === 'active'
                ) {
                    void syncIdentity();
                }
                appState.current = nextState;
            }
        );

        return () => {
            cancelled = true;
            subscription.remove();
            unsubRef.current?.();
            unsubRef.current = null;
        };
    }, [queryClient]);

    return null;
}
