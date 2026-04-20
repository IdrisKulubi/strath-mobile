import { useMutation } from '@tanstack/react-query';
import { getAuthToken } from '@/lib/auth-helpers';

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
