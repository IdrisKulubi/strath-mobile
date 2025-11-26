import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@/lib/auth-client';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

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
    user?: {
        name: string;
        email: string;
        image?: string;
    };
}

async function fetchProfile() {
    const session = await authClient.getSession();
    const token = session?.data?.session?.token;

    // Fallback to SecureStore if token is not in session (though better-auth usually handles this)
    const storedToken = await SecureStore.getItemAsync('strathmobile.session_token');
    const finalToken = token || storedToken;

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };

    if (finalToken) {
        headers['Authorization'] = `Bearer ${finalToken}`;
    }

    const response = await fetch(`${API_URL}/api/user/me`, {
        headers,
    });

    if (!response.ok) {
        throw new Error('Failed to fetch profile');
    }

    const data = await response.json();
    return data.data;
}

async function updateProfile(updates: Partial<Profile>) {
    const session = await authClient.getSession();
    const token = session?.data?.session?.token;
    const storedToken = await SecureStore.getItemAsync('strathmobile.session_token');
    const finalToken = token || storedToken;

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };

    if (finalToken) {
        headers['Authorization'] = `Bearer ${finalToken}`;
    }

    const response = await fetch(`${API_URL}/api/user/me`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(updates),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[updateProfile] Error response:', response.status, errorData);
        throw new Error(errorData.error || 'Failed to update profile');
    }

    const data = await response.json();
    return data.data;
}

export function useProfile() {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['profile'],
        queryFn: fetchProfile,
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
        isUpdating: mutation.isPending,
    };
}
