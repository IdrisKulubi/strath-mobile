import { useQuery } from "@tanstack/react-query";
import { getAuthToken } from "@/lib/auth-helpers";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export interface SentConnection {
    swipeId: string;
    createdAt: string;
    toUser: {
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

async function fetchSentConnections(): Promise<SentConnection[]> {
    const token = await getAuthToken();

    const response = await fetch(`${API_URL}/api/swipe/sent`, {
        headers: {
            Authorization: token ? `Bearer ${token}` : "",
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || "Failed to fetch sent connections");
    }

    const result = await response.json();
    const data = result.data || result;
    return (data.sent || []) as SentConnection[];
}

export function useSentConnections() {
    return useQuery({
        queryKey: ["sent-connections"],
        queryFn: fetchSentConnections,
        staleTime: 15 * 1000,
    });
}
