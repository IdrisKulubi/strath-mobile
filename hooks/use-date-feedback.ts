import { useMutation, useQuery } from '@tanstack/react-query';
import { getAuthToken } from '@/lib/auth-helpers';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export type MeetAgain = 'yes' | 'maybe' | 'no';

export interface DateFeedbackPayload {
    dateId: string;
    rating: number;
    meetAgain: MeetAgain;
    textFeedback?: string;
}

export function useDateFeedback() {
    return useMutation({
        mutationFn: async (payload: DateFeedbackPayload) => {
            const token = await getAuthToken();
            if (!token) throw new Error('Not authenticated');
            const res = await fetch(`${API_URL}/api/date-feedback`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.error ?? `Failed to submit feedback (${res.status})`);
            }
            return { success: true };
        },
    });
}

export function useDateFeedbackStatus(dateId?: string) {
    return useQuery({
        queryKey: ['dateFeedbackStatus', dateId],
        enabled: !!dateId,
        queryFn: async () => {
            const token = await getAuthToken();
            if (!token || !dateId) {
                return { hasSubmitted: false };
            }

            const res = await fetch(`${API_URL}/api/date-feedback?dateId=${encodeURIComponent(dateId)}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.error ?? `Failed to fetch feedback status (${res.status})`);
            }

            const json = await res.json();
            return {
                hasSubmitted: !!json?.data?.hasSubmitted,
            };
        },
        staleTime: 30_000,
    });
}
