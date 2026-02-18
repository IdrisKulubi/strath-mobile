/**
 * use-pulse — TanStack Query hooks for Campus Pulse
 *
 * Hooks:
 *   usePulseFeed(category?)        — paginated feed w/ infinite scroll
 *   useCreatePost()                — create a new post mutation
 *   useDeletePost()                — delete own post mutation
 *   useToggleReaction(postId)      — toggle fire/skull/heart
 *   useRequestReveal(postId)       — request identity reveal
 */
import {
    useInfiniteQuery,
    useMutation,
    useQueryClient,
} from "@tanstack/react-query";
import { getAuthToken } from "@/lib/auth-helpers";
import type {
    PulseCategory,
    PulseFeedResponse,
    PulsePost,
    ReactionType,
    RevealResponse,
} from "@/types/pulse";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

// ─── Query keys ───────────────────────────────────────────────────────────────

export const pulseKeys = {
    all: ["pulse"] as const,
    feed: (category?: PulseCategory | null) => ["pulse", "feed", category ?? "all"] as const,
};

// ─── API helpers ──────────────────────────────────────────────────────────────

async function authHeaders(): Promise<Record<string, string>> {
    const token = await getAuthToken();
    return {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

async function fetchFeedPage(
    page: number,
    category?: PulseCategory | null
): Promise<PulseFeedResponse> {
    const headers = await authHeaders();
    const params = new URLSearchParams({ page: String(page) });
    if (category) params.set("category", category);

    const res = await fetch(`${API_URL}/api/pulse?${params}`, { headers });
    if (!res.ok) throw new Error("Failed to load pulse feed");
    const json = await res.json();
    return json.data ?? json;
}

async function createPostAPI(payload: {
    content: string;
    category: PulseCategory;
    isAnonymous: boolean;
}): Promise<PulsePost> {
    const headers = await authHeaders();
    const res = await fetch(`${API_URL}/api/pulse`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to create post");
    }
    const json = await res.json();
    return (json.data ?? json).post;
}

async function deletePostAPI(postId: string): Promise<void> {
    const headers = await authHeaders();
    const res = await fetch(`${API_URL}/api/pulse?postId=${postId}`, {
        method: "DELETE",
        headers,
    });
    if (!res.ok) throw new Error("Failed to delete post");
}

async function toggleReactionAPI(
    postId: string,
    reaction: ReactionType
): Promise<{ added: boolean; reaction: ReactionType; counts: { fire: number; skull: number; heart: number } }> {
    const headers = await authHeaders();
    const res = await fetch(`${API_URL}/api/pulse/${postId}/react`, {
        method: "POST",
        headers,
        body: JSON.stringify({ reaction }),
    });
    if (!res.ok) throw new Error("Failed to toggle reaction");
    const json = await res.json();
    return json.data ?? json;
}

async function requestRevealAPI(postId: string): Promise<RevealResponse> {
    const headers = await authHeaders();
    const res = await fetch(`${API_URL}/api/pulse/${postId}/reveal`, {
        method: "POST",
        headers,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to request reveal");
    }
    const json = await res.json();
    return json.data ?? json;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Infinite-scroll paginated feed.
 * Stale time: 30s — posts update quickly.
 */
export function usePulseFeed(category?: PulseCategory | null) {
    return useInfiniteQuery({
        queryKey: pulseKeys.feed(category),
        queryFn: ({ pageParam = 0 }) => fetchFeedPage(pageParam as number, category),
        initialPageParam: 0,
        getNextPageParam: (lastPage) =>
            lastPage.hasMore ? lastPage.page + 1 : undefined,
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
    });
}

/** Create a new post. Invalidates the feed on success. */
export function useCreatePost() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createPostAPI,
        onSuccess: () => {
            // Invalidate all feed variants so the new post appears at top
            queryClient.invalidateQueries({ queryKey: pulseKeys.all });
        },
    });
}

/** Delete own post (soft-hide). Invalidates feed. */
export function useDeletePost() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deletePostAPI,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: pulseKeys.all });
        },
    });
}

/**
 * Toggle a reaction.
 * Uses optimistic updates — immediately reflects the change in the feed cache.
 */
export function useToggleReaction(postId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (reaction: ReactionType) => toggleReactionAPI(postId, reaction),
        onMutate: async (reaction) => {
            // Cancel outgoing refetches for all feed queries
            await queryClient.cancelQueries({ queryKey: pulseKeys.all });

            // Snapshot
            const previousData = queryClient.getQueriesData({ queryKey: pulseKeys.all });

            // Optimistically update every page that contains this post
            queryClient.setQueriesData<any>(
                { queryKey: pulseKeys.all },
                (old: any) => {
                    if (!old?.pages) return old;
                    return {
                        ...old,
                        pages: old.pages.map((page: PulseFeedResponse) => ({
                            ...page,
                            posts: page.posts.map((p) => {
                                if (p.id !== postId) return p;

                                const prev = p.userReaction;
                                const isSame = prev === reaction;
                                const newReaction = isSame ? null : reaction;

                                const counts = { ...p.reactions };
                                if (prev) counts[prev] = Math.max(0, counts[prev] - 1);
                                if (!isSame) counts[reaction] = counts[reaction] + 1;

                                return { ...p, userReaction: newReaction, reactions: counts };
                            }),
                        })),
                    };
                }
            );

            return { previousData };
        },
        onError: (_err, _vars, context) => {
            // Roll back on error
            if (context?.previousData) {
                for (const [key, value] of context.previousData) {
                    queryClient.setQueryData(key, value);
                }
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: pulseKeys.all });
        },
    });
}

/** Request identity reveal on an anonymous post. */
export function useRequestReveal(postId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => requestRevealAPI(postId),
        onSuccess: () => {
            // Refresh this post's reveal state in feed
            queryClient.invalidateQueries({ queryKey: pulseKeys.all });
        },
    });
}
