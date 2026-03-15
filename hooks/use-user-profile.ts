import { useQuery } from '@tanstack/react-query';
import { DailyMatch } from './use-daily-matches';
import { getAuthToken } from '@/lib/auth-helpers';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export interface UserProfileDetail extends DailyMatch {
    bio?: string;
    photos?: string[];
    wingmanQuotes?: { text: string; authorLabel?: string }[];
}

async function fetchUserProfile(userId: string): Promise<UserProfileDetail | null> {
    const token = await getAuthToken();
    if (!token) return null;

    const [profileRes, compatRes, hypeRes] = await Promise.all([
        fetch(`${API_URL}/api/user/${userId}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/matches/compatibility/${userId}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/hype?userId=${userId}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),
    ]);

    if (!profileRes.ok) return null;

    const profileData = await profileRes.json();
    const profile = profileData?.data ?? profileData;

    const compatData = compatRes.ok ? await compatRes.json() : null;
    const compat = compatData?.data ?? { score: 0, reasons: [], requestSent: false };

    const hypeData = hypeRes.ok ? await hypeRes.json() : null;
    const vouches = hypeData?.data?.vouches ?? [];

    const pa = profile?.personalityAnswers as Record<string, unknown> | null;
    const personalityTags: string[] = [];
    if (pa?.sleepSchedule) personalityTags.push(String(pa.sleepSchedule).replace(/_/g, ' '));
    if (pa?.socialBattery) personalityTags.push(String(pa.socialBattery).replace(/_/g, ' '));
    if (pa?.convoStyle) personalityTags.push(String(pa.convoStyle).replace(/_/g, ' '));

    const interests = Array.isArray(profile?.interests) ? profile.interests : [];
    const photos = Array.isArray(profile?.photos) ? profile.photos : [];

    return {
        userId: profile?.userId ?? userId,
        firstName: profile?.firstName ?? profile?.user?.name?.split(' ')[0] ?? 'Unknown',
        age: profile?.age ?? 0,
        profilePhoto: profile?.profilePhoto ?? profile?.user?.profilePhoto ?? profile?.user?.image,
        compatibilityScore: compat?.score ?? 0,
        reasons: compat?.reasons ?? [],
        requestSent: compat?.requestSent ?? false,
        bio: profile?.bio ?? profile?.aboutMe,
        interests,
        personalityTags,
        course: profile?.course,
        university: profile?.university,
        photos,
        wingmanQuotes: vouches.map((v: { content: string; authorName?: string }) => ({
            text: v.content,
            authorLabel: v.authorName,
        })),
    };
}

export function useUserProfile(userId: string) {
    return useQuery({
        queryKey: ['userProfile', userId],
        queryFn: () => fetchUserProfile(userId),
        staleTime: 5 * 60 * 1000,
        enabled: !!userId,
    });
}
