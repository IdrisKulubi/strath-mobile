import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { getAuthToken } from '@/lib/auth-helpers';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

interface NotificationCounts {
    unopenedMatches: number;
    unreadMessages: number;
    incomingRequests?: number;
    total: number;
}

/**
 * Fetch notification counts from the API
 */
async function fetchNotificationCounts(): Promise<NotificationCounts> {
    const token = await getAuthToken();

    if (!token) {
        console.log('[NotificationCounts] No token, returning zeros');
        return { unopenedMatches: 0, unreadMessages: 0, total: 0 };
    }

    const response = await fetch(`${API_URL}/api/notifications/counts`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        console.error('[NotificationCounts] Error:', response.status);
        return { unopenedMatches: 0, unreadMessages: 0, total: 0 };
    }

    const result = await response.json();
    const data = result.data || { unopenedMatches: 0, unreadMessages: 0, incomingRequests: 0, total: 0 };
    console.log('[NotificationCounts] Fetched:', data);
    return data;
}

/**
 * Mark a match as opened
 */
async function markMatchAsOpened(matchId: string): Promise<void> {
    console.log('[NotificationCounts] Marking match as opened:', matchId);
    const token = await getAuthToken();

    if (!token) {
        console.log('[NotificationCounts] No token, cannot mark as opened');
        return;
    }

    const response = await fetch(`${API_URL}/api/matches/${matchId}/opened`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    console.log('[NotificationCounts] Mark as opened response:', response.status);
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error('[NotificationCounts] Mark as opened failed:', error);
    }
}

/**
 * Hook for fetching and managing notification counts
 * - Polls every 15 seconds when app is active
 * - Pauses when app is backgrounded
 */
export function useNotificationCounts() {
    const queryClient = useQueryClient();
    const [isAppActive, setIsAppActive] = useState(true);

    // Track app state for smart polling
    useEffect(() => {
        const handleAppStateChange = (nextAppState: AppStateStatus) => {
            setIsAppActive(nextAppState === 'active');
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => subscription?.remove();
    }, []);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['notificationCounts'],
        queryFn: fetchNotificationCounts,
        refetchInterval: isAppActive ? 15000 : false, // Poll every 15s when active
        refetchIntervalInBackground: false,
        staleTime: 10000, // Consider data stale after 10s
        gcTime: 5 * 60 * 1000, // Keep in cache for 5 min
    });

    // Mutation to mark match as opened
    const markMatchOpenedMutation = useMutation({
        mutationFn: markMatchAsOpened,
        onSuccess: () => {
            console.log('[NotificationCounts] Match marked as opened, invalidating counts');
            // Refresh counts after marking as opened
            queryClient.invalidateQueries({ queryKey: ['notificationCounts'] });
        },
        onError: (error) => {
            console.error('[NotificationCounts] Error marking match as opened:', error);
        },
    });

    return {
        unopenedMatches: data?.unopenedMatches ?? 0,
        unreadMessages: data?.unreadMessages ?? 0,
        incomingRequests: data?.incomingRequests ?? 0,
        totalNotifications: data?.total ?? 0,
        isLoading,
        refetch,
        markMatchAsOpened: markMatchOpenedMutation.mutate,
    };
}

/**
 * Format badge count for display
 * Returns undefined if count is 0 (no badge shown)
 * Returns "99+" for counts over 99
 */
export function formatBadgeCount(count: number): string | undefined {
    if (count <= 0) return undefined;
    if (count > 99) return "99+";
    return count.toString();
}
