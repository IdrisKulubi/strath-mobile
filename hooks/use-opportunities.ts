import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAuthToken, getCurrentUserId } from "@/lib/auth-helpers";
import { useState, useEffect } from "react";
import type { 
    Opportunity, 
    OpportunitiesResponse, 
    OpportunityFilters,
    OpportunityCategory 
} from "@/types/opportunities";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://www.strathspace.com";

// Helper to get auth headers
async function getAuthHeaders(): Promise<HeadersInit> {
    const token = await getAuthToken();

    return {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
    };
}

// Fetch opportunities with filters
async function fetchOpportunities(
    filters: OpportunityFilters = {},
    userId?: string,
    limit = 20,
    offset = 0
): Promise<OpportunitiesResponse> {
    const params = new URLSearchParams();
    
    if (filters.category) params.append("category", filters.category);
    if (filters.search) params.append("search", filters.search);
    if (filters.featured) params.append("featured", "true");
    if (userId) params.append("userId", userId);
    params.append("limit", limit.toString());
    params.append("offset", offset.toString());

    const url = `${API_URL}/api/opportunities?${params.toString()}`;
    console.log("[useOpportunities] Fetching from:", url);

    try {
        const headers = await getAuthHeaders();
        const response = await fetch(url, { headers });
        console.log("[useOpportunities] Response status:", response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[useOpportunities] Error response:", errorText);
            throw new Error(`Failed to fetch opportunities: ${response.status}`);
        }

        const data = await response.json();
        console.log("[useOpportunities] Got", data.opportunities?.length, "opportunities");
        return data;
    } catch (error) {
        console.error("[useOpportunities] Fetch error:", error);
        throw error;
    }
}

// Fetch single opportunity
async function fetchOpportunity(id: string, userId?: string): Promise<Opportunity> {
    const params = userId ? `?userId=${userId}` : "";
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/opportunities/${id}${params}`, { headers });

    if (!response.ok) {
        throw new Error("Failed to fetch opportunity");
    }

    return response.json();
}

// Fetch saved opportunities
async function fetchSavedOpportunities(userId: string): Promise<{ opportunities: Opportunity[]; total: number }> {
    const headers = await getAuthHeaders();
    const response = await fetch(
        `${API_URL}/api/opportunities/saved?userId=${userId}`,
        { headers }
    );

    if (!response.ok) {
        throw new Error("Failed to fetch saved opportunities");
    }

    return response.json();
}

// Save/unsave opportunity
async function toggleSaveOpportunity(
    opportunityId: string,
    userId: string,
    isSaved: boolean
): Promise<{ isSaved: boolean }> {
    const url = `${API_URL}/api/opportunities/${opportunityId}/save`;
    const headers = await getAuthHeaders();

    if (isSaved) {
        // Unsave
        const response = await fetch(`${url}?userId=${userId}`, {
            method: "DELETE",
            headers,
        });
        if (!response.ok) throw new Error("Failed to unsave opportunity");
        return response.json();
    } else {
        // Save
        const response = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify({ userId }),
        });
        if (!response.ok) throw new Error("Failed to save opportunity");
        return response.json();
    }
}

// Custom hook to get user ID
function useUserId() {
    const [userId, setUserId] = useState<string | null>(null);
    
    useEffect(() => {
        getCurrentUserId().then(setUserId);
    }, []);
    
    return userId;
}

// Main hook for opportunities
export function useOpportunities(filters: OpportunityFilters = {}) {
    const userId = useUserId();

    return useQuery({
        queryKey: ["opportunities", filters, userId],
        queryFn: () => fetchOpportunities(filters, userId || undefined),
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

// Hook for featured opportunities
export function useFeaturedOpportunities() {
    const userId = useUserId();

    return useQuery({
        queryKey: ["opportunities", "featured", userId],
        queryFn: () => fetchOpportunities({ featured: true }, userId || undefined, 5),
        staleTime: 1000 * 60 * 5,
    });
}

// Hook for opportunities by category
export function useOpportunitiesByCategory(category: OpportunityCategory) {
    const userId = useUserId();

    return useQuery({
        queryKey: ["opportunities", "category", category, userId],
        queryFn: () => fetchOpportunities({ category }, userId || undefined),
        staleTime: 1000 * 60 * 5,
    });
}

// Hook for single opportunity
export function useOpportunity(id: string) {
    const userId = useUserId();

    return useQuery({
        queryKey: ["opportunity", id, userId],
        queryFn: () => fetchOpportunity(id, userId || undefined),
        enabled: !!id,
    });
}

// Hook for saved opportunities
export function useSavedOpportunities() {
    const userId = useUserId();

    return useQuery({
        queryKey: ["opportunities", "saved", userId],
        queryFn: () => fetchSavedOpportunities(userId!),
        enabled: !!userId,
        staleTime: 1000 * 60 * 2, // 2 minutes
    });
}

// Hook for toggling save status
export function useToggleSaveOpportunity() {
    const userId = useUserId();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ opportunityId, isSaved }: { opportunityId: string; isSaved: boolean }) =>
            toggleSaveOpportunity(opportunityId, userId!, isSaved),
        onMutate: async ({ opportunityId, isSaved }) => {
            // Optimistic update
            await queryClient.cancelQueries({ queryKey: ["opportunities"] });
            
            // Update the opportunity in cache
            queryClient.setQueriesData(
                { queryKey: ["opportunities"] },
                (old: OpportunitiesResponse | undefined) => {
                    if (!old) return old;
                    return {
                        ...old,
                        opportunities: old.opportunities.map(opp =>
                            opp.id === opportunityId
                                ? { ...opp, isSaved: !isSaved }
                                : opp
                        ),
                    };
                }
            );
        },
        onSettled: () => {
            // Refetch to ensure consistency
            queryClient.invalidateQueries({ queryKey: ["opportunities"] });
        },
    });
}
