import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { getAuthToken } from '@/lib/auth-helpers';

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

    const token = await getAuthToken();
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

export { getRelativeTime, getLastActiveStatus } from '@/lib/messaging/format-time';
