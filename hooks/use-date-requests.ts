import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export type DateVibe = 'coffee' | 'walk' | 'dinner' | 'hangout';

/** An invite you received from someone else */
export interface DateRequest {
    id: string;
    fromUserId: string;
    toUserId: string;
    vibe: DateVibe;
    message?: string;
    status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
    createdAt: string;
    fromUser: {
        id: string;
        firstName: string;
        age?: number;
        profilePhoto?: string;
        compatibilityScore?: number;
        compatibilityReasons?: string[];
    };
}

/** An invite you sent to someone else */
export interface SentRequest {
    id: string;
    toUserId: string;
    vibe: DateVibe;
    message?: string;
    /** pending = waiting, accepted = they said yes, declined = they said no, expired = timed out */
    status: 'pending' | 'accepted' | 'declined' | 'expired';
    createdAt: string;
    toUser: {
        id: string;
        firstName: string;
        age?: number;
        profilePhoto?: string;
        compatibilityScore?: number;
    };
}

/** A confirmed match — both sides accepted. Now in the date-setup pipeline. */
export interface ConfirmedMatch {
    id: string;
    requestId: string;
    withUser: {
        id: string;
        firstName: string;
        age?: number;
        profilePhoto?: string;
        compatibilityScore?: number;
        compatibilityReasons?: string[];
    };
    vibe: DateVibe;
    /**
     * call_pending   = optional 3-min call not yet done
     * call_done      = call completed, both confirmed interest
     * being_arranged = StrathSpace is setting up the date
     * date_confirmed = date has been scheduled
     */
    arrangementStatus: 'call_pending' | 'call_done' | 'being_arranged' | 'date_confirmed';
    callMatchId?: string;
    createdAt: string;
}

export interface ScheduledDate {
    id: string;
    matchId: string;
    status: 'pending_setup' | 'scheduled' | 'attended' | 'cancelled' | 'expired';
    venueName?: string;
    venueAddress?: string;
    scheduledAt?: string;
    withUser: {
        id: string;
        firstName: string;
        profilePhoto?: string;
    };
}

// ---------------------------------------------------------------------------
// Mock data — replace with real API calls once backend endpoints are live
// ---------------------------------------------------------------------------

// Only ONE incoming invite shown at a time — the app shows the next one after you respond
const MOCK_INCOMING_REQUESTS: DateRequest[] = [
    {
        id: 'req-1',
        fromUserId: 'user-a',
        toUserId: 'me',
        vibe: 'coffee',
        message: "Hey, I'd love to meet you. Your taste in music is incredible.",
        status: 'pending',
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        fromUser: {
            id: 'user-a',
            firstName: 'Amara',
            age: 22,
            profilePhoto: undefined,
            compatibilityScore: 86,
            compatibilityReasons: ['Afrobeats', 'Late-night conversations', 'Startup culture'],
        },
    },
];

const MOCK_SENT_REQUESTS: SentRequest[] = [
    {
        id: 'sent-1',
        toUserId: 'user-b',
        vibe: 'walk',
        message: "Would love to grab a walk and chat.",
        status: 'pending',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
        toUser: {
            id: 'user-b',
            firstName: 'Jordan',
            age: 23,
            profilePhoto: undefined,
            compatibilityScore: 79,
        },
    },
    {
        id: 'sent-2',
        toUserId: 'user-f',
        vibe: 'coffee',
        status: 'declined',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        toUser: {
            id: 'user-f',
            firstName: 'Leila',
            age: 21,
            profilePhoto: undefined,
            compatibilityScore: 72,
        },
    },
];

const MOCK_CONFIRMED_MATCHES: ConfirmedMatch[] = [
    {
        id: 'match-1',
        requestId: 'req-old-1',
        withUser: {
            id: 'user-c',
            firstName: 'Zara',
            age: 21,
            profilePhoto: undefined,
            compatibilityScore: 74,
            compatibilityReasons: ['Fitness goals', 'Spontaneous plans', 'Food adventures'],
        },
        vibe: 'dinner',
        arrangementStatus: 'being_arranged',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    },
];

const MOCK_HISTORY: ScheduledDate[] = [
    {
        id: 'hist-1',
        matchId: 'match-old-1',
        status: 'attended',
        scheduledAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
        withUser: {
            id: 'user-e',
            firstName: 'Nadia',
            profilePhoto: undefined,
        },
    },
    {
        id: 'hist-2',
        matchId: 'match-old-2',
        status: 'cancelled',
        scheduledAt: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
        withUser: {
            id: 'user-g',
            firstName: 'Marcus',
            profilePhoto: undefined,
        },
    },
];

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** Incoming invites — the next one waiting for your response */
export function useIncomingDateRequests() {
    return useQuery({
        queryKey: ['dateRequests', 'incoming'],
        queryFn: async (): Promise<DateRequest[]> => {
            // TODO: replace with real API call
            // const token = await getAuthToken();
            // const res = await fetch(`${API_URL}/api/date-requests/incoming`, { headers: { Authorization: `Bearer ${token}` } });
            // return res.json();
            await new Promise((r) => setTimeout(r, 400));
            return MOCK_INCOMING_REQUESTS;
        },
        staleTime: 30_000,
    });
}

/** Invites you sent — with their current status */
export function useSentDateRequests() {
    return useQuery({
        queryKey: ['dateRequests', 'sent'],
        queryFn: async (): Promise<SentRequest[]> => {
            // TODO: replace with real API call
            // const res = await fetch(`${API_URL}/api/date-requests/sent`, { headers: { Authorization: `Bearer ${token}` } });
            await new Promise((r) => setTimeout(r, 400));
            return MOCK_SENT_REQUESTS;
        },
        staleTime: 30_000,
    });
}

/** Confirmed matches — both accepted, now in the arrangement pipeline */
export function useConfirmedMatches() {
    return useQuery({
        queryKey: ['dateMatches', 'confirmed'],
        queryFn: async (): Promise<ConfirmedMatch[]> => {
            // TODO: replace with real API call
            await new Promise((r) => setTimeout(r, 400));
            return MOCK_CONFIRMED_MATCHES;
        },
        staleTime: 30_000,
    });
}

/** History — completed, cancelled, or expired dates */
export function useDateHistory() {
    return useQuery({
        queryKey: ['dates', 'history'],
        queryFn: async (): Promise<ScheduledDate[]> => {
            // TODO: replace with real API call
            await new Promise((r) => setTimeout(r, 400));
            return MOCK_HISTORY;
        },
        staleTime: 60_000,
    });
}

// Keep these for backwards compatibility with existing components
export function useUpcomingDates() {
    return useConfirmedMatches().data
        ? { data: [] as ScheduledDate[], isLoading: false, refetch: async () => {} }
        : { data: [] as ScheduledDate[], isLoading: false, refetch: async () => {} };
}

export function usePastDates() {
    return useDateHistory();
}

export function useCreateDateRequest() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: { toUserId: string; vibe: DateVibe; message?: string }) => {
            // TODO: replace with real API call
            await new Promise((r) => setTimeout(r, 600));
            return { id: `req-${Date.now()}`, ...payload, status: 'pending' };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dateRequests'] });
        },
    });
}

export function useRespondToDateRequest() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: { requestId: string; action: 'accept' | 'decline' }) => {
            // TODO: replace with real API call
            await new Promise((r) => setTimeout(r, 500));
            return { success: true };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dateRequests'] });
            queryClient.invalidateQueries({ queryKey: ['dateMatches'] });
            queryClient.invalidateQueries({ queryKey: ['notificationCounts'] });
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

export const ARRANGEMENT_STATUS_LABELS: Record<ConfirmedMatch['arrangementStatus'], string> = {
    call_pending: 'Take a quick call first',
    call_done: 'Call done — being arranged',
    being_arranged: 'Being arranged by StrathSpace',
    date_confirmed: 'Date confirmed',
};
