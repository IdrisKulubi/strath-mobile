import { useMutation } from '@tanstack/react-query';
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
