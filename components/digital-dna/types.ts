export interface OnboardingData {
    // Phase 1: ID Card
    firstName: string;
    lastName: string;
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

    // Phase 4: Deep Dive
    zodiacSign: string;
    personalityType: string;
    loveLanguage: string;
    sleepingHabits: string;
    drinkingPreference: string;
    workoutFrequency: string;
    socialMediaUsage: string;
    communicationStyle: string;

    // Phase 5: Social Connect
    instagram: string;
    spotify: string;
    snapchat: string;

    // Privacy Settings (defaults, not collected in onboarding)
    readReceiptsEnabled: boolean;
    showActiveStatus: boolean;
}

export interface PhaseProps {
    data: OnboardingData;
    updateData: (key: keyof OnboardingData, value: any) => void;
    onNext: () => void;
    onBack: () => void;
}
