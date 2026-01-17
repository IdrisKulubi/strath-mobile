import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession, authClient } from "@/lib/auth-client";
import * as SecureStore from 'expo-secure-store';
import type { 
    Opportunity, 
    OpportunitiesResponse, 
    OpportunityFilters,
    OpportunityCategory 
} from "@/types/opportunities";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

// Helper to get auth headers
async function getAuthHeaders(): Promise<HeadersInit> {
    const session = await authClient.getSession();
    const token = session?.data?.session?.token;
    const storedToken = await SecureStore.getItemAsync('strathmobile.session_token');
    const finalToken = token || storedToken;

    return {
        'Content-Type': 'application/json',
        ...(finalToken && { 'Authorization': `Bearer ${finalToken}` }),
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

// Main hook for opportunities
export function useOpportunities(filters: OpportunityFilters = {}) {
    const { data: session } = useSession();
    const userId = session?.user?.id;

    return useQuery({
        queryKey: ["opportunities", filters, userId],
        queryFn: () => fetchOpportunities(filters, userId),
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

// Hook for featured opportunities
export function useFeaturedOpportunities() {
    const { data: session } = useSession();
    const userId = session?.user?.id;

    return useQuery({
        queryKey: ["opportunities", "featured", userId],
        queryFn: () => fetchOpportunities({ featured: true }, userId, 5),
        staleTime: 1000 * 60 * 5,
    });
}

// Hook for opportunities by category
export function useOpportunitiesByCategory(category: OpportunityCategory) {
    const { data: session } = useSession();
    const userId = session?.user?.id;

    return useQuery({
        queryKey: ["opportunities", "category", category, userId],
        queryFn: () => fetchOpportunities({ category }, userId),
        staleTime: 1000 * 60 * 5,
    });
}

// Hook for single opportunity
export function useOpportunity(id: string) {
    const { data: session } = useSession();
    const userId = session?.user?.id;

    return useQuery({
        queryKey: ["opportunity", id, userId],
        queryFn: () => fetchOpportunity(id, userId),
        enabled: !!id,
    });
}

// Hook for saved opportunities
export function useSavedOpportunities() {
    const { data: session } = useSession();
    const userId = session?.user?.id;

    return useQuery({
        queryKey: ["opportunities", "saved", userId],
        queryFn: () => fetchSavedOpportunities(userId!),
        enabled: !!userId,
        staleTime: 1000 * 60 * 2, // 2 minutes
    });
}

// Hook for toggling save status
export function useToggleSaveOpportunity() {
    const { data: session } = useSession();
    const userId = session?.user?.id;
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
