// Types and constants only - stages are imported directly in onboarding-flow.tsx

// Types
export interface OnboardingData {
  // Stage 1: Basic Info
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  age: number | null;
  zodiacSign: string;
  gender: 'male' | 'female' | 'other' | '';
  
  // Stage 2: Looking For
  interestedIn: string[]; // ['male', 'female', 'other']
  lookingFor: string; // 'relationship', 'casual', 'friends', 'notSure'
  
  // Stage 3: Academic
  university: string;
  course: string;
  yearOfStudy: number | null;
  
  // Stage 4: Photos
  // Handled separately via photoStates
  
  // Stage 5: Personality (This or That)
  loveLanguage: string;
  communicationStyle: string;
  sleepingHabits: string;
  socialMediaUsage: string;
  workoutFrequency: string;
  
  // Stage 6: Lifestyle
  height: string;
  drinkingPreference: string;
  smoking: string;
  religion: string;
  
  // Stage 7: Interests
  interests: string[];
  
  // Stage 8: Prompts
  prompts: { promptId: string; response: string }[];
  
  // Stage 9: Socials & Bio
  bio: string;
  instagram: string;
  spotify: string;
  snapchat: string;
  phoneNumber: string;
}

export const INITIAL_DATA: OnboardingData = {
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  age: null,
  zodiacSign: '',
  gender: '',
  interestedIn: [],
  lookingFor: '',
  university: '',
  course: '',
  yearOfStudy: null,
  loveLanguage: '',
  communicationStyle: '',
  sleepingHabits: '',
  socialMediaUsage: '',
  workoutFrequency: '',
  height: '',
  drinkingPreference: '',
  smoking: '',
  religion: '',
  interests: [],
  prompts: [],
  bio: '',
  instagram: '',
  spotify: '',
  snapchat: '',
  phoneNumber: '',
};

// Stage configuration
export const STAGES = [
  { id: 1, title: 'The Basics', subtitle: "Let's start with you", emoji: '👋' },
  { id: 2, title: 'Your Type', subtitle: 'Who catches your eye?', emoji: '💕' },
  { id: 3, title: 'Campus Life', subtitle: 'Your academic journey', emoji: '🎓' },
  { id: 4, title: 'Show Yourself', subtitle: 'Add your best photos', emoji: '📸' },
  { id: 5, title: 'Quick Fire', subtitle: 'Pick your vibe', emoji: '⚡' },
  { id: 6, title: 'Lifestyle', subtitle: 'A few more things', emoji: '🌟' },
  { id: 7, title: 'Interests', subtitle: 'What are you into?', emoji: '🎯' },
  { id: 8, title: 'Prompts', subtitle: 'Stand out from the crowd', emoji: '💬' },
  { id: 9, title: 'Final Touch', subtitle: 'Connect your socials', emoji: '✨' },
] as const;

export const TOTAL_STAGES = STAGES.length;
