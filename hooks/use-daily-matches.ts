import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAuthToken } from '@/lib/auth-helpers';

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

export interface DailyMatchesResponse {
    matches: DailyMatch[];
    nextPairsAvailableAt?: string;
}

export function useDailyMatches() {
    return useQuery({
        queryKey: ['candidatePairs', 'daily'],
        queryFn: async (): Promise<DailyMatchesResponse> => {
            const token = await getAuthToken();
            if (!token) return { matches: [] };
            const res = await fetch(`${API_URL}/api/home/daily-matches`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error(`Failed to fetch daily matches (${res.status})`);
            const json = await res.json();
            return {
                matches: json?.data?.matches ?? [],
                nextPairsAvailableAt: json?.data?.nextPairsAvailableAt,
            };
        },
        staleTime: 60 * 1000, // 1 minute — ensures fresh pairs after expiry, pull-to-refresh always refetches
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
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.error ?? `Failed to respond to pair (${res.status})`);
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
