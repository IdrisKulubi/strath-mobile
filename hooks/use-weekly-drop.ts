import { useQuery } from "@tanstack/react-query";
import { getAuthToken } from "@/lib/auth-helpers";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export interface WeeklyDropMatch {
    userId: string;
    score: number;
    reasons: string[];
    starters: string[];
    profile: {
        firstName: string | null;
        lastName: string | null;
        age: number | null;
        course: string | null;
        yearOfStudy: number | null;
        profilePhoto: string | null;
        photos: string[] | null;
    } | null;
}

export interface WeeklyDropCurrent {
    id: string;
    dropNumber: number;
    status: "pending" | "delivered" | "opened" | "expired";
    deliveredAt: string | null;
    openedAt: string | null;
    expiresAt: string;
    remainingSeconds: number;
    matchCount: number;
    matches: WeeklyDropMatch[];
    justOpened: boolean;
}

export interface WeeklyDropHistoryItem {
    id: string;
    dropNumber: number;
    status: string;
    createdAt: string;
    deliveredAt: string | null;
    openedAt: string | null;
    expiresAt: string;
    matchCount: number;
    previews: {
        userId: string;
        firstName: string | null;
        profilePhoto: string | null;
        photos: string[] | null;
    }[];
}

async function fetchCurrentDropAPI(): Promise<WeeklyDropCurrent | null> {
    const token = await getAuthToken();

    const response = await fetch(`${API_URL}/api/drops/current`, {
        headers: {
            Authorization: token ? `Bearer ${token}` : "",
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch current weekly drop (${response.status})`);
    }

    const result = await response.json();
    return (result.data || result).drop || null;
}

async function fetchDropHistoryAPI(): Promise<WeeklyDropHistoryItem[]> {
    const token = await getAuthToken();

    const response = await fetch(`${API_URL}/api/drops/history`, {
        headers: {
            Authorization: token ? `Bearer ${token}` : "",
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch weekly drop history (${response.status})`);
    }

    const result = await response.json();
    return (result.data || result).history || [];
}

export function useWeeklyDrop() {
    const currentQuery = useQuery({
        queryKey: ["weekly-drop-current"],
        queryFn: fetchCurrentDropAPI,
        staleTime: 30 * 1000,
        refetchInterval: 30 * 1000,
        retry: 1,
    });

    const historyQuery = useQuery({
        queryKey: ["weekly-drop-history"],
        queryFn: fetchDropHistoryAPI,
        staleTime: 2 * 60 * 1000,
        retry: 1,
    });

    return {
        currentDrop: currentQuery.data || null,
        dropHistory: historyQuery.data || [],
        isCurrentLoading: currentQuery.isLoading,
        isHistoryLoading: historyQuery.isLoading,
        currentError: currentQuery.error instanceof Error ? currentQuery.error.message : null,
        historyError: historyQuery.error instanceof Error ? historyQuery.error.message : null,
        refetchCurrent: currentQuery.refetch,
        refetchHistory: historyQuery.refetch,
    };
}
