export interface OnboardingData {
    // Phase 1: ID Card
    firstName: string;
    lastName: string;
    phoneNumber: string;
    university: string;
    course: string;
    yearOfStudy: string;
    age: string;
    gender: 'male' | 'female' | 'other' | '';

    // Phase 2: Profile Essentials
    bio: string;
    lookingFor: string;
    photos: string[];

    // Phase 3: Vibe Check
    interests: string[];

    // Phase 4: Deep Dive (Original)
    zodiacSign: string;
    personalityType: string;
    loveLanguage: string;
    sleepingHabits: string;
    drinkingPreference: string;
    workoutFrequency: string;
    socialMediaUsage: string;
    communicationStyle: string;

    // Phase 4: Qualities (NEW)
    qualities: string[]; // ['humor', 'kindness', 'optimism', 'loyalty', 'sarcasm', etc.]

    // Phase 5: Prompts (NEW)
    prompts: { promptId: string; response: string }[];

    // Phase 6: About Me (NEW)
    aboutMe: string;

    // Phase 7: Know More About Me (NEW)
    height: string;
    education: string;
    smoking: string;
    politics: string;
    religion: string;
    languages: string[];

    // Phase 5/Social: Social Connect (ORIGINAL)
    instagram: string;
    spotify: string;
    snapchat: string;

    // Personality step (new — compatibility vectors)
    personalityAnswers: {
        sleepSchedule?: string;       // 'night_owl' | 'early_bird' | 'depends'
        socialVibe?: string;          // 'party' | 'chill_in' | 'both'
        driveStyle?: string;          // 'career_focused' | 'spontaneous' | 'balanced'
        musicGenres?: string[];       // multi-select
        convoStyle?: string;          // 'deep_talks' | 'light_banter' | 'both'
        socialBattery?: string;       // 'introvert' | 'ambivert' | 'extrovert'
        idealDateVibe?: string;       // 'coffee' | 'walk' | 'dinner' | 'casual_hangout'
    };

    // Lifestyle step (new — compatibility vectors)
    lifestyleAnswers: {
        relationshipGoal?: string;    // 'casual' | 'serious' | 'open'
        outingFrequency?: string;     // 'rarely' | '1_2_week' | '3_plus_week'
        drinks?: string;              // 'yes' | 'no' | 'sometimes'
        smokes?: string;              // 'yes' | 'no' | 'sometimes'
    };

    // Privacy Settings (defaults, not collected in onboarding)
    readReceiptsEnabled: boolean;
    showActiveStatus: boolean;
}

export interface PhaseProps {
    data: OnboardingData;
    updateData: (key: keyof OnboardingData, value: any) => void;
    onNext: () => void;
    onBack: () => void;
    isSubmitting?: boolean;
}
