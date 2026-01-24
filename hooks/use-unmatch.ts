import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getAuthToken } from "@/lib/auth-helpers";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

interface UnmatchParams {
    matchId: string;
}

interface UnmatchResponse {
    message: string;
    matchId: string;
}

export function useUnmatch() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ matchId }: UnmatchParams): Promise<UnmatchResponse> => {
            const token = await getAuthToken();
            if (!token) {
                throw new Error("Not authenticated");
            }

            const response = await fetch(`${API_URL}/api/matches/${matchId}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            const responseText = await response.text();

            if (!response.ok) {
                let errorMessage = "Failed to unmatch";
                try {
                    const errorData = JSON.parse(responseText);
                    errorMessage = errorData.error || errorMessage;
                } catch {
                    // Use default error message
                }
                throw new Error(errorMessage);
            }

            const data = JSON.parse(responseText);
            return data.data;
        },
        onSuccess: () => {
            // Invalidate matches query to refresh the list
            queryClient.invalidateQueries({ queryKey: ["matches"] });
        },
    });
}
