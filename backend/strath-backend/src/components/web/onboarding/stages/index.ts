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
  course: string;
  yearOfStudy: number | null;
  
  // Stage 4: Photos
  // Handled separately via photoStates
  
  // Stage 5: Lifestyle
  height: string;
  drinkingPreference: string;
  smoking: string;
  religion: string;
  
  // Stage 6: Interests
  interests: string[];
  
  // Stage 7: Bio
  bio: string;
  instagram: string;
  spotify: string;
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
  course: '',
  yearOfStudy: null,
  height: '',
  drinkingPreference: '',
  smoking: '',
  religion: '',
  interests: [],
  bio: '',
  instagram: '',
  spotify: '',
};

// Stage configuration
export const STAGES = [
  { id: 1, title: 'The Basics', subtitle: 'Let\'s start with you' },
  { id: 2, title: 'Your Type', subtitle: 'Who catches your eye?' },
  { id: 3, title: 'Campus Life', subtitle: 'Your academic journey' },
  { id: 4, title: 'Show Yourself', subtitle: 'Add your best photos' },
  { id: 5, title: 'Quick Fire', subtitle: 'A few more things' },
  { id: 6, title: 'Vibes', subtitle: 'What are you into?' },
  { id: 7, title: 'Final Touch', subtitle: 'Tell them about you' },
] as const;

export const TOTAL_STAGES = STAGES.length;
