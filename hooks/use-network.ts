import { useState, useEffect } from 'react';
import * as Network from 'expo-network';

export interface NetworkState {
    isConnected: boolean;
    isInternetReachable: boolean | null;
    type: Network.NetworkStateType | null;
    isLoading: boolean;
}

export function useNetwork() {
    const [networkState, setNetworkState] = useState<NetworkState>({
        isConnected: true, // Assume connected initially
        isInternetReachable: null,
        type: null,
        isLoading: true,
    });

    useEffect(() => {
        let isMounted = true;

        const checkNetwork = async () => {
            try {
                const state = await Network.getNetworkStateAsync();
                
                if (isMounted) {
                    setNetworkState({
                        isConnected: state.isConnected ?? false,
                        isInternetReachable: state.isInternetReachable ?? null,
                        type: state.type ?? null,
                        isLoading: false,
                    });
                }
            } catch (error) {
                console.error('Error checking network state:', error);
                if (isMounted) {
                    setNetworkState(prev => ({ ...prev, isLoading: false }));
                }
            }
        };

        // Initial check
        checkNetwork();

        // Set up polling interval (every 3 seconds)
        const interval = setInterval(checkNetwork, 3000);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, []);

    const refresh = async () => {
        setNetworkState(prev => ({ ...prev, isLoading: true }));
        try {
            const state = await Network.getNetworkStateAsync();
            setNetworkState({
                isConnected: state.isConnected ?? false,
                isInternetReachable: state.isInternetReachable ?? null,
                type: state.type ?? null,
                isLoading: false,
            });
        } catch (error) {
            console.error('Error refreshing network state:', error);
            setNetworkState(prev => ({ ...prev, isLoading: false }));
        }
    };

    return {
        ...networkState,
        refresh,
    };
}
