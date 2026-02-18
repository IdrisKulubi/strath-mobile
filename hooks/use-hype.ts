/**
 * use-hype — React Query hooks for the Hype Me (Friend Vouches) feature
 *
 * useMyHype()        → own dashboard: all vouches + active invite link
 * useProfileVouches  → public vouch list for another user's profile
 * useGenerateLink()  → create/refresh an invite link
 * useModerateVouch() → approve / hide a vouch
 * useDeleteVouch()   → permanently delete a vouch
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAuthToken } from "@/lib/auth-helpers";
import type {
    HypeResponse,
    GenerateLinkResponse,
    ModerateVouchPayload,
    ModerateVouchResponse,
} from "@/types/hype";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://www.strathspace.com";

// ─── Query keys ───────────────────────────────────────────────────────────────

export const hypeKeys = {
    all: ["hype"] as const,
    myDashboard: () => [...hypeKeys.all, "my"] as const,
    profile: (userId: string) => [...hypeKeys.all, "profile", userId] as const,
};

// ─── API helpers ─────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const token = await getAuthToken();
    const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const res = await fetch(`${API_URL}${path}`, { ...options, headers });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(
            typeof json?.error === "string"
                ? json.error
                : json?.message ?? "Request failed"
        );
    }
    return json.data as T;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Own hype dashboard — all vouches (approved + hidden) + active invite link.
 * Used in the Hype Request screen.
 */
export function useMyHype() {
    return useQuery<HypeResponse>({
        queryKey: hypeKeys.myDashboard(),
        queryFn: () => apiFetch<HypeResponse>("/api/hype"),
        staleTime: 5 * 60 * 1000, // 5 min
    });
}

/**
 * Public vouch list for another user's profile.
 * Only returns approved, non-flagged vouches.
 */
export function useProfileVouches(userId: string) {
    return useQuery<HypeResponse>({
        queryKey: hypeKeys.profile(userId),
        queryFn: () => apiFetch<HypeResponse>(`/api/hype?userId=${userId}`),
        staleTime: 5 * 60 * 1000,
        enabled: Boolean(userId),
    });
}

/**
 * Generate (or refresh) an invite link.
 * Previous link is invalidated server-side.
 */
export function useGenerateLink() {
    const queryClient = useQueryClient();
    return useMutation<GenerateLinkResponse, Error>({
        mutationFn: () =>
            apiFetch<GenerateLinkResponse>("/api/hype", { method: "POST" }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: hypeKeys.myDashboard() });
        },
    });
}

/**
 * Approve or hide a vouch on your profile.
 */
export function useModerateVouch() {
    const queryClient = useQueryClient();
    return useMutation<ModerateVouchResponse, Error, ModerateVouchPayload>({
        mutationFn: (payload) =>
            apiFetch<ModerateVouchResponse>("/api/hype/moderate", {
                method: "PATCH",
                body: JSON.stringify(payload),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: hypeKeys.myDashboard() });
        },
    });
}

/**
 * Permanently delete a vouch from your profile.
 */
export function useDeleteVouch() {
    const queryClient = useQueryClient();
    return useMutation<{ message: string }, Error, { vouchId: string }>({
        mutationFn: (payload) =>
            apiFetch("/api/hype/moderate", {
                method: "DELETE",
                body: JSON.stringify(payload),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: hypeKeys.myDashboard() });
        },
    });
}
