import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAuthToken } from "@/lib/auth-helpers";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

// Block a user
export function useBlockUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (blockedUserId: string) => {
            const token = await getAuthToken();
            if (!token) {
                throw new Error("Not authenticated");
            }

            const response = await fetch(`${API_URL}/api/user/block`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ blockedUserId }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to block user");
            }

            return response.json();
        },
        onSuccess: () => {
            // Invalidate relevant queries
            queryClient.invalidateQueries({ queryKey: ["blocked-users"] });
            queryClient.invalidateQueries({ queryKey: ["discover"] });
            queryClient.invalidateQueries({ queryKey: ["matches"] });
            queryClient.invalidateQueries({ queryKey: ["profiles"] });
        },
    });
}

// Unblock a user
export function useUnblockUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (blockedUserId: string) => {
            const token = await getAuthToken();
            if (!token) {
                throw new Error("Not authenticated");
            }

            const response = await fetch(`${API_URL}/api/user/block?userId=${blockedUserId}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to unblock user");
            }

            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["blocked-users"] });
        },
    });
}

// Get blocked users
export function useBlockedUsers() {
    return useQuery({
        queryKey: ["blocked-users"],
        queryFn: async () => {
            const token = await getAuthToken();
            if (!token) {
                throw new Error("Not authenticated");
            }

            const response = await fetch(`${API_URL}/api/user/block`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error("Failed to fetch blocked users");
            }

            return response.json();
        },
    });
}

// Check if a specific user is blocked
export function useIsUserBlocked(userId: string) {
    const { data: blockedUsers } = useBlockedUsers();

    return blockedUsers?.blocks?.some(
        (block: { blockedId: string }) => block.blockedId === userId
    ) ?? false;
}
