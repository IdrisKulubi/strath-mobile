import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { getAuthToken } from '@/lib/auth-helpers';
import { useProfile } from '@/hooks/use-profile';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.strathspace.com';

async function clearWingmanMemory() {
    const token = await getAuthToken();
    if (!token) return;

    await fetch(`${API_URL}/api/agent/context`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    }).catch(() => null);
}

export function useAiConsent() {
    const queryClient = useQueryClient();
    const { data: profile, isLoading, isUpdating, updateProfileAsync } = useProfile();

    const refreshAiQueries = useCallback(async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['profile'] }),
            queryClient.invalidateQueries({ queryKey: ['wingman'] }),
            queryClient.invalidateQueries({ queryKey: ['wingman-stats'] }),
            queryClient.invalidateQueries({ queryKey: ['wingman-context'] }),
            queryClient.invalidateQueries({ queryKey: ['weekly-drop-current'] }),
            queryClient.invalidateQueries({ queryKey: ['weekly-drop-history'] }),
        ]);
    }, [queryClient]);

    const setAiConsent = useCallback(async (granted: boolean) => {
        await updateProfileAsync({ aiConsentGranted: granted });

        if (!granted) {
            await clearWingmanMemory();
        }

        await refreshAiQueries();
    }, [refreshAiQueries, updateProfileAsync]);

    return {
        hasAiConsent: Boolean(profile?.aiConsentGranted),
        aiConsentUpdatedAt: profile?.aiConsentUpdatedAt ?? null,
        isAiConsentLoading: isLoading,
        isAiConsentUpdating: isUpdating,
        grantAiConsent: () => setAiConsent(true),
        revokeAiConsent: () => setAiConsent(false),
    };
}
