import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAuthToken } from '@/lib/auth-helpers';
import { apiFetch, isApiError, isAuthExpiredError } from '@/lib/api-client';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.strathspace.com';

export interface Profile {
    id: string;
    userId: string;
    bio?: string;
    age?: number;
    gender?: string;
    interests?: string[];
    photos?: string[];
    isVisible?: boolean;
    isComplete?: boolean;
    profileCompleted?: boolean;
    lookingFor?: string;
    course?: string;
    yearOfStudy?: number;
    university?: string;
    instagram?: string;
    spotify?: string;
    snapchat?: string;
    profilePhoto?: string;
    phoneNumber?: string;
    currentLocation?: string;
    locationLatitude?: string;
    locationLongitude?: string;
    locationPermissionStatus?: 'granted' | 'denied' | 'undetermined' | 'unknown';
    locationUpdatedAt?: string | null;
    firstName: string;
    lastName: string;
    drinkingPreference?: string;
    workoutFrequency?: string;
    socialMediaUsage?: string;
    sleepingHabits?: string;
    personalityType?: string;
    communicationStyle?: string;
    loveLanguage?: string;
    zodiacSign?: string;
    visibilityMode?: string;
    anonymous?: boolean;
    anonymousAvatar?: string;
    readReceiptsEnabled?: boolean;
    showActiveStatus?: boolean;
    aiConsentGranted?: boolean;
    aiConsentUpdatedAt?: string | null;
    faceVerificationStatus?: 'not_started' | 'pending_capture' | 'processing' | 'verified' | 'retry_required' | 'manual_review' | 'failed' | 'blocked';
    faceVerifiedAt?: string | null;
    faceVerificationMethod?: string | null;
    faceVerificationVersion?: string | null;
    faceVerificationRequired?: boolean;
    faceVerificationRetryCount?: number;
    // New enhanced profile fields
    qualities?: string[];
    prompts?: { promptId: string; response: string }[];
    aboutMe?: string;
    height?: string;
    education?: string;
    smoking?: string;
    politics?: string;
    religion?: string;
    languages?: string[];
    interestedIn?: string[]; // Genders the user wants to see: ['male', 'female', 'other']
    user?: {
        name: string;
        email: string;
        image?: string;
    };
    // Soft-launch gating — populated by /api/user/me
    waitlist?: {
        status: 'waitlisted';
        position: number;
        peopleAhead: number;
        tier: 'imminent' | 'soon' | 'first_wave' | 'early_access';
    } | null;
    // Returned on PATCH after profileCompleted flips true
    admission?: {
        status: 'admitted' | 'waitlisted';
        position: number | null;
    } | null;
}

async function fetchProfile() {
    console.log('[useProfile] Fetching profile...');

    const finalToken = await getAuthToken();
    console.log('[useProfile] Token:', finalToken ? 'Present' : 'Missing');

    if (!finalToken) {
        console.error('[useProfile] No auth token available');
        throw new Error('Not authenticated');
    }

    console.log('[useProfile] Fetching from:', `${API_URL}/api/user/me`);
    let data: { data?: Profile };
    try {
        data = await apiFetch<{ data?: Profile }>('/api/user/me');
    } catch (error) {
        if (
            isApiError(error) &&
            error.status === 404 &&
            error.message.toLowerCase().includes('profile not found')
        ) {
            console.log('[useProfile] Profile not found; routing to onboarding');
            return null;
        }
        throw error;
    }
    console.log('[useProfile] Data received:', data?.data ? 'Has profile' : 'No profile data');

    // Helper to ensure URLs have protocol
    const normalizeUrl = (url: string) => {
        if (url.startsWith('http')) return url;
        // If it looks like an R2 URL (contains r2.dev or cloudflare), prepend https
        if (url.includes('r2.dev') || url.includes('cloudflare')) {
            return `https://${url}`;
        }
        return url;
    };

    // Normalize URLs in the response
    if (data.data) {
        if (data.data.profilePhoto) {
            data.data.profilePhoto = normalizeUrl(data.data.profilePhoto);
        }
        if (data.data.photos) {
            data.data.photos = data.data.photos.map(normalizeUrl);
        }
    }

    return data.data;
}

async function updateProfile(updates: Partial<Profile>) {
    const data = await apiFetch<{ data: Profile }>('/api/user/me', {
        method: 'PATCH',
        body: updates,
    });
    return data.data;
}

export function useProfile() {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['profile'],
        queryFn: fetchProfile,
        retry: (failureCount, error) => {
            if (isAuthExpiredError(error)) return false;
            if (isApiError(error) && (error.status === 401 || error.status === 404)) return false;
            if (error instanceof Error && error.message === 'Not authenticated') return false;
            return failureCount < 1;
        },
    });

    const mutation = useMutation({
        mutationFn: updateProfile,
        onSuccess: (data) => {
            queryClient.setQueryData(['profile'], data);
            queryClient.invalidateQueries({ queryKey: ['profile'] });
        },
    });

    return {
        ...query,
        updateProfile: mutation.mutate,
        updateProfileAsync: mutation.mutateAsync,
        isUpdating: mutation.isPending,
    };
}
