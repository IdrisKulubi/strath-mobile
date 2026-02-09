import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import { getAuthToken } from "@/lib/auth-helpers";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

// ============================================
// useAgent — Mobile hook for AI Wingman
// ============================================
// TanStack Query powered hook for the agentic search system.
//
// Usage:
//   const { search, matches, commentary, isSearching, wingmanStats } = useAgent();
//   search("someone chill who loves music");

export interface AgentMatch {
    profile: {
        userId: string;
        firstName: string | null;
        lastName: string | null;
        bio: string | null;
        age: number | null;
        gender: string | null;
        university: string | null;
        course: string | null;
        yearOfStudy: number | null;
        interests: string[] | null;
        photos: string[] | null;
        profilePhoto: string | null;
        qualities: string[] | null;
        prompts: { promptId: string; response: string }[] | null;
        aboutMe: string | null;
        personalitySummary: string | null;
        personalityType: string | null;
        communicationStyle: string | null;
        loveLanguage: string | null;
        lookingFor: string | null;
        religion: string | null;
        lastActive: string | null;
    };
    explanation: {
        tagline: string;
        summary: string;
        conversationStarters: string[];
        vibeEmoji: string;
        matchPercentage: number;
    };
    scores: {
        total: number;
        vector: number;
        preference: number;
        filterMatch: boolean;
    };
}

export interface AgentSearchResponse {
    commentary: string;
    matches: AgentMatch[];
    intent: {
        vibe: string;
        confidence: number;
        semanticQuery: string;
        isRefinement: boolean;
    };
    meta: {
        totalFound: number;
        hasMore: boolean;
        nextOffset: number;
        searchMethod: string;
        latencyMs: number;
    };
}

export interface WingmanStats {
    totalQueries: number;
    totalFeedback: number;
    learnedTraits: number;
    lastQuery: string | null;
    lastMessage: string | null;
}

// ===== API functions =====

async function agentSearchAPI(
    query: string,
    limit: number = 20,
    offset: number = 0,
    excludeIds: string[] = [],
): Promise<AgentSearchResponse> {
    const token = await getAuthToken();

    const response = await fetch(`${API_URL}/api/agent/search`, {
        method: "POST",
        headers: {
            Authorization: token ? `Bearer ${token}` : "",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, limit, offset, excludeIds }),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Search failed");
    }

    const result = await response.json();
    return result.data || result;
}

async function agentFeedbackAPI(
    matchedUserId: string,
    outcome: "amazing" | "nice" | "meh" | "not_for_me",
): Promise<void> {
    const token = await getAuthToken();

    await fetch(`${API_URL}/api/agent/feedback`, {
        method: "POST",
        headers: {
            Authorization: token ? `Bearer ${token}` : "",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "feedback", matchedUserId, outcome }),
    });
}

async function getWingmanStatusAPI(): Promise<WingmanStats> {
    const token = await getAuthToken();

    const response = await fetch(`${API_URL}/api/agent/search`, {
        headers: {
            Authorization: token ? `Bearer ${token}` : "",
        },
    });

    if (!response.ok) throw new Error("Failed to get wingman status");

    const result = await response.json();
    return (result.data || result).wingmanMemory;
}

// ===== Hook =====

export function useAgent() {
    const queryClient = useQueryClient();
    const [currentQuery, setCurrentQuery] = useState<string | null>(null);
    const [allMatches, setAllMatches] = useState<AgentMatch[]>([]);
    const [commentary, setCommentary] = useState<string | null>(null);
    const [meta, setMeta] = useState<AgentSearchResponse["meta"] | null>(null);
    const [intent, setIntent] = useState<AgentSearchResponse["intent"] | null>(null);

    // Search mutation
    const searchMutation = useMutation({
        mutationFn: ({
            query,
            limit,
            offset,
            excludeIds,
        }: {
            query: string;
            limit?: number;
            offset?: number;
            excludeIds?: string[];
        }) => agentSearchAPI(query, limit, offset, excludeIds),

        onSuccess: (data, variables) => {
            if (variables.offset && variables.offset > 0) {
                // Append to existing results ("show me more")
                setAllMatches(prev => [...prev, ...data.matches]);
            } else {
                // New search — replace results
                setAllMatches(data.matches);
            }
            setCommentary(data.commentary);
            setMeta(data.meta);
            setIntent(data.intent);
            setCurrentQuery(variables.query);

            // Invalidate wingman stats
            queryClient.invalidateQueries({ queryKey: ["wingman-stats"] });
        },
    });

    // Feedback mutation
    const feedbackMutation = useMutation({
        mutationFn: ({
            matchedUserId,
            outcome,
        }: {
            matchedUserId: string;
            outcome: "amazing" | "nice" | "meh" | "not_for_me";
        }) => agentFeedbackAPI(matchedUserId, outcome),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["wingman-stats"] });
        },
    });

    // Wingman stats query
    const wingmanStats = useQuery({
        queryKey: ["wingman-stats"],
        queryFn: getWingmanStatusAPI,
        staleTime: 5 * 60 * 1000, // 5 min
        retry: 1,
    });

    // Primary search function
    const search = useCallback(
        (query: string, limit?: number) => {
            searchMutation.mutate({ query, limit, offset: 0 });
        },
        [searchMutation],
    );

    // Load more results
    const loadMore = useCallback(() => {
        if (!currentQuery || !meta?.hasMore) return;
        searchMutation.mutate({
            query: currentQuery,
            offset: meta.nextOffset,
            excludeIds: allMatches.map(m => m.profile.userId),
        });
    }, [currentQuery, meta, allMatches, searchMutation]);

    // Submit feedback on a match
    const submitFeedback = useCallback(
        (matchedUserId: string, outcome: "amazing" | "nice" | "meh" | "not_for_me") => {
            feedbackMutation.mutate({ matchedUserId, outcome });
        },
        [feedbackMutation],
    );

    // Clear results
    const clear = useCallback(() => {
        setAllMatches([]);
        setCommentary(null);
        setMeta(null);
        setIntent(null);
        setCurrentQuery(null);
    }, []);

    return {
        // Actions
        search,
        loadMore,
        submitFeedback,
        clear,

        // State
        matches: allMatches,
        commentary,
        intent,
        meta,
        currentQuery,

        // Loading states
        isSearching: searchMutation.isPending,
        searchError: searchMutation.error?.message || null,
        isFeedbackPending: feedbackMutation.isPending,

        // Wingman stats
        wingmanStats: wingmanStats.data || null,
        isWingmanLoading: wingmanStats.isLoading,
    };
}
