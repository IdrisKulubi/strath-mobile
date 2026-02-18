import {
    useQuery,
    useMutation,
    useQueryClient,
    type UseMutationResult,
} from "@tanstack/react-query";
import { getAuthToken } from "@/lib/auth-helpers";
import type {
    StudyDateFeedResponse,
    StudySessionForm,
    MyStudySession,
} from "@/types/study-date";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://www.strathspace.com";

// ─── Query keys ───────────────────────────────────────────────────────────────

export const studyDateKeys = {
    all: ["study-date"] as const,
    feed: () => [...studyDateKeys.all, "feed"] as const,
};

// ─── API helpers ─────────────────────────────────────────────────────────────

async function apiFetch(path: string, options?: RequestInit) {
    const token = await getAuthToken();
    const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const res = await fetch(`${API_URL}${path}`, { ...options, headers });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error ?? "Request failed");
    return json.data;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Fetch nearby active study sessions + own active session.
 * Auto-refreshes every 60 seconds.
 */
export function useStudyDateFeed() {
    return useQuery<StudyDateFeedResponse>({
        queryKey: studyDateKeys.feed(),
        queryFn: () => apiFetch("/api/study-date"),
        staleTime: 30 * 1000, // 30 s
        refetchInterval: 60 * 1000, // 60 s background refresh
    });
}

/**
 * Broadcast / start a study session.
 */
export function useGoLive() {
    const queryClient = useQueryClient();
    return useMutation<MyStudySession, Error, StudySessionForm>({
        mutationFn: (form) =>
            apiFetch("/api/study-date", {
                method: "POST",
                body: JSON.stringify(form),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: studyDateKeys.feed() });
        },
    });
}

/**
 * End own active session.
 */
export function useEndSession() {
    const queryClient = useQueryClient();
    return useMutation<void, Error>({
        mutationFn: () =>
            apiFetch("/api/study-date", { method: "DELETE" }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: studyDateKeys.feed() });
        },
    });
}

/**
 * Send a join request to a session.
 */
export function useJoinSession(sessionId: string): UseMutationResult<void, Error, void> {
    const queryClient = useQueryClient();
    return useMutation<void, Error, void>({
        mutationFn: () =>
            apiFetch(`/api/study-date/${sessionId}/join`, { method: "POST" }),
        onSuccess: () => {
            // Invalidate feed so "Join" button can be shown as sent
            queryClient.invalidateQueries({ queryKey: studyDateKeys.feed() });
        },
    });
}
