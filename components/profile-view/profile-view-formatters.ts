export const PROMPT_TITLES: Record<string, string> = {
    unpopular_opinion: 'My most unpopular opinion is...',
    conspiracy: 'A conspiracy theory I low-key believe...',
    guilty_pleasure: 'My guilty pleasure is...',
    pet_peeve: 'My biggest pet peeve is...',
    perfect_sunday: 'My perfect Sunday looks like...',
    life_goal: 'A life goal of mine is...',
    green_flag: 'The biggest green flag in someone is...',
    dealbreaker: 'My dating dealbreaker is...',
    useless_talent: 'My useless talent is...',
    karaoke: 'My go-to karaoke song is...',
    comfort_food: 'My comfort food is...',
    tv_binge: 'I could rewatch __ forever',
    proud_of: "I'm secretly proud of...",
    change_mind: 'Something that changed my mind recently...',
    grateful_for: "I'm most grateful for...",
    teach_me: 'I want someone to teach me...',
    ideal_date: 'My ideal first date is...',
    love_language: 'My love language is...',
    looking_for: "I'm looking for someone who...",
    relationship_rule: 'My non-negotiable in a relationship...',
    campus_spot: 'My favorite spot on campus is...',
    study_hack: 'My best study hack is...',
    class_type: "I'm the type to ____ in class",
};

const DISPLAY_VALUE_LABELS: Record<string, string> = {
    male: 'Male',
    female: 'Female',
    other: 'Other',
    men: 'Men',
    women: 'Women',
    everyone: 'Everyone',
    high_school: 'High School',
    bachelors: "Bachelor's",
    masters: "Master's",
    phd: 'PhD',
    yes: 'Yes',
    no: 'No',
    sometimes: 'Sometimes',
    serious: 'Something serious',
    casual: 'Casual and see where it goes',
    open: 'Open to anything',
    rarely: 'Rarely',
    '1_2_week': '1-2 times a week',
    '3_plus_week': '3+ times a week',
    party: 'Out with people',
    chill_in: 'Chill night in',
    both: 'A bit of both',
    career_focused: 'Career-focused',
    spontaneous: 'Spontaneous',
    balanced: 'Balanced',
    deep_talks: 'Deep talks',
    light_banter: 'Light banter',
    introvert: 'Introvert',
    ambivert: 'Ambivert',
    extrovert: 'Extrovert',
    casual_hangout: 'Casual hangout',
    night_owl: 'Night owl',
    early_bird: 'Early bird',
    afrobeats: 'Afrobeats',
    hiphop: 'Hip-Hop',
    rnb: 'R&B',
};

export type PillValue = string | number | null | undefined;

export type ProfileSectionDefinition = {
    key: string;
    title: string;
    items: string[];
};

export function formatDisplayValue(value?: string | number | null) {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') return String(value);

    const normalized = value.trim();
    if (!normalized) return null;

    return DISPLAY_VALUE_LABELS[normalized]
        ?? normalized.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function cleanPillValue(value?: string | number | null) {
    const formatted = formatDisplayValue(value);
    return formatted?.trim() ? formatted.trim() : null;
}

export function buildProfilePills(items: Array<PillValue | { value: PillValue; format: (value: string) => string | null }>) {
    return items
        .map((item) => {
            if (item && typeof item === 'object' && 'format' in item) {
                const rawValue = cleanPillValue(item.value);
                return rawValue ? item.format(rawValue) : null;
            }

            return cleanPillValue(item as PillValue);
        })
        .filter(Boolean) as string[];
}

export function formatAboutPill(type: 'height' | 'gender' | 'religion' | 'politics', value?: string | null) {
    if (!value) return null;

    const labels: Record<typeof type, string> = {
        height: value,
        gender: value,
        religion: `${value} vibes`,
        politics: `${value} minded`,
    };

    return labels[type];
}

export function formatLookingForPill(type: 'looking_for' | 'relationship_goal' | 'date_vibe', value?: string | null) {
    if (!value) return null;

    const normalized = value.toLowerCase().replace(/\s+/g, '_');

    const labels: Record<typeof type, Record<string, string>> = {
        looking_for: {
            men: 'Open to men',
            women: 'Open to women',
            everyone: 'Open to all genders',
        },
        relationship_goal: {
            serious: 'Here for something serious',
            casual: 'Open to casual vibes',
            open: 'Keeping it open and seeing',
        },
        date_vibe: {
            casual_hangout: 'Likes casual hangout dates',
            chill_in: 'Loves cozy stay-in dates',
            party: 'Down for out-and-about dates',
            both: 'Can do soft plans or loud ones',
        },
    };

    return labels[type][normalized] ?? (type === 'date_vibe' ? `${value} dates` : value);
}

export function formatCampusPill(type: 'course' | 'university' | 'year' | 'education', value?: string | null) {
    if (!value) return null;

    const labels: Record<typeof type, string> = {
        course: value,
        university: value,
        year: value,
        education: value,
    };

    return labels[type];
}

export function formatPersonalityPill(
    type: 'personality_type' | 'love_language' | 'communication' | 'zodiac' | 'sleep' | 'social_vibe' | 'drive' | 'convo' | 'battery',
    value?: string | null
) {
    if (!value) return null;

    const normalized = value.toLowerCase().replace(/\s+/g, '_');

    const labels: Record<typeof type, Record<string, string>> = {
        personality_type: {
            introvert: 'More low-key than loud',
            ambivert: 'Can be social or solo',
            extrovert: 'Brings big social energy',
        },
        love_language: {
            words_of_affirmation: 'Big on reassuring words',
            acts_of_service: 'Shows love through effort',
            quality_time: 'Values real time together',
            physical_touch: 'Affection matters a lot',
            receiving_gifts: 'Loves thoughtful gifts',
        },
        communication: {
            direct: 'Keeps it direct',
            soft: 'Gentle with communication',
            balanced: 'Balanced communicator',
        },
        zodiac: {},
        sleep: {
            night_owl: 'Night owl energy',
            early_bird: 'Up early by choice',
        },
        social_vibe: {
            introvert: 'Recharges in calm spaces',
            extrovert: 'Feeds off people energy',
            ambivert: 'Can switch it up socially',
            both: 'Good with plans or quiet time',
            chill_in: 'Prefers cozy indoor vibes',
            party: 'Loves outside energy',
        },
        drive: {
            spontaneous: 'More spontaneous than scheduled',
            career_focused: 'Locked in on goals',
            balanced: 'Has a good life balance',
        },
        convo: {
            deep_talks: 'Lives for deep conversations',
            light_banter: 'Big on easy banter',
            depends: 'Reads the room first',
            both: 'Can do banter and depth',
        },
        battery: {
            introvert: 'Social battery needs recharge time',
            extrovert: 'Social battery stays charged',
            ambivert: 'Social battery depends on the moment',
            both: 'Can lock in or tap out',
        },
    };

    if (type === 'zodiac') {
        return `${value} sun`;
    }

    return labels[type][normalized] ?? value;
}

export function formatLifestylePill(
    type: 'sleep' | 'drinks' | 'smokes' | 'workout' | 'social_media' | 'outing',
    value?: string | null
) {
    if (!value?.trim()) return null;

    const normalized = value.trim().toLowerCase().replace(/\s+/g, '_');

    const lifestyleLabels: Record<typeof type, Record<string, string>> = {
        sleep: {
            night_owl: 'Late-night energy',
            early_bird: 'Morning person fr',
        },
        drinks: {
            never: "Doesn't drink",
            socially: 'Drinks socially',
            often: 'Enjoys a drink pretty often',
        },
        smokes: {
            never: 'Smoke-free',
            socially: 'Occasionally smokes',
            often: 'Smokes regularly',
        },
        workout: {
            never: 'Not really a gym person',
            rarely: 'Works out once in a while',
            '1_2_week': 'Moves 1-2x a week',
            '3_plus_week': 'Gym consistency is there',
        },
        social_media: {
            low: 'Low-key online',
            medium: 'Online, but not OD',
            heavy: 'Very online',
        },
        outing: {
            rarely: 'Mostly stays in',
            '1_2_week': 'Outside 1-2x a week',
            '3_plus_week': 'Outside pretty often',
            party: 'Outside with the crew',
            chill_in: 'Homebody vibes',
            both: 'Can step out or stay in',
        },
    };

    return lifestyleLabels[type][normalized] ?? formatDisplayValue(value);
}

export function formatLanguagePill(value?: string | null) {
    return value ? `${value} speaker` : null;
}

export function formatSocialPill(type: 'instagram' | 'spotify' | 'snapchat', value?: string | null) {
    if (!value) return null;

    const labels: Record<typeof type, string> = {
        instagram: `IG @${value}`,
        spotify: `Spotify ${value}`,
        snapchat: `Snap @${value}`,
    };

    return labels[type];
}

export function normalizeHandle(value?: string | null) {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed.replace(/^@+/, '');
}
