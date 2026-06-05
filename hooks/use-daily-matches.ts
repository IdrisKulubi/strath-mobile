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
    | 'being_arranged'
    | 'upcoming'
    | 'completed_pending_feedback';

export interface SlotConfirmationState {
    assignedSlot: 'wednesday' | 'saturday' | null;
    scheduledAt: string | null;
    confirmBy: string | null;
    confirmWindowOpen: boolean;
    viewerSlotConfirmed: boolean;
    partnerSlotConfirmed: boolean;
    needsSlotConfirmation: boolean;
}

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
    slotConfirmation: SlotConfirmationState;
}

export type MatchHoldCancelReason =
    | 'no_longer_interested'
    | 'scheduling_conflict'
    | 'safety_concern'
    | 'other';

export interface ManualCuration {
    title: string;
    subtitle: string;
}

export interface DailyMatchesResponse {
    mode: 'matches' | 'hold' | 'manual_curation';
    matches: DailyMatch[];
    /** True when a queued introduction is scheduled for a future UTC day (no timer shown). */
    hasUpcomingQueued?: boolean;
    hold?: MatchHold | null;
    manualCuration?: ManualCuration | null;
}

function normalizeMatchHold(hold: MatchHold & { slotConfirmation?: SlotConfirmationState }): MatchHold {
    const slot = hold.slotConfirmation;
    return {
        ...hold,
        slotConfirmation: {
            assignedSlot: slot?.assignedSlot ?? null,
            scheduledAt: slot?.scheduledAt ?? hold.scheduledAt ?? null,
            confirmBy: slot?.confirmBy ?? null,
            confirmWindowOpen: slot?.confirmWindowOpen ?? false,
            viewerSlotConfirmed: slot?.viewerSlotConfirmed ?? false,
            partnerSlotConfirmed: slot?.partnerSlotConfirmed ?? false,
            needsSlotConfirmation: slot?.needsSlotConfirmation ?? false,
        },
    };
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
            const mode = data.mode === 'hold'
                ? 'hold'
                : data.mode === 'manual_curation'
                    ? 'manual_curation'
                    : 'matches';
            return {
                mode,
                matches: Array.isArray(data.matches) ? data.matches : [],
                hasUpcomingQueued: Boolean(data.hasUpcomingQueued),
                hold: data.hold ? normalizeMatchHold(data.hold) : null,
                manualCuration: data.manualCuration ?? null,
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
            if (data.mode === 'manual_curation') return 30 * 1000;
            const matches = data.matches ?? [];
            if (matches.length === 0) return 60 * 1000;
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

export type CancelMatchHoldResponse = {
    status: string;
    credited?: boolean;
    creditAmountCents?: number | null;
    dateMatchId?: string | null;
};

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
            const json = await res.json();
            const data = (json?.data ?? json) as CancelMatchHoldResponse;
            return { ...payload, ...data };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['candidatePairs', 'daily'] });
            queryClient.invalidateQueries({ queryKey: ['mutualDates'] });
            queryClient.invalidateQueries({ queryKey: ['notificationCounts'] });
            queryClient.invalidateQueries({ queryKey: ['paymentStatus'] });
            queryClient.invalidateQueries({ queryKey: ['dates', 'history'] });
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
