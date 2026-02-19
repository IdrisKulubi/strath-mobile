import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import { getAuthToken } from "@/lib/auth-helpers";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const AGENT_REQUEST_TIMEOUT_MS = 15_000;
const AGENT_TIMEOUT_MESSAGE = "Took longer than expected, try again?";

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
    refinement_hints?: string[];
    refinementHints?: string[];
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

export interface WingmanContext {
    totalQueries: number;
    totalFeedback: number;
    learnedTraits: number;
    lastQuery: string | null;
    lastQueryTimestamp: string | null;
    lastMessage: string | null;
    proactiveMessage: string | null;
    hasMemory: boolean;
    recentQueries: {
        query: string;
        timestamp: string;
        resultCount: number;
    }[];
    feedbackBreakdown: {
        amazing: number;
        nice: number;
        meh: number;
        not_for_me: number;
    };
}

// ===== API functions =====

async function agentSearchAPI(
    query: string,
    limit: number = 20,
    offset: number = 0,
    excludeIds: string[] = [],
): Promise<AgentSearchResponse> {
    const token = await getAuthToken();
    const url = `${API_URL}/api/agent/search`;
    console.log('[Agent] Searching:', query, 'url:', url, 'hasToken:', !!token);

    let response: Response;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AGENT_REQUEST_TIMEOUT_MS);
    try {
        response = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: token ? `Bearer ${token}` : "",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ query, limit, offset, excludeIds }),
            signal: controller.signal,
        });
    } catch (networkErr) {
        if (networkErr?.name === "AbortError") {
            throw new Error(AGENT_TIMEOUT_MESSAGE);
        }
        console.error('[Agent] Network error:', networkErr);
        throw new Error("Can't reach server — check your connection");
    } finally {
        clearTimeout(timeoutId);
    }

    if (!response.ok) {
        let errMsg = `Search failed (${response.status})`;
        try {
            const text = await response.text();
            if (text) {
                const errData = JSON.parse(text);
                errMsg = errData.error || errMsg;
            }
        } catch {}
        console.error('[Agent] API error:', response.status, errMsg);
        throw new Error(errMsg);
    }

    const result = await response.json();
    console.log('[Agent] Got', (result.data || result).matches?.length, 'matches');
    return result.data || result;
}

async function agentRefineAPI(
    originalQuery: string,
    refinement: string,
    previousMatchIds: string[] = [],
): Promise<AgentSearchResponse> {
    const token = await getAuthToken();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AGENT_REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
        response = await fetch(`${API_URL}/api/agent/refine`, {
            method: "POST",
            headers: {
                Authorization: token ? `Bearer ${token}` : "",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                original_query: originalQuery,
                refinement,
                previous_match_ids: previousMatchIds,
                limit: 20,
                offset: 0,
            }),
            signal: controller.signal,
        });
    } catch (networkErr: any) {
        if (networkErr?.name === "AbortError") {
            throw new Error(AGENT_TIMEOUT_MESSAGE);
        }
        throw networkErr;
    } finally {
        clearTimeout(timeoutId);
    }

    if (!response.ok) {
        const text = await response.text();
        try {
            const parsed = JSON.parse(text);
            throw new Error(parsed.error || `Refinement failed (${response.status})`);
        } catch {
            throw new Error(`Refinement failed (${response.status})`);
        }
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

async function getWingmanContextAPI(): Promise<WingmanContext> {
    const token = await getAuthToken();

    const response = await fetch(`${API_URL}/api/agent/context`, {
        headers: {
            Authorization: token ? `Bearer ${token}` : "",
        },
    });

    if (!response.ok) throw new Error("Failed to get wingman context");

    const result = await response.json();
    return result.data || result;
}

async function resetWingmanMemoryAPI(): Promise<void> {
    const token = await getAuthToken();

    const response = await fetch(`${API_URL}/api/agent/context`, {
        method: "DELETE",
        headers: {
            Authorization: token ? `Bearer ${token}` : "",
        },
    });

    if (!response.ok) throw new Error("Failed to reset wingman memory");
}

interface ConnectResult {
    matched: boolean;
    matchId: string | null;
}

async function connectWithIntroAPI(
    targetUserId: string,
    introMessage?: string,
): Promise<ConnectResult> {
    const token = await getAuthToken();

    const swipeResponse = await fetch(`${API_URL}/api/swipe`, {
        method: 'POST',
        headers: {
            Authorization: token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetUserId, action: 'like' }),
    });

    if (!swipeResponse.ok) {
        throw new Error('Failed to connect');
    }

    const swipeResult = await swipeResponse.json();
    const swipeData = swipeResult.data || swipeResult;
    const isMatch = Boolean(swipeData.isMatch);
    const matchId = swipeData.match?.id ?? null;

    if (isMatch && matchId && introMessage?.trim()) {
        const messageResponse = await fetch(`${API_URL}/api/messages/${matchId}`, {
            method: 'POST',
            headers: {
                Authorization: token ? `Bearer ${token}` : '',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content: introMessage.trim() }),
        });

        if (!messageResponse.ok) {
            throw new Error('Match created but failed to send intro message');
        }
    }

    return {
        matched: isMatch,
        matchId,
    };
}

// ===== Hook =====

export function useAgent() {
    const queryClient = useQueryClient();
    const [currentQuery, setCurrentQuery] = useState<string | null>(null);
    const [allMatches, setAllMatches] = useState<AgentMatch[]>([]);
    const [commentary, setCommentary] = useState<string | null>(null);
    const [refinementHints, setRefinementHints] = useState<string[]>([]);
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

        onMutate: (variables) => {
            // Set currentQuery immediately so UI shows loading state
            setCurrentQuery(variables.query);
        },

        onSuccess: (data, variables) => {
            if (variables.offset && variables.offset > 0) {
                // Append to existing results ("show me more")
                setAllMatches(prev => [...prev, ...data.matches]);
            } else {
                // New search — replace results
                setAllMatches(data.matches);
            }
            setCommentary(data.commentary);
            setRefinementHints(data.refinement_hints || data.refinementHints || []);
            setMeta(data.meta);
            setIntent(data.intent);

            // Invalidate wingman stats
            queryClient.invalidateQueries({ queryKey: ["wingman-stats"] });
        },

        onError: (error, variables) => {
            console.error('[useAgent] Search failed:', error.message, 'query:', variables.query);
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

    const connectMutation = useMutation({
        mutationFn: ({
            targetUserId,
            introMessage,
        }: {
            targetUserId: string;
            introMessage?: string;
        }) => connectWithIntroAPI(targetUserId, introMessage),
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['matches'] });
            queryClient.invalidateQueries({ queryKey: ['discover-profiles'] });
            queryClient.invalidateQueries({ queryKey: ['wingman-stats'] });
        },
    });

    const refineMutation = useMutation({
        mutationFn: ({
            originalQuery,
            refinement,
            previousMatchIds,
        }: {
            originalQuery: string;
            refinement: string;
            previousMatchIds: string[];
        }) => agentRefineAPI(originalQuery, refinement, previousMatchIds),
        onSuccess: (data, variables) => {
            setAllMatches(data.matches);
            setCommentary(data.commentary);
            setRefinementHints(data.refinement_hints || data.refinementHints || []);
            setMeta(data.meta);
            setIntent(data.intent);
            setCurrentQuery(`${variables.originalQuery}, but ${variables.refinement}`);
            queryClient.invalidateQueries({ queryKey: ["wingman-stats"] });
        },
    });

    // Wingman stats query (lightweight)
    const wingmanStats = useQuery({
        queryKey: ["wingman-stats"],
        queryFn: getWingmanStatusAPI,
        staleTime: 5 * 60 * 1000, // 5 min
        retry: 1,
    });

    // Wingman context query (full context, incl. proactive message + history)
    const wingmanContextQuery = useQuery({
        queryKey: ["wingman-context"],
        queryFn: getWingmanContextAPI,
        staleTime: 5 * 60 * 1000, // 5 min
        retry: 1,
    });

    // Reset memory mutation
    const resetMemoryMutation = useMutation({
        mutationFn: resetWingmanMemoryAPI,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["wingman-stats"] });
            queryClient.invalidateQueries({ queryKey: ["wingman-context"] });
        },
    });

    const resetMemory = useCallback(() => {
        resetMemoryMutation.mutate();
    }, [resetMemoryMutation]);

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

    const connectWithIntro = useCallback(
        async (targetUserId: string, introMessage?: string) => {
            return await connectMutation.mutateAsync({ targetUserId, introMessage });
        },
        [connectMutation],
    );

    const refine = useCallback(
        (refinement: string) => {
            if (!currentQuery || !refinement.trim()) return;
            refineMutation.mutate({
                originalQuery: currentQuery,
                refinement: refinement.trim(),
                previousMatchIds: allMatches.map(m => m.profile.userId),
            });
        },
        [currentQuery, allMatches, refineMutation],
    );

    // Clear results
    const clear = useCallback(() => {
        setAllMatches([]);
        setCommentary(null);
        setRefinementHints([]);
        setMeta(null);
        setIntent(null);
        setCurrentQuery(null);
    }, []);

    return {
        // Actions
        search,
        refine,
        loadMore,
        submitFeedback,
        connectWithIntro,
        clear,
        resetMemory,

        // State
        matches: allMatches,
        results: allMatches,
        commentary,
        agentMessage: commentary,
        refinementHints,
        intent,
        meta,
        currentQuery,

        // Loading states
        isSearching: searchMutation.isPending,
        isThinking: searchMutation.isPending || refineMutation.isPending,
        searchError: searchMutation.error?.message || refineMutation.error?.message || null,
        error: searchMutation.error?.message || refineMutation.error?.message || null,
        isFeedbackPending: feedbackMutation.isPending,
        isConnecting: connectMutation.isPending,
        isRefining: refineMutation.isPending,
        connectError: connectMutation.error?.message || null,
        isResettingMemory: resetMemoryMutation.isPending,

        // Wingman stats (lightweight)
        wingmanStats: wingmanStats.data || null,
        isWingmanLoading: wingmanStats.isLoading,

        // Wingman context (full — includes proactive message, history)
        wingmanContext: wingmanContextQuery.data || null,
        isWingmanContextLoading: wingmanContextQuery.isLoading,
        proactiveMessage: wingmanContextQuery.data?.proactiveMessage || null,
    };
}
