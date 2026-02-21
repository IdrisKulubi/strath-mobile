/**
 * use-wingman — React Query hooks for Wingman Link / Wingman Pack
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAuthToken } from "@/lib/auth-helpers";
import type {
    WingmanHistoryResponse,
    WingmanLinkResponse,
    WingmanPackResponse,
    WingmanStatusResponse,
} from "@/types/wingman";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://www.strathspace.com";

export const wingmanKeys = {
    all: ["wingman"] as const,
    status: () => [...wingmanKeys.all, "status"] as const,
    history: () => [...wingmanKeys.all, "history"] as const,
    pack: () => [...wingmanKeys.all, "pack"] as const,
};

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
            typeof json?.error === "string" ? json.error : json?.message ?? "Request failed"
        );
    }
    return json.data as T;
}

export function useWingmanStatus() {
    return useQuery<WingmanStatusResponse>({
        queryKey: wingmanKeys.status(),
        queryFn: () => apiFetch<WingmanStatusResponse>("/api/wingman/status"),
        staleTime: 15 * 1000,
    });
}

export function useStartWingmanRound() {
    const queryClient = useQueryClient();
    return useMutation<WingmanLinkResponse, Error>({
        mutationFn: () => apiFetch<WingmanLinkResponse>("/api/wingman/link", { method: "POST" }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: wingmanKeys.status() });
            queryClient.invalidateQueries({ queryKey: wingmanKeys.history() });
        },
    });
}

export function useWingmanHistory(limit: number = 5) {
    return useQuery<WingmanHistoryResponse>({
        queryKey: wingmanKeys.history(),
        queryFn: () => apiFetch<WingmanHistoryResponse>(`/api/wingman/history?limit=${limit}`),
        staleTime: 60 * 1000,
    });
}

export function useWingmanPack(enabled: boolean) {
    return useQuery<WingmanPackResponse>({
        queryKey: wingmanKeys.pack(),
        queryFn: () => apiFetch<WingmanPackResponse>("/api/wingman/pack"),
        enabled,
        staleTime: 60 * 1000,
    });
}
