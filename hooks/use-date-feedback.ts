import { useMutation } from '@tanstack/react-query';

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
            // TODO: replace with real API call
            // const token = await getAuthToken();
            // const res = await fetch(`${API_URL}/api/date-feedback`, {
            //   method: 'POST',
            //   headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            //   body: JSON.stringify(payload),
            // });
            // return res.json();
            await new Promise((r) => setTimeout(r, 700));
            return { success: true };
        },
    });
}
