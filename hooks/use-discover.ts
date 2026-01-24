import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';
import { Image } from 'react-native';
import { z } from 'zod';
import { getAuthToken } from '@/lib/auth-helpers';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

// Profile schema matching backend response
const ProfileSchema = z.object({
    id: z.string(),
    userId: z.string(),
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    bio: z.string().nullable().optional(),
    age: z.number().nullable().optional(),
    gender: z.string().nullable().optional(),
    university: z.string().nullable().optional(),
    course: z.string().nullable().optional(),
    yearOfStudy: z.number().nullable().optional(),
    interests: z.array(z.string()).nullable().optional(),
    photos: z.array(z.string()).nullable().optional(),
    profilePhoto: z.string().nullable().optional(),
    score: z.number().optional(),
    // New enhanced profile fields
    qualities: z.array(z.string()).nullable().optional(),
    prompts: z.array(z.object({
        promptId: z.string(),
        response: z.string(),
    })).nullable().optional(),
    aboutMe: z.string().nullable().optional(),
    height: z.string().nullable().optional(),
    education: z.string().nullable().optional(),
    smoking: z.string().nullable().optional(),
    workoutFrequency: z.string().nullable().optional(),
    lookingFor: z.string().nullable().optional(),
    politics: z.string().nullable().optional(),
    religion: z.string().nullable().optional(),
    languages: z.array(z.string()).nullable().optional(),
    user: z.object({
        id: z.string(),
        name: z.string(),
        email: z.string().optional(),
        image: z.string().nullable().optional(),
    }).optional(),
});

const DiscoverResponseSchema = z.object({
    profiles: z.array(ProfileSchema),
    hasMore: z.boolean(),
    nextOffset: z.number(),
});

export type DiscoverProfile = z.infer<typeof ProfileSchema>;
export type DiscoverResponse = z.infer<typeof DiscoverResponseSchema>;

// Fetch profiles from discover API
async function fetchProfiles(offset: number = 0, limit: number = 10, vibe: string = 'all'): Promise<DiscoverResponse> {
    const token = await getAuthToken();

    const url = `${API_URL}/api/discover?limit=${limit}&offset=${offset}&vibe=${vibe}`;

    const response = await fetch(url, {
        headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch profiles');
    }

    const result = await response.json();
    const data = result.data || result;

    return DiscoverResponseSchema.parse(data);
}

// Swipe on a profile
async function swipeProfile(targetUserId: string, action: 'like' | 'pass'): Promise<{
    success: boolean;
    isMatch: boolean;
    match?: any;
}> {
    const token = await getAuthToken();

    const response = await fetch(`${API_URL}/api/swipe`, {
        method: 'POST',
        headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetUserId, action }),
    });

    if (!response.ok) {
        throw new Error('Failed to record swipe');
    }

    const result = await response.json();
    return result.data || result;
}

// Preload images for smoother UX
function preloadImages(profiles: DiscoverProfile[], count: number = 5) {
    profiles.slice(0, count).forEach(profile => {
        // Preload profile photo
        if (profile.profilePhoto) {
            Image.prefetch(profile.profilePhoto);
        }
        // Preload all photos
        profile.photos?.slice(0, 3).forEach(url => {
            if (url) Image.prefetch(url);
        });
        // Preload user image
        if (profile.user?.image) {
            Image.prefetch(profile.user.image);
        }
    });
}

/**
 * useDiscover Hook
 * Fetches and manages discover profiles with infinite loading
 */
export function useDiscover(vibe: string = 'all') {
    const queryClient = useQueryClient();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [swipeHistory, setSwipeHistory] = useState<{ profile: DiscoverProfile; action: 'like' | 'pass' }[]>([]);
    const [matchedProfile, setMatchedProfile] = useState<DiscoverProfile | null>(null);

    // Infinite query for profiles
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError,
        error,
        refetch,
    } = useInfiniteQuery({
        queryKey: ['discover', vibe],
        queryFn: ({ pageParam = 0 }) => fetchProfiles(pageParam, 10, vibe),
        getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextOffset : undefined,
        initialPageParam: 0,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes cache
    });

    // Reset current index when vibe changes
    useEffect(() => {
        setCurrentIndex(0);
        setSwipeHistory([]);
    }, [vibe]);

    // Flatten all profiles from all pages
    const allProfiles = data?.pages.flatMap(page => page.profiles) ?? [];

    // Prefetch more profiles when running low
    useEffect(() => {
        const remaining = allProfiles.length - currentIndex;
        if (remaining <= 3 && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [currentIndex, allProfiles.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

    // Preload images for upcoming profiles
    useEffect(() => {
        const upcomingProfiles = allProfiles.slice(currentIndex, currentIndex + 5);
        if (upcomingProfiles.length > 0) {
            preloadImages(upcomingProfiles);
        }
    }, [currentIndex, allProfiles]);

    // Swipe mutation
    const swipeMutation = useMutation({
        mutationFn: ({ targetUserId, action }: { targetUserId: string; action: 'like' | 'pass' }) =>
            swipeProfile(targetUserId, action),
        onSuccess: (result, variables) => {
            if (result.isMatch) {
                // Find the matched profile
                const profile = allProfiles.find(p => p.userId === variables.targetUserId);
                if (profile) {
                    setMatchedProfile(profile);
                }
                // Invalidate matches to update the list
                queryClient.invalidateQueries({ queryKey: ['matches'] });
            }
        },
    });

    // Handle swipe action
    const handleSwipe = useCallback((action: 'like' | 'pass') => {
        const currentProfile = allProfiles[currentIndex];
        if (!currentProfile) return;

        // Record in history for undo
        setSwipeHistory(prev => [...prev, { profile: currentProfile, action }]);

        // Move to next card
        setCurrentIndex(prev => prev + 1);

        // Send swipe to backend
        swipeMutation.mutate({
            targetUserId: currentProfile.userId,
            action,
        });
    }, [currentIndex, allProfiles, swipeMutation]);

    // Undo last swipe
    const undoSwipe = useCallback(() => {
        if (swipeHistory.length === 0) return;

        // Remove last swipe from history
        setSwipeHistory(prev => prev.slice(0, -1));

        // Move back to previous card
        setCurrentIndex(prev => Math.max(0, prev - 1));

        // Note: We can't truly "undo" a swipe on the backend
        // This is just for UI purposes. In a real app, you might
        // want to implement a "super undo" feature with a time window.
    }, [swipeHistory]);

    // Clear match modal
    const clearMatch = useCallback(() => {
        setMatchedProfile(null);
    }, []);

    // Get current and upcoming profiles for card stack
    const currentProfile = allProfiles[currentIndex];
    const upcomingProfiles = allProfiles.slice(currentIndex, currentIndex + 3);

    return {
        // Data
        currentProfile,
        upcomingProfiles,
        allProfiles,
        currentIndex,
        matchedProfile,

        // Actions
        handleSwipe,
        undoSwipe,
        clearMatch,
        refetch,

        // State
        isLoading,
        isError,
        error,
        isFetchingNextPage,
        hasNextPage,
        canUndo: swipeHistory.length > 0,
        isEmpty: !isLoading && allProfiles.length === 0,
        isComplete: !hasNextPage && currentIndex >= allProfiles.length,
    };
}
