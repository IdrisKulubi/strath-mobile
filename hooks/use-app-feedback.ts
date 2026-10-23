import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAuthToken } from '@/lib/auth-helpers';
import { apiFetch } from '@/lib/api-client';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.strathspace.com';

export const APP_FEEDBACK_CATEGORIES = [
    { id: 'feature_request', label: 'Feature Request', emoji: '✨' },
    { id: 'bug', label: 'Bug Report', emoji: '🐞' },
    { id: 'general', label: 'General', emoji: '💬' },
    { id: 'complaint', label: 'Complaint', emoji: '😕' },
    { id: 'other', label: 'Other', emoji: '📝' },
] as const;

export type AppFeedbackCategory = typeof APP_FEEDBACK_CATEGORIES[number]['id'];

export interface SubmitAppFeedbackParams {
    category: AppFeedbackCategory;
    message: string;
    anonymous?: boolean;
}

const MATCHMAKER_FEEDBACK_QUERY_KEY = ['feedback', 'matchmaker_v2'] as const;

interface MatchmakerFeedbackStatus {
    hasSubmitted: boolean;
}

interface MatchmakerFeedbackStatusEnvelope {
    data?: MatchmakerFeedbackStatus;
    hasSubmitted?: boolean;
}

function unwrapMatchmakerFeedbackStatus(response: MatchmakerFeedbackStatusEnvelope): MatchmakerFeedbackStatus {
    if (response.data) return response.data;
    return { hasSubmitted: Boolean(response.hasSubmitted) };
}

export function useSubmitAppFeedback() {
    return useMutation({
        mutationFn: async ({ category, message, anonymous }: SubmitAppFeedbackParams) => {
            const token = await getAuthToken();
            if (!token) {
                throw new Error('Not authenticated');
            }

            const response = await fetch(`${API_URL}/api/feedback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ category, message, anonymous: Boolean(anonymous) }),
            });

            const text = await response.text();

            if (!response.ok) {
                let errorMessage = 'Failed to send feedback';
                try {
                    const parsed = JSON.parse(text);
                    errorMessage = parsed.error || errorMessage;
                } catch {
                    errorMessage = text || errorMessage;
                }
                throw new Error(errorMessage);
            }

            try {
                return JSON.parse(text);
            } catch {
                return { ok: true };
            }
        },
    });
}

export function useMatchmakerExperienceFeedbackStatus(enabled: boolean) {
    return useQuery({
        queryKey: MATCHMAKER_FEEDBACK_QUERY_KEY,
        enabled,
        staleTime: 5 * 60 * 1000,
        queryFn: async () => {
            const response = await apiFetch<MatchmakerFeedbackStatusEnvelope>(
                '/api/feedback?source=matchmaker_v2',
            );
            return unwrapMatchmakerFeedbackStatus(response);
        },
    });
}

export function useSubmitMatchmakerExperienceFeedback() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ rating, message }: { rating: number; message?: string }) => {
            return apiFetch('/api/feedback', {
                method: 'POST',
                body: {
                    category: 'general',
                    message: message?.trim() ?? '',
                    anonymous: false,
                    source: 'matchmaker_v2',
                    rating,
                },
            });
        },
        onSuccess: () => {
            queryClient.setQueryData<MatchmakerFeedbackStatus>(
                MATCHMAKER_FEEDBACK_QUERY_KEY,
                { hasSubmitted: true },
            );
        },
    });
}
