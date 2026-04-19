import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAuthToken } from '@/lib/auth-helpers';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export type DateVibe = 'coffee' | 'walk' | 'dinner' | 'hangout';

/**
 * Sub-state of the post-call decision flow. Surfaced for `call_pending` mutuals so the
 * Dates tab can render a "Finish your decision" affordance after the deciding user gets
 * routed back without finalizing.
 */
export type CallStage =
    | 'call_ready'
    | 'decision_pending_me'
    | 'decision_pending_partner'
    | 'decision_pending_both'
    | 'completed';

export interface MutualDate {
    id: string;
    pairId?: string;
    source: 'candidate_pair' | 'legacy_date_match';
    createdAt: string;
    withUser: {
        id: string;
        firstName: string;
        age?: number;
        profilePhoto?: string;
        compatibilityScore?: number;
        compatibilityReasons?: string[];
    };
    arrangementStatus: 'mutual' | 'call_pending' | 'being_arranged' | 'upcoming' | 'completed' | 'cancelled' | 'expired';
    legacyMatchId?: string;
    legacyDateMatchId?: string;
    venueName?: string;
    venueAddress?: string;
    scheduledAt?: string;
    /** Only present for `call_pending` mutuals backed by a vibe check. */
    callStage?: CallStage;
    vibeCheckId?: string;
    myDecision?: 'meet' | 'pass' | null;
    partnerDecision?: 'meet' | 'pass' | null;
    callEndedAt?: string;
}

export interface ScheduledDate {
    id: string;
    matchId?: string;
    status: 'pending_setup' | 'scheduled' | 'attended' | 'cancelled' | 'expired';
    hasFeedback?: boolean;
    venueName?: string;
    venueAddress?: string;
    scheduledAt?: string;
    withUser: {
        id: string;
        firstName: string;
        profilePhoto?: string;
    };
}

export interface StartCallResult {
    mutualMatchId: string;
    matchId: string;
    vibeCheckId: string;
    partnerAvailability: 'online' | 'recently_active' | 'offline';
    notificationSent: boolean;
}

export function useMutualMatches() {
    return useQuery({
        queryKey: ['mutualDates'],
        queryFn: async (): Promise<MutualDate[]> => {
            const token = await getAuthToken();
            if (!token) return [];
            const res = await fetch(`${API_URL}/api/dates/mutual`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error(`Failed to fetch mutual dates (${res.status})`);
            const json = await res.json();
            return json?.data ?? [];
        },
        staleTime: 0,
        refetchOnMount: 'always',
        refetchOnWindowFocus: 'always',
        refetchInterval: 10_000,
    });
}

/** History — completed, cancelled, or expired dates */
export function useDateHistory() {
    return useQuery({
        queryKey: ['dates', 'history'],
        queryFn: async (): Promise<ScheduledDate[]> => {
            const token = await getAuthToken();
            if (!token) return [];
            const res = await fetch(`${API_URL}/api/dates/history`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error(`Failed to fetch date history (${res.status})`);
            const json = await res.json();
            return json?.data ?? [];
        },
        staleTime: 60_000,
    });
}

export function useStartMutualMatchCall() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (mutualMatchId: string): Promise<StartCallResult> => {
            const token = await getAuthToken();
            if (!token) {
                throw new Error('Not authenticated');
            }

            const res = await fetch(`${API_URL}/api/mutual-matches/${mutualMatchId}/start-call`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(json?.error ?? `Failed to start call (${res.status})`);
            }

            return json?.data as StartCallResult;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['mutualDates'] });
            queryClient.invalidateQueries({ queryKey: ['matches'] });
        },
    });
}

export const VIBE_LABELS: Record<DateVibe, string> = {
    coffee: 'Coffee',
    walk: 'Walk',
    dinner: 'Dinner',
    hangout: 'Casual Hangout',
};

export const VIBE_EMOJIS: Record<DateVibe, string> = {
    coffee: '☕',
    walk: '🚶',
    dinner: '🍽️',
    hangout: '🎮',
};

export const ARRANGEMENT_STATUS_LABELS: Record<MutualDate['arrangementStatus'], string> = {
    mutual: 'You both said yes',
    call_pending: 'Waiting for your call',
    being_arranged: "We're arranging this one for you",
    upcoming: 'Date confirmed',
    completed: 'Completed',
    cancelled: 'Cancelled',
    expired: 'Expired',
};
