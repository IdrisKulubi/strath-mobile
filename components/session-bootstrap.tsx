'use client';

import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useRouter } from 'expo-router';

import { setSessionExpiredHandler, apiFetch, isAuthExpiredError, isNetworkError } from '@/lib/api-client';
import { clearSession, getStoredAuth } from '@/lib/auth-helpers';
import { setCachedProfile } from '@/lib/session-cache';
import { useNetwork } from '@/hooks/use-network';
import { useToast } from '@/components/ui/toast';

/**
 * Mounts once under the auth/theme providers. Responsible for:
 *
 *   1. Registering the single global "the server says my session is dead"
 *      handler. This is the ONLY code path in the app that clears auth state
 *      and navigates to /(auth)/login on its own. Screens that get an
 *      AuthExpiredError from apiFetch can just re-throw — the handler has
 *      already cleaned up by the time they see the error.
 *
 *   2. Silently re-validating the cached profile whenever the app comes to
 *      foreground AND the device is online. This keeps the local cache fresh
 *      without ever blocking the UI.
 */
export function SessionBootstrap() {
    const router = useRouter();
    const { isOffline } = useNetwork();
    const toast = useToast();
    const appState = useRef(AppState.currentState);
    const lastRefreshRef = useRef(0);

    useEffect(() => {
        const handleSessionExpired = () => {
            console.log('[SessionBootstrap] Session expired — signing out');
            void (async () => {
                try {
                    await clearSession();
                } finally {
                    try {
                        toast.show({
                            message: 'Your session expired. Please sign in again.',
                            variant: 'warning',
                            position: 'top',
                        });
                    } catch {
                        // toast may be unavailable in some contexts
                    }
                    router.replace('/(auth)/login');
                }
            })();
        };

        setSessionExpiredHandler(handleSessionExpired);
        return () => {
            setSessionExpiredHandler(null);
        };
    }, [router, toast]);

    useEffect(() => {
        const refreshIfPossible = async () => {
            if (isOffline) return;
            // Throttle to once every 30s — no need to hammer /api/user/me on
            // every quick foreground toggle.
            const now = Date.now();
            if (now - lastRefreshRef.current < 30_000) return;
            lastRefreshRef.current = now;

            try {
                const stored = await getStoredAuth();
                if (!stored) return;
                const response = await apiFetch<{ data?: any }>('/api/user/me');
                const profile = response?.data ?? null;
                await setCachedProfile(stored.userId, profile);
            } catch (error) {
                if (isAuthExpiredError(error)) return; // handled centrally
                if (isNetworkError(error)) return;
                console.warn('[SessionBootstrap] background refresh failed:', error);
            }
        };

        const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
            if (appState.current.match(/inactive|background/) && nextState === 'active') {
                void refreshIfPossible();
            }
            appState.current = nextState;
        });

        // Also fire once on mount so a cold start with a cached profile gets
        // refreshed shortly after we enter the app.
        void refreshIfPossible();

        return () => {
            subscription.remove();
        };
    }, [isOffline]);

    return null;
}
