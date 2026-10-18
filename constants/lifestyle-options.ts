export interface LifestyleAnswerOption {
    value: string;
    label: string;
    emoji: string;
}

export interface LifestyleQuestionConfig {
    id: string;
    title: string;
    subtitle: string;
    editLabel: string;
    options: LifestyleAnswerOption[];
}

export const LIFESTYLE_QUESTIONS: LifestyleQuestionConfig[] = [
    {
        id: 'relationshipGoal',
        title: 'What are you looking for?',
        subtitle: 'Be honest - it helps us match better',
        editLabel: 'Relationship goal',
        options: [
            { value: 'serious', label: 'Something serious', emoji: '💍' },
            { value: 'casual', label: 'Casual and see where it goes', emoji: '🌊' },
            { value: 'open', label: 'Open to anything', emoji: '✨' },
        ],
    },
    {
        id: 'outingFrequency',
        title: 'How often do you go out?',
        subtitle: 'Your average week',
        editLabel: 'Going out frequency',
        options: [
            { value: 'rarely', label: 'Rarely - homebody', emoji: '🏠' },
            { value: '1_2_week', label: '1-2 times a week', emoji: '🚶' },
            { value: '3_plus_week', label: '3+ times a week', emoji: '🎉' },
        ],
    },
];

export function getLifestyleQuestion(id: string) {
    return LIFESTYLE_QUESTIONS.find((question) => question.id === id);
}

export function getLifestyleOptionLabel(questionId: string, value: string) {
    const question = getLifestyleQuestion(questionId);
    return question?.options.find((option) => option.value === value)?.label ?? value;
}
