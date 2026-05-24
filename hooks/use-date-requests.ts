import { useQuery } from '@tanstack/react-query';
import { getAuthToken } from '@/lib/auth-helpers';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export type DateVibe = 'coffee' | 'walk' | 'dinner' | 'hangout';

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
    arrangementStatus: 'mutual' | 'being_arranged' | 'upcoming' | 'completed' | 'cancelled' | 'expired';
    legacyMatchId?: string;
    legacyDateMatchId?: string;
    venueName?: string;
    venueAddress?: string;
    scheduledAt?: string;
    confirmBy?: string;
    assignedSlot?: 'wednesday' | 'saturday';
    viewerSlotConfirmed?: boolean;
    partnerSlotConfirmed?: boolean;
    needsSlotConfirmation?: boolean;
    confirmWindowOpen?: boolean;
    /** Unread messages the viewer has not yet read in the linked chat thread. */
    unreadMessageCount?: number;
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

const CHAT_UNLOCKED_STATUSES: MutualDate['arrangementStatus'][] = [
    'mutual',
    'being_arranged',
    'upcoming',
    'completed',
];

/** Messaging is available once a chat thread exists and the viewer has confirmed their assigned slot. */
export function isChatUnlocked(match: MutualDate): boolean {
    if (!match.legacyMatchId) return false;
    if (!CHAT_UNLOCKED_STATUSES.includes(match.arrangementStatus)) return false;
    if (match.needsSlotConfirmation && !match.viewerSlotConfirmed) return false;
    return true;
}

export const ARRANGEMENT_STATUS_LABELS: Record<MutualDate['arrangementStatus'], string> = {
    mutual: 'You both said yes',
    being_arranged: 'Confirm your date',
    upcoming: 'Date confirmed',
    completed: 'Completed',
    cancelled: 'Cancelled',
    expired: 'Expired',
};
