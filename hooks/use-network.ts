import { useCallback, useEffect, useRef, useState } from 'react';
import * as Network from 'expo-network';

export interface NetworkState {
    /** Device reports a network interface is available (may still be captive/no-internet). */
    isConnected: boolean;
    /**
     * True when the device has verified it can actually reach the internet.
     * `null` means "we haven't figured it out yet" - treat as optimistic
     * until proven otherwise.
     */
    isInternetReachable: boolean | null;
    type: Network.NetworkStateType | null;
    isLoading: boolean;
    /**
     * Convenience flag for UI. We treat the app as "offline" only when we
     * are CONFIDENT the internet is unreachable — never for the ambiguous
     * "connected but reachability unknown" case, so users aren't flashed an
     * offline screen on cold boot.
     */
    isOffline: boolean;
}

/**
 * Subscribes to real-time network changes using expo-network's event listener,
 * and falls back to a single `getNetworkStateAsync` call to seed initial state.
 * We deliberately do NOT poll every 3 seconds — that caused needless wake-ups
 * and races on slow connections.
 */
export function useNetwork() {
    const [state, setState] = useState<NetworkState>({
        isConnected: true,
        isInternetReachable: null,
        type: null,
        isLoading: true,
        isOffline: false,
    });

    const mounted = useRef(true);

    const applyState = useCallback((next: Pick<NetworkState, 'isConnected' | 'isInternetReachable' | 'type'>) => {
        if (!mounted.current) return;
        // Confident offline: device says not connected, OR it says internet is
        // explicitly unreachable. Unknown reachability (null) is NOT offline.
        const isOffline =
            next.isConnected === false || next.isInternetReachable === false;
        setState({
            ...next,
            isLoading: false,
            isOffline,
        });
    }, []);

    useEffect(() => {
        mounted.current = true;

        Network.getNetworkStateAsync()
            .then((s) => {
                applyState({
                    isConnected: s.isConnected ?? false,
                    isInternetReachable: s.isInternetReachable ?? null,
                    type: s.type ?? null,
                });
            })
            .catch((error) => {
                console.warn('[useNetwork] initial state lookup failed', error);
                if (mounted.current) {
                    setState((prev) => ({ ...prev, isLoading: false }));
                }
            });

        const subscription = Network.addNetworkStateListener((event) => {
            applyState({
                isConnected: event.isConnected ?? false,
                isInternetReachable: event.isInternetReachable ?? null,
                type: event.type ?? null,
            });
        });

        return () => {
            mounted.current = false;
            subscription.remove();
        };
    }, [applyState]);

    const refresh = useCallback(async () => {
        setState((prev) => ({ ...prev, isLoading: true }));
        try {
            const s = await Network.getNetworkStateAsync();
            applyState({
                isConnected: s.isConnected ?? false,
                isInternetReachable: s.isInternetReachable ?? null,
                type: s.type ?? null,
            });
        } catch (error) {
            console.warn('[useNetwork] refresh failed', error);
            if (mounted.current) {
                setState((prev) => ({ ...prev, isLoading: false }));
            }
        }
    }, [applyState]);

    return {
        ...state,
        refresh,
    };
}
