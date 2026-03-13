import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface DailyMatch {
    userId: string;
    firstName: string;
    age: number;
    profilePhoto?: string;
    compatibilityScore: number;
    reasons: string[];
    bio?: string;
    interests?: string[];
    personalityTags?: string[];
    course?: string;
    university?: string;
    /** Whether the current user has already sent a date request to this match */
    requestSent?: boolean;
    /** Whether the current user has skipped this match today */
    skipped?: boolean;
}

// ---------------------------------------------------------------------------
// Mock data — replace with real API calls once backend endpoints are live
// ---------------------------------------------------------------------------

const MOCK_DAILY_MATCHES: DailyMatch[] = [
    {
        userId: 'match-user-1',
        firstName: 'Amara',
        age: 22,
        profilePhoto: undefined,
        compatibilityScore: 86,
        reasons: ['Afrobeats', 'Late-night conversations', 'Startup culture'],
        bio: 'CS student who loves building things and good music. Looking for someone to explore the city with.',
        interests: ['Tech', 'Music', 'Art', 'Travel'],
        personalityTags: ['Night owl', 'Ambivert', 'Deep talks'],
        course: 'Computer Science',
        university: 'Strathmore University',
    },
    {
        userId: 'match-user-2',
        firstName: 'Jordan',
        age: 23,
        profilePhoto: undefined,
        compatibilityScore: 79,
        reasons: ['Tech & startups', 'Introvert energy', 'Film lover'],
        bio: 'Finance student by day, film buff by night. Always up for a good conversation over coffee.',
        interests: ['Film', 'Finance', 'Books', 'Gaming'],
        personalityTags: ['Early bird', 'Introvert', 'Light banter'],
        course: 'Finance',
        university: 'Strathmore University',
    },
    {
        userId: 'match-user-3',
        firstName: 'Zara',
        age: 21,
        profilePhoto: undefined,
        compatibilityScore: 74,
        reasons: ['Fitness goals', 'Spontaneous plans', 'Food adventures'],
        bio: 'Marketing student with a passion for fitness and trying new restaurants. Let\'s go on an adventure.',
        interests: ['Fitness', 'Food', 'Travel', 'Fashion'],
        personalityTags: ['Early bird', 'Extrovert', 'Spontaneous'],
        course: 'Marketing',
        university: 'Strathmore University',
    },
    {
        userId: 'match-user-4',
        firstName: 'Kai',
        age: 24,
        profilePhoto: undefined,
        compatibilityScore: 71,
        reasons: ['Creative energy', 'Music taste', 'Chill vibes'],
        bio: 'Design student who loves creating things. Big on music, art, and finding hidden gems in Nairobi.',
        interests: ['Art', 'Music', 'Design', 'Gaming'],
        personalityTags: ['Night owl', 'Ambivert', 'Deep talks'],
        course: 'Design',
        university: 'Strathmore University',
    },
];

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useDailyMatches() {
    return useQuery({
        queryKey: ['matches', 'daily'],
        queryFn: async (): Promise<DailyMatch[]> => {
            // TODO: replace with real API call
            // const token = await getAuthToken();
            // const res = await fetch(`${API_URL}/api/matches/daily`, {
            //   headers: { Authorization: `Bearer ${token}` },
            // });
            // return res.json();
            await new Promise((r) => setTimeout(r, 600));
            return MOCK_DAILY_MATCHES;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes — matches are daily, no need to refetch often
    });
}

export function useSkipMatch() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (userId: string) => {
            // TODO: replace with real API call
            // const token = await getAuthToken();
            // await fetch(`${API_URL}/api/matches/daily/${userId}/skip`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
            await new Promise((r) => setTimeout(r, 200));
            return { userId };
        },
        onSuccess: ({ userId }) => {
            queryClient.setQueryData<DailyMatch[]>(['matches', 'daily'], (prev) =>
                prev ? prev.filter((m) => m.userId !== userId) : prev
            );
        },
    });
}

export function useMarkRequestSent() {
    const queryClient = useQueryClient();
    return (userId: string) => {
        queryClient.setQueryData<DailyMatch[]>(['matches', 'daily'], (prev) =>
            prev
                ? prev.map((m) => (m.userId === userId ? { ...m, requestSent: true } : m))
                : prev
        );
    };
}
