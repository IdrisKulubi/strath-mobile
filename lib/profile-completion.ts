export interface ProfileCompletionSource {
    firstName?: string;
    lastName?: string;
    bio?: string;
    aboutMe?: string;
    profilePhoto?: string;
    photos?: string[];
    university?: string;
    course?: string;
    yearOfStudy?: number;
    interests?: string[];
    zodiacSign?: string;
    personalityType?: string;
    loveLanguage?: string;
    qualities?: string[];
    prompts?: { promptId: string; response: string }[];
    height?: string;
    education?: string;
    workoutFrequency?: string;
    sleepingHabits?: string;
    drinkingPreference?: string;
    socialMediaUsage?: string;
    smoking?: string;
    lookingFor?: string;
    interestedIn?: string[];
    communicationStyle?: string;
    politics?: string;
    religion?: string;
    languages?: string[];
    instagram?: string;
    spotify?: string;
    snapchat?: string;
}

export type ProfileCompletionTaskId =
    | 'education'
    | 'dating'
    | 'personality'
    | 'lifestyle'
    | 'details'
    | 'socials';

export interface ProfileCompletionTask {
    id: ProfileCompletionTaskId;
    title: string;
    detail: string;
    estimate: string;
}

function hasText(value?: string): boolean {
    return Boolean(value?.trim());
}

function hasItems<T>(value?: T[]): boolean {
    return Boolean(value?.length);
}

export function calculateProfileCompletion(profile?: ProfileCompletionSource | null): number {
    if (!profile) return 0;

    let score = 0;
    if (hasText(profile.firstName) && hasText(profile.lastName)) score += 7;
    if (hasText(profile.bio) || hasText(profile.aboutMe)) score += 7;
    if (hasText(profile.profilePhoto)) score += 6;
    if (hasText(profile.university)) score += 8;
    if (hasText(profile.course) && profile.yearOfStudy != null) score += 7;
    if (hasItems(profile.interests)) score += 5;
    if (hasText(profile.zodiacSign)) score += 3;
    if (hasText(profile.personalityType)) score += 3;
    if (hasText(profile.loveLanguage)) score += 3;
    if (hasItems(profile.photos)) score += 3;
    if (hasItems(profile.qualities)) score += 4;
    if (profile.prompts?.some((prompt) => hasText(prompt.response))) score += 4;
    if (hasText(profile.height)) score += 3;
    if (hasText(profile.education)) score += 3;
    if (hasText(profile.workoutFrequency)) score += 2;
    if (hasText(profile.smoking)) score += 2;
    if (hasText(profile.lookingFor)) score += 3;
    if (hasText(profile.politics)) score += 2;
    if (hasText(profile.religion)) score += 3;
    if (hasItems(profile.languages)) score += 2;
    if (hasText(profile.instagram)) score += 10;
    if (hasText(profile.spotify) || hasText(profile.snapchat)) score += 10;
    return Math.min(score, 100);
}

export function getProfileCompletionTasks(profile: ProfileCompletionSource): ProfileCompletionTask[] {
    const tasks: ProfileCompletionTask[] = [];

    if (!hasText(profile.university) || !hasText(profile.course)) {
        tasks.push({ id: 'education', title: 'Education', detail: 'University and course', estimate: '1 min' });
    }

    if (!hasText(profile.lookingFor) || !hasItems(profile.interestedIn)) {
        tasks.push({
            id: 'dating',
            title: 'Dating preferences',
            detail: 'Goals and who you want to meet',
            estimate: '2 min',
        });
    }

    if (!hasText(profile.personalityType) || !hasText(profile.loveLanguage) || !hasItems(profile.qualities)) {
        tasks.push({
            id: 'personality',
            title: 'Personality',
            detail: 'Love language and qualities',
            estimate: '2 min',
        });
    }

    if (
        !hasText(profile.sleepingHabits) ||
        !hasText(profile.drinkingPreference) ||
        !hasText(profile.workoutFrequency) ||
        !hasText(profile.socialMediaUsage) ||
        !hasText(profile.communicationStyle)
    ) {
        tasks.push({
            id: 'lifestyle',
            title: 'Lifestyle',
            detail: 'Sleep, social life and habits',
            estimate: '2 min',
        });
    }

    if (
        !hasText(profile.height) ||
        !hasText(profile.education) ||
        !hasText(profile.smoking) ||
        !hasText(profile.politics) ||
        !hasText(profile.religion)
    ) {
        tasks.push({
            id: 'details',
            title: 'More about you',
            detail: 'Height, beliefs and habits',
            estimate: '2 min',
        });
    }

    if (!hasText(profile.instagram) && !hasText(profile.spotify) && !hasText(profile.snapchat)) {
        tasks.push({ id: 'socials', title: 'Socials', detail: 'Add one account you use', estimate: '1 min' });
    }

    return tasks;
}
