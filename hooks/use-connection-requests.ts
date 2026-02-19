import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAuthToken } from "@/lib/auth-helpers";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export interface ConnectionRequest {
    requestId: string;
    createdAt: string;
    fromUser: {
        id: string;
        name: string;
        image: string | null;
        profilePhoto: string | null;
        profile: {
            course: string | null;
            yearOfStudy: number | null;
            university: string | null;
            photos: string[] | null;
        } | null;
    };
}

async function fetchConnectionRequests(): Promise<ConnectionRequest[]> {
    const token = await getAuthToken();

    const response = await fetch(`${API_URL}/api/swipe/requests`, {
        headers: {
            Authorization: token ? `Bearer ${token}` : "",
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || "Failed to fetch requests");
    }

    const result = await response.json();
    const data = result.data || result;
    return (data.requests || []) as ConnectionRequest[];
}

async function respondToRequest(targetUserId: string, action: "like" | "pass") {
    const token = await getAuthToken();

    const response = await fetch(`${API_URL}/api/swipe`, {
        method: "POST",
        headers: {
            Authorization: token ? `Bearer ${token}` : "",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ targetUserId, action }),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to respond");
    }

    const result = await response.json();
    return result.data || result;
}

export function useConnectionRequests() {
    return useQuery({
        queryKey: ["connection-requests"],
        queryFn: fetchConnectionRequests,
        staleTime: 15 * 1000,
    });
}

export function useRespondToConnectionRequest() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ targetUserId, action }: { targetUserId: string; action: "like" | "pass" }) =>
            respondToRequest(targetUserId, action),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["connection-requests"] });
            await queryClient.invalidateQueries({ queryKey: ["matches"] });
            await queryClient.invalidateQueries({ queryKey: ["notificationCounts"] });
        },
    });
}
