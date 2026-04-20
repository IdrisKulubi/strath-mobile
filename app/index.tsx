import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useEffect, useRef, useState } from 'react';

import { getStoredAuth } from '@/lib/auth-helpers';
import { getCachedProfile, setCachedProfile } from '@/lib/session-cache';
import { apiFetch, isAuthExpiredError, isNetworkError } from '@/lib/api-client';
import { useTheme } from '@/hooks/use-theme';
import { getProfileRoute } from '@/lib/profile-access';

/**
 * Root "/" bootstrap screen.
 *
 * Design:
 *   1. Read the locally-stored auth token + cached profile from SecureStore.
 *      This is synchronous-ish (no network). If we have a token, we are
 *      authenticated — period. The server can disagree later via a 401 with
 *      an explicit auth-failure code, but not before.
 *
 *   2. If no token → go to login.
 *      If token + cached profile → route immediately to the cached landing
 *      (tabs / onboarding / verification). No spinner while offline.
 *      If token but no cached profile → do a single /api/user/me call.
 *         - success  → cache result + route
 *         - network  → default to /(tabs); the app itself will handle empty
 *                      states gracefully instead of dumping to onboarding
 *         - auth err → clear session, route to login
 *
 * We NEVER route to /(auth)/login because of a transient network error. That
 * was the old bug: losing Wi-Fi mid-session booted the user to the login
 * screen even though their token was still valid.
 */
export default function Index() {
    const router = useRouter();
    const { colors } = useTheme();
    const [showSpinner, setShowSpinner] = useState(false);
    const didRouteRef = useRef(false);

    useEffect(() => {
        let cancelled = false;

        const route = (target: Parameters<typeof router.replace>[0]) => {
            if (cancelled || didRouteRef.current) return;
            didRouteRef.current = true;
            router.replace(target);
        };

        const bootstrap = async () => {
            try {
                const stored = await getStoredAuth();

                if (!stored) {
                    route('/(auth)/login');
                    return;
                }

                // We have a token. Decide landing from cached profile if we have one.
                const cached = await getCachedProfile();
                const hasCachedRoute = !!cached && cached.userId === stored.userId;

                if (hasCachedRoute) {
                    // Optimistic route — user is in the app immediately.
                    route(cached!.route as Parameters<typeof router.replace>[0]);

                    // Refresh profile in the background. Failure is harmless.
                    void refreshProfileQuietly(stored.userId);
                    return;
                }

                // No usable cache yet. Do one live /api/user/me call.
                setShowSpinner(true);

                try {
                    const response = await apiFetch<{ data?: any }>('/api/user/me');
                    const profile = response?.data ?? null;
                    const next = getProfileRoute(profile);
                    await setCachedProfile(stored.userId, profile);
                    route(next as Parameters<typeof router.replace>[0]);
                } catch (error) {
                    if (isAuthExpiredError(error)) {
                        // Server says the token is dead — respect it.
                        // api-client already invoked the session-expired handler,
                        // which clears and redirects. Nothing more to do here.
                        return;
                    }
                    if (isNetworkError(error)) {
                        // Offline or server unreachable. Trust the token and
                        // default into the tabs shell. Individual screens will
                        // show their own "try again" states.
                        console.log('[Index] Network error during profile check; entering app optimistically');
                        route('/(tabs)');
                        return;
                    }
                    // Unknown non-auth server error (5xx, 404, etc). Same as
                    // above — keep the user signed in and let the tabs render.
                    console.warn('[Index] Profile check failed:', error);
                    route('/(tabs)');
                }
            } catch (error) {
                console.error('[Index] Bootstrap failed:', error);
                // Defensive: never leave the user on a blank Index screen.
                route('/(auth)/login');
            } finally {
                if (!cancelled) setShowSpinner(false);
            }
        };

        bootstrap();

        return () => {
            cancelled = true;
        };
    }, [router]);

    return (
        <View
            style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: colors.background,
            }}
        >
            {showSpinner ? <ActivityIndicator size="large" color={colors.primary} /> : null}
        </View>
    );
}

async function refreshProfileQuietly(userId: string) {
    try {
        const response = await apiFetch<{ data?: any }>('/api/user/me');
        const profile = response?.data ?? null;
        await setCachedProfile(userId, profile);
    } catch (error) {
        if (isAuthExpiredError(error)) {
            // Handled centrally by api-client's sessionExpiredHandler.
            return;
        }
        // Network / other errors are fine — we already routed optimistically.
    }
}
