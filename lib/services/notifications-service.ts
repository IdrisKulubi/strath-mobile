import { getAuthHeaders } from '@/lib/auth-helpers';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export const NotificationsService = {
    async registerPushToken(pushToken: string): Promise<void> {
        if (!API_URL) {
            throw new Error('EXPO_PUBLIC_API_URL is not set');
        }

        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/api/user/push-token`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ pushToken }),
        });

        if (!response.ok) {
            const text = await response.text().catch(() => '');
            throw new Error(`Failed to register push token (${response.status}): ${text}`);
        }
    },
};
