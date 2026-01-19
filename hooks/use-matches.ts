import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { authClient } from '@/lib/auth-client';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

// Schema for profile within match
const MatchProfileSchema = z.object({
    id: z.string().optional(),
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    bio: z.string().nullable().optional(),
    photos: z.array(z.string()).nullable().optional(),
    profilePhoto: z.string().nullable().optional(),
    university: z.string().nullable().optional(),
    course: z.string().nullable().optional(),
    interests: z.array(z.string()).nullable().optional(),
});

// Schema for last message
const LastMessageSchema = z.object({
    id: z.string(),
    content: z.string(),
    senderId: z.string(),
    status: z.enum(['sent', 'delivered', 'read']),
    createdAt: z.string(),
});

// Schema for match partner
const MatchPartnerSchema = z.object({
    id: z.string(),
    name: z.string(),
    image: z.string().nullable().optional(),
    profile: MatchProfileSchema.nullable().optional(),
    lastActive: z.string().nullable().optional(),
});

// Main Match schema
const MatchSchema = z.object({
    id: z.string(),
    partner: MatchPartnerSchema,
    lastMessage: LastMessageSchema.nullable().optional(),
    unreadCount: z.number().optional().default(0),
    isNew: z.boolean().optional().default(false), // Whether the user hasn't opened this match yet
    sparkScore: z.number().optional().default(70),
    createdAt: z.string(),
});

// Response schema with pagination
const MatchesResponseSchema = z.object({
    matches: z.array(MatchSchema),
    nextCursor: z.string().nullable().optional(),
});

export type Match = z.infer<typeof MatchSchema>;
export type MatchPartner = z.infer<typeof MatchPartnerSchema>;
export type MatchesResponse = z.infer<typeof MatchesResponseSchema>;

/**
 * Fetch matches with optional cursor for pagination
 */
async function fetchMatches(cursor?: string): Promise<MatchesResponse> {
    console.log('[useMatches] Fetching matches...');

    const session = await authClient.getSession();
    const token = session.data?.session?.token;
    console.log('[useMatches] Token:', token ? 'Present' : 'Missing');

    const url = new URL(`${API_URL}/api/matches`);
    if (cursor) {
        url.searchParams.set('cursor', cursor);
    }
    url.searchParams.set('limit', '20');

    console.log('[useMatches] Fetching from:', url.toString());

    const response = await fetch(url.toString(), {
        headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
        },
    });

    console.log('[useMatches] Response status:', response.status);

    if (!response.ok) {
        const errorText = await response.text();
        console.error('[useMatches] Error response:', errorText);
        throw new Error('Failed to fetch matches');
    }

    const responseData = await response.json();
    console.log('[useMatches] Raw response:', JSON.stringify(responseData).slice(0, 500));

    // API returns {success: true, data: {matches: [...], nextCursor: ...}}
    // Unwrap the data property
    const data = responseData.data || responseData;

    // Handle both old format (array) and new format (object with matches)
    if (Array.isArray(data)) {
        // Old format - convert to new format
        console.log('[useMatches] Old format (array), converting...');
        return {
            matches: data.map((m: unknown) => {
                const parsed = MatchSchema.safeParse(m);
                return parsed.success ? parsed.data : m as Match;
            }),
            nextCursor: null,
        };
    }

    // New format with pagination
    const result = MatchesResponseSchema.safeParse(data);
    if (!result.success) {
        console.error('[useMatches] Validation error:', result.error);
        // Fallback: return data directly if parsing fails
        return { matches: data.matches || [], nextCursor: data.nextCursor || null };
    }

    console.log('[useMatches] Parsed matches count:', result.data.matches.length);
    return result.data;
}

/**
 * Hook for fetching matches with infinite scroll pagination
 */
export function useMatches() {
    return useQuery({
        queryKey: ['matches'],
        queryFn: () => fetchMatches(),
        staleTime: 30 * 1000, // 30 seconds
        gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
    });
}

/**
 * Hook for fetching matches with infinite scroll
 * Use this for large lists that need pagination
 */
export function useInfiniteMatches() {
    return useInfiniteQuery({
        queryKey: ['matches', 'infinite'],
        queryFn: ({ pageParam }) => fetchMatches(pageParam),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
    });
}

/**
 * Get relative time string (e.g., "2m", "1h", "Yesterday")
 */
export function getRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Get last active status string
 */
export function getLastActiveStatus(dateString: string | null | undefined): { text: string; isOnline: boolean } {
    if (!dateString) return { text: 'Offline', isOnline: false };
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 5) return { text: 'Online now', isOnline: true };
    if (diffMins < 60) return { text: `Active ${diffMins}m ago`, isOnline: false };
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 24) return { text: `Active ${diffHours}h ago`, isOnline: false };
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return { text: 'Active yesterday', isOnline: false };
    if (diffDays < 7) return { text: `Active ${diffDays}d ago`, isOnline: false };
    
    return { text: 'Offline', isOnline: false };
}
