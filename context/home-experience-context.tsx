import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { fetchPublicFeatureFlags } from '@/hooks/use-payments-enabled';

type HomeExperienceContextValue = {
    isV2Enabled: boolean;
    isLoading: boolean;
};

const HomeExperienceContext = createContext<HomeExperienceContextValue | null>(null);

export function HomeExperienceProvider({ children }: React.PropsWithChildren) {
    const queryClient = useQueryClient();
    const appState = useRef<AppStateStatus>(AppState.currentState);
    const hasAssignment = useRef(false);
    const [isV2Enabled, setIsV2Enabled] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const refreshAssignment = useCallback(async () => {
        try {
            const flags = await fetchPublicFeatureFlags();
            queryClient.setQueryData(['publicFeatureFlags'], flags);
            setIsV2Enabled(Boolean(flags.matchmakerPersonalizationV2));
            hasAssignment.current = true;
        } catch (error) {
            console.warn('[home-experience] Falling back to V1:', error);
            if (!hasAssignment.current) {
                setIsV2Enabled(false);
                hasAssignment.current = true;
            }
        } finally {
            setIsLoading(false);
        }
    }, [queryClient]);

    useEffect(() => {
        void refreshAssignment();

        const subscription = AppState.addEventListener('change', (nextState) => {
            const wasInactive = appState.current === 'background' || appState.current === 'inactive';
            appState.current = nextState;
            if (wasInactive && nextState === 'active') {
                void refreshAssignment();
            }
        });

        return () => subscription.remove();
    }, [refreshAssignment]);

    return (
        <HomeExperienceContext.Provider value={{ isV2Enabled, isLoading }}>
            {children}
        </HomeExperienceContext.Provider>
    );
}

export function useHomeExperience() {
    const value = useContext(HomeExperienceContext);
    if (!value) {
        throw new Error('useHomeExperience must be used inside HomeExperienceProvider');
    }
    return value;
}
