import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getAuthToken } from '@/lib/auth-helpers';
import { parseApiError } from '@/lib/api-errors';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export function useConfirmMeetupSlot() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (mutualMatchId: string) => {
            const token = await getAuthToken();
            if (!token) throw new Error('Not authenticated');

            const res = await fetch(`${API_URL}/api/me/match-hold/confirm-slot`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ mutualMatchId }),
            });

            if (!res.ok) {
                throw await parseApiError(res, 'Could not confirm your date');
            }

            const json = await res.json();
            return json?.data ?? {};
        },
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['candidatePairs', 'daily'] }),
                queryClient.invalidateQueries({ queryKey: ['mutualDates'] }),
            ]);
        },
    });
}
