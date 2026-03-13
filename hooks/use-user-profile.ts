import { useQuery } from '@tanstack/react-query';
import { DailyMatch } from './use-daily-matches';

export interface UserProfileDetail extends DailyMatch {
    bio?: string;
    photos?: string[];
    wingmanQuotes?: { text: string; authorLabel?: string }[];
}

// ---------------------------------------------------------------------------
// Mock data — replace with real API call once backend is live
// ---------------------------------------------------------------------------

const MOCK_PROFILES: Record<string, UserProfileDetail> = {
    'match-user-1': {
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
        photos: [],
        wingmanQuotes: [
            { text: 'The most genuine person I know. She will make you laugh every time.', authorLabel: 'A friend' },
            { text: 'Great listener, even better storyteller.', authorLabel: 'A friend' },
        ],
    },
    'match-user-2': {
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
        photos: [],
        wingmanQuotes: [
            { text: 'Jordan is the most thoughtful person — always knows what to say.', authorLabel: 'A friend' },
        ],
    },
    'match-user-3': {
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
        photos: [],
        wingmanQuotes: [],
    },
    'match-user-4': {
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
        photos: [],
        wingmanQuotes: [
            { text: 'Kai has the best taste in everything — music, food, art. You\'ll love them.', authorLabel: 'A friend' },
        ],
    },
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useUserProfile(userId: string) {
    return useQuery({
        queryKey: ['userProfile', userId],
        queryFn: async (): Promise<UserProfileDetail | null> => {
            // TODO: replace with real API call
            // const token = await getAuthToken();
            // const res = await fetch(`${API_URL}/api/profiles/${userId}`, {
            //   headers: { Authorization: `Bearer ${token}` },
            // });
            // return res.json();
            await new Promise((r) => setTimeout(r, 400));
            return MOCK_PROFILES[userId] ?? null;
        },
        staleTime: 5 * 60 * 1000,
        enabled: !!userId,
    });
}
