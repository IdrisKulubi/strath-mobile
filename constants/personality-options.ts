export interface PersonalityAnswerOption {
    value: string;
    label: string;
    emoji: string;
}

export interface PersonalityQuestionConfig {
    id: string;
    title: string;
    subtitle: string;
    editLabel: string;
    options: PersonalityAnswerOption[];
    multi?: boolean;
}

export const PERSONALITY_QUESTIONS: PersonalityQuestionConfig[] = [
    {
        id: 'sleepSchedule',
        title: 'When do you come alive?',
        subtitle: 'Your natural rhythm',
        editLabel: 'Sleep schedule',
        options: [
            { value: 'night_owl', label: 'Night owl', emoji: '🦉' },
            { value: 'early_bird', label: 'Early bird', emoji: '🐦' },
            { value: 'depends', label: 'Depends on the day', emoji: '☁️' },
        ],
    },
    {
        id: 'socialVibe',
        title: 'Friday night energy?',
        subtitle: 'How you love to unwind',
        editLabel: 'Friday night vibe',
        options: [
            { value: 'party', label: 'Out with people', emoji: '🪩' },
            { value: 'chill_in', label: 'Chill night in', emoji: '🛋️' },
            { value: 'both', label: 'Honestly, both', emoji: '✌️' },
        ],
    },
    {
        id: 'driveStyle',
        title: 'How do you move through life?',
        subtitle: 'Your general approach',
        editLabel: 'Life approach',
        options: [
            { value: 'career_focused', label: 'Career-focused', emoji: '🚀' },
            { value: 'spontaneous', label: 'Spontaneous', emoji: '🎲' },
            { value: 'balanced', label: 'Balanced', emoji: '⚖️' },
        ],
    },
    {
        id: 'convoStyle',
        title: 'Your ideal conversation?',
        subtitle: 'When you really vibe with someone',
        editLabel: 'Conversation style',
        options: [
            { value: 'deep_talks', label: 'Deep talks', emoji: '🌊' },
            { value: 'light_banter', label: 'Light banter', emoji: '😂' },
            { value: 'both', label: 'Mix of both', emoji: '🎭' },
        ],
    },
    {
        id: 'socialBattery',
        title: 'How do you recharge?',
        subtitle: 'Your social energy style',
        editLabel: 'Social battery',
        options: [
            { value: 'introvert', label: 'Solo time', emoji: '🧘' },
            { value: 'ambivert', label: 'Mix it up', emoji: '🌗' },
            { value: 'extrovert', label: 'People energy', emoji: '🌟' },
        ],
    },
    {
        id: 'idealDateVibe',
        title: 'Dream first date?',
        subtitle: 'Helps us set you up right',
        editLabel: 'Ideal first date',
        options: [
            { value: 'coffee', label: 'Coffee chat', emoji: '☕' },
            { value: 'walk', label: 'Walk and talk', emoji: '🚶' },
            { value: 'dinner', label: 'Dinner out', emoji: '🍽️' },
            { value: 'casual_hangout', label: 'Casual hangout', emoji: '🎮' },
        ],
    },
    {
        id: 'musicGenres',
        title: 'What is on your playlist?',
        subtitle: 'Pick every genre that fits',
        editLabel: 'Music genres',
        multi: true,
        options: [
            { value: 'afrobeats', label: 'Afrobeats', emoji: '🥁' },
            { value: 'hiphop', label: 'Hip-Hop', emoji: '🎤' },
            { value: 'rnb', label: 'R&B', emoji: '🎶' },
            { value: 'pop', label: 'Pop', emoji: '🎧' },
            { value: 'indie', label: 'Indie', emoji: '🎸' },
            { value: 'electronic', label: 'Electronic', emoji: '🎛️' },
            { value: 'classical', label: 'Classical', emoji: '🎻' },
            { value: 'gospel', label: 'Gospel', emoji: '🙏' },
        ],
    },
];

export function getPersonalityQuestion(id: string) {
    return PERSONALITY_QUESTIONS.find((question) => question.id === id);
}

export function getPersonalityOptionLabel(questionId: string, value: string) {
    const question = getPersonalityQuestion(questionId);
    return question?.options.find((option) => option.value === value)?.label ?? value;
}
