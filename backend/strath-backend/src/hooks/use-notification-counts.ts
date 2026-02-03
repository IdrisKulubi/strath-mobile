"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

interface NotificationCounts {
  unopenedMatches: number;
  unreadMessages: number;
  total: number;
}

async function fetchNotificationCounts(): Promise<NotificationCounts> {
  try {
    const response = await fetch("/api/notifications/counts");
    
    if (!response.ok) {
      console.error("[NotificationCounts] Error:", response.status);
      return { unopenedMatches: 0, unreadMessages: 0, total: 0 };
    }
    
    const result = await response.json();
    return result.data || { unopenedMatches: 0, unreadMessages: 0, total: 0 };
  } catch (error) {
    console.error("[NotificationCounts] Fetch error:", error);
    return { unopenedMatches: 0, unreadMessages: 0, total: 0 };
  }
}

/**
 * Hook for fetching and managing notification counts with live polling
 */
export function useNotificationCounts(options?: { pollingInterval?: number }) {
  const queryClient = useQueryClient();
  const pollingInterval = options?.pollingInterval ?? 10000; // Default 10 seconds

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["notificationCounts"],
    queryFn: fetchNotificationCounts,
    staleTime: 5000, // Consider data stale after 5 seconds
    refetchInterval: pollingInterval, // Poll every N seconds
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });

  // Force refetch function for manual updates
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["notificationCounts"] });
  };

  return {
    unopenedMatches: data?.unopenedMatches ?? 0,
    unreadMessages: data?.unreadMessages ?? 0,
    total: data?.total ?? 0,
    isLoading,
    error,
    refetch,
    invalidate,
  };
}

/**
 * Format badge count for display
 * Returns undefined if count is 0 (no badge shown)
 */
export function formatBadgeCount(count: number): string | undefined {
  if (count <= 0) return undefined;
  if (count > 99) return "99+";
  return count.toString();
}
