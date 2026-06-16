export interface InterestOption {
    id: string;
    label: string;
    emoji: string;
}

export const INTEREST_OPTIONS: InterestOption[] = [
    { id: '1', label: 'Music', emoji: '🎵' },
    { id: '2', label: 'Gaming', emoji: '🎮' },
    { id: '3', label: 'Anime', emoji: '✨' },
    { id: '4', label: 'Gym', emoji: '💪' },
    { id: '5', label: 'Travel', emoji: '✈️' },
    { id: '6', label: 'Foodie', emoji: '🍕' },
    { id: '7', label: 'Photography', emoji: '📸' },
    { id: '8', label: 'Art', emoji: '🎨' },
    { id: '9', label: 'Reading', emoji: '📚' },
    { id: '10', label: 'Movies', emoji: '🎬' },
    { id: '11', label: 'Coding', emoji: '💻' },
    { id: '12', label: 'Fashion', emoji: '👗' },
    { id: '13', label: 'Sports', emoji: '⚽' },
    { id: '14', label: 'Cooking', emoji: '👨‍🍳' },
    { id: '15', label: 'Dancing', emoji: '💃' },
    { id: '16', label: 'Hiking', emoji: '🥾' },
    { id: '17', label: 'Pets', emoji: '🐕' },
    { id: '18', label: 'Yoga', emoji: '🧘' },
    { id: '19', label: 'Startups', emoji: '🚀' },
    { id: '20', label: 'Crypto', emoji: '₿' },
    { id: '21', label: 'Tech', emoji: '📱' },
    { id: '22', label: 'Netflix', emoji: '📺' },
    { id: '23', label: 'Coffee', emoji: '☕' },
    { id: '24', label: 'Astrology', emoji: '🔮' },
];

export const INTEREST_MIN_SELECTION = 3;
export const INTEREST_MAX_SELECTION = 10;
