import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAuthToken } from '@/lib/auth-helpers';
import { isVerificationRequiredError, parseApiError } from '@/lib/api-errors';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export interface DailyMatch {
    pairId: string;
    userId: string;
    firstName: string;
    age: number;
    profilePhoto?: string;
    compatibilityScore: number;
    reasons: string[];
    bio?: string;
    interests?: string[];
    personalityTags?: string[];
    course?: string;
    university?: string;
    currentUserDecision: 'pending' | 'open_to_meet' | 'passed';
    status: 'active' | 'mutual' | 'closed' | 'expired';
    expiresAt: string;
    expiresInMs: number;
}

export type MatchHoldStatus =
    | 'mutual'
    | 'call_pending'
    | 'being_arranged'
    | 'upcoming'
    | 'completed_pending_feedback';

export interface MatchHold {
    mutualMatchId: string;
    candidatePairId: string;
    partnerUserId: string;
    partner: {
        firstName: string | null;
        age: number | null;
        profilePhoto: string | null;
        course: string | null;
        university: string | null;
    };
    status: MatchHoldStatus;
    venueName: string | null;
    venueAddress: string | null;
    scheduledAt: string | null;
    dateMatchId: string | null;
    needsFeedback: boolean;
    autoReleaseAt: string | null;
    createdAt: string;
}

export type MatchHoldCancelReason =
    | 'no_longer_interested'
    | 'scheduling_conflict'
    | 'safety_concern'
    | 'other';

export interface DailyMatchesResponse {
    mode: 'matches' | 'hold';
    matches: DailyMatch[];
    /** True when a queued introduction is scheduled for a future UTC day (no timer shown). */
    hasUpcomingQueued?: boolean;
    hold?: MatchHold | null;
}

export function useDailyMatches() {
    const query = useQuery({
        queryKey: ['candidatePairs', 'daily'],
        queryFn: async (): Promise<DailyMatchesResponse> => {
            const token = await getAuthToken();
            if (!token) return { mode: 'matches', matches: [] };
            const res = await fetch(`${API_URL}/api/home/daily-matches`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                throw await parseApiError(res, `Failed to fetch daily matches (${res.status})`);
            }
            const json = await res.json();
            const data = json?.data ?? {};
            return {
                mode: data.mode === 'hold' ? 'hold' : 'matches',
                matches: Array.isArray(data.matches) ? data.matches : [],
                hasUpcomingQueued: Boolean(data.hasUpcomingQueued),
                hold: data.hold ?? null,
            };
        },
        staleTime: 60 * 1000,
        refetchInterval: (query) => {
            const data = query.state.data;
            if (!data) return false;
            if (data.mode === 'hold' && data.hold?.autoReleaseAt) {
                const ms = new Date(data.hold.autoReleaseAt).getTime() - Date.now();
                return ms > 0 ? ms : 1000;
            }
            const matches = data.matches ?? [];
            if (matches.length === 0) return false;
            const now = Date.now();
            const soonestMs = Math.min(...matches.map((m) => new Date(m.expiresAt).getTime()));
            const msUntilExpiry = soonestMs - now;
            if (msUntilExpiry <= 0) return 1000;
            return msUntilExpiry;
        },
    });

    return {
        ...query,
        verificationRequired: isVerificationRequiredError(query.error),
    };
}

export function useCancelMatchHold() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: {
            mutualMatchId: string;
            reason: MatchHoldCancelReason;
            notes?: string | null;
        }) => {
            const token = await getAuthToken();
            if (!token) throw new Error('Not authenticated');
            const res = await fetch(`${API_URL}/api/me/match-hold/cancel`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                throw await parseApiError(res, `Failed to cancel match hold (${res.status})`);
            }
            return payload;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['candidatePairs', 'daily'] });
            queryClient.invalidateQueries({ queryKey: ['mutualDates'] });
            queryClient.invalidateQueries({ queryKey: ['notificationCounts'] });
        },
    });
}

const ALREADY_RESPONDED_MSG = 'You have already responded to this pair';

export function useRespondToDailyPair() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: { pairId: string; decision: 'open_to_meet' | 'passed' }) => {
            const token = await getAuthToken();
            if (!token) throw new Error('Not authenticated');
            const res = await fetch(`${API_URL}/api/pairs/${payload.pairId}/respond`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ decision: payload.decision }),
            });
            if (!res.ok) {
                throw await parseApiError(res, `Failed to respond to pair (${res.status})`);
            }
            return payload;
        },
        onSuccess: ({ pairId, decision }) => {
            if (decision === 'passed') {
                queryClient.setQueryData<DailyMatchesResponse>(['candidatePairs', 'daily'], (prev) =>
                    prev ? { ...prev, matches: prev.matches.filter((m) => m.pairId !== pairId) } : prev
                );
            } else {
                queryClient.setQueryData<DailyMatchesResponse>(['candidatePairs', 'daily'], (prev) =>
                    prev
                        ? {
                              ...prev,
                              matches: prev.matches.map((m) =>
                                  m.pairId === pairId ? { ...m, currentUserDecision: 'open_to_meet' as const } : m
                              ),
                          }
                        : prev
                );
            }
            queryClient.invalidateQueries({ queryKey: ['candidatePairs', 'daily'] });
            queryClient.invalidateQueries({ queryKey: ['mutualDates'] });
            queryClient.invalidateQueries({ queryKey: ['notificationCounts'] });
        },
        onError: (error, { pairId, decision }) => {
            if (
                error?.message?.includes(ALREADY_RESPONDED_MSG) &&
                decision === 'open_to_meet'
            ) {
                queryClient.setQueryData<DailyMatchesResponse>(['candidatePairs', 'daily'], (prev) =>
                    prev
                        ? {
                              ...prev,
                              matches: prev.matches.map((m) =>
                                  m.pairId === pairId ? { ...m, currentUserDecision: 'open_to_meet' as const } : m
                              ),
                          }
                        : prev
                );
            }
        },
    });
}
