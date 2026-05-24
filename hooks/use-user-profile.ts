import { useQuery } from '@tanstack/react-query';
import { getAuthToken } from '@/lib/auth-helpers';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export interface UserProfileDetail {
    pairId?: string;
    userId: string;
    firstName: string;
    age: number;
    profilePhoto?: string;
    compatibilityScore: number;
    reasons: string[];
    currentUserDecision: 'pending' | 'open_to_meet' | 'passed';
    bio?: string;
    aboutMe?: string;
    interests?: string[];
    personalityTags?: string[];
    photos?: string[];
    wingmanQuotes?: { text: string; authorLabel?: string }[];
    lastName?: string;
    course?: string;
    university?: string;
    yearOfStudy?: number;
    gender?: string;
    lookingFor?: string;
    zodiacSign?: string;
    personalityType?: string;
    loveLanguage?: string;
    sleepingHabits?: string;
    drinkingPreference?: string;
    workoutFrequency?: string;
    socialMediaUsage?: string;
    communicationStyle?: string;
    height?: string;
    education?: string;
    smoking?: string;
    politics?: string;
    religion?: string;
    qualities?: string[];
    prompts?: { promptId: string; response: string }[];
    languages?: string[];
    instagram?: string;
    spotify?: string;
    snapchat?: string;
    personalityAnswers?: {
        sleepSchedule?: string;
        socialVibe?: string;
        driveStyle?: string;
        musicGenres?: string[];
        convoStyle?: string;
        socialBattery?: string;
        idealDateVibe?: string;
    };
    lifestyleAnswers?: {
        relationshipGoal?: string;
        outingFrequency?: string;
        drinks?: string;
        smokes?: string;
    };
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
    const compat = compatData?.data ?? { score: 0, reasons: [], pairId: null, currentUserDecision: 'pending' };

    const hypeData = hypeRes.ok ? await hypeRes.json() : null;
    const vouches = hypeData?.data?.vouches ?? [];

    const pa = profile?.personalityAnswers as Record<string, unknown> | null;
    const personalityTags: string[] = [];
    if (pa?.sleepSchedule) personalityTags.push(String(pa.sleepSchedule).replace(/_/g, ' '));
    if (pa?.socialBattery) personalityTags.push(String(pa.socialBattery).replace(/_/g, ' '));
    if (pa?.convoStyle) personalityTags.push(String(pa.convoStyle).replace(/_/g, ' '));

    const interests = Array.isArray(profile?.interests) ? profile.interests : [];
    const photos = Array.isArray(profile?.photos) ? profile.photos : [];
    const qualities = Array.isArray(profile?.qualities) ? profile.qualities : [];
    const prompts = Array.isArray(profile?.prompts) ? profile.prompts : [];
    const languages = Array.isArray(profile?.languages) ? profile.languages : [];

    return {
        userId: profile?.userId ?? userId,
        firstName: profile?.firstName ?? profile?.user?.name?.split(' ')[0] ?? 'Unknown',
        lastName: profile?.lastName ?? undefined,
        age: profile?.age ?? 0,
        profilePhoto: photos[0] ?? profile?.profilePhoto ?? profile?.user?.profilePhoto ?? profile?.user?.image,
        compatibilityScore: compat?.score ?? 0,
        reasons: compat?.reasons ?? [],
        pairId: compat?.pairId ?? undefined,
        currentUserDecision: compat?.currentUserDecision ?? 'pending',
        bio: profile?.bio ?? profile?.aboutMe,
        aboutMe: profile?.aboutMe,
        interests,
        personalityTags,
        course: profile?.course,
        yearOfStudy: profile?.yearOfStudy,
        university: profile?.university,
        photos,
        gender: profile?.gender,
        lookingFor: profile?.lookingFor,
        zodiacSign: profile?.zodiacSign,
        personalityType: profile?.personalityType,
        loveLanguage: profile?.loveLanguage,
        sleepingHabits: profile?.sleepingHabits,
        drinkingPreference: profile?.drinkingPreference,
        workoutFrequency: profile?.workoutFrequency,
        socialMediaUsage: profile?.socialMediaUsage,
        communicationStyle: profile?.communicationStyle,
        height: profile?.height,
        education: profile?.education,
        smoking: profile?.smoking,
        politics: profile?.politics,
        religion: profile?.religion,
        qualities,
        prompts,
        languages,
        instagram: profile?.instagram,
        spotify: profile?.spotify,
        snapchat: profile?.snapchat,
        personalityAnswers: profile?.personalityAnswers ?? undefined,
        lifestyleAnswers: profile?.lifestyleAnswers ?? undefined,
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
