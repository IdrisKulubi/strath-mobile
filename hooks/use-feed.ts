import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { getAuthToken } from '@/lib/auth-helpers';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const FeedProfileSchema = z.object({
    id: z.string(),
    userId: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    age: z.number().nullable().optional(),
    bio: z.string().nullable().optional(),
    photos: z.array(z.string()).nullable().optional(),
    interests: z.array(z.string()).nullable().optional(),
    university: z.string().nullable().optional(),
    course: z.string().nullable().optional(),
    yearOfStudy: z.number().nullable().optional(),
    lookingFor: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
});

export type FeedProfile = z.infer<typeof FeedProfileSchema>;

const fetchFeedProfiles = async (): Promise<FeedProfile[]> => {
    const token = await getAuthToken();

    const response = await fetch(`${API_URL}/api/feed`, {
        headers: {
            'Authorization': token ? `Bearer ${token}` : ''
        }
    });

    if (!response.ok) {
        throw new Error('Failed to fetch feed');
    }

    const data = await response.json();

    // Validate data with Zod
    const result = z.array(FeedProfileSchema).safeParse(data);

    if (!result.success) {
        console.error("Feed validation error:", result.error);
        // In production, you might want to filter out invalid items instead of failing completely
        // For now, we'll return the raw data but log the error, or you could throw
        return data as FeedProfile[];
    }

    return result.data;
};

export function useFeed() {
    return useQuery({
        queryKey: ['feed'],
        queryFn: fetchFeedProfiles,
    });
}
