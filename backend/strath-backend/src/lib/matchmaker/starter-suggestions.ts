export type MatchmakerStarterContext = {
    seed: string;
    confirmedPreferences?: Array<{
        value: string;
        sentiment: "prefer" | "avoid";
    }>;
    lookingFor?: string | null;
    communicationStyle?: string | null;
    qualities?: string[] | null;
    relationshipGoal?: string | null;
    socialVibe?: string | null;
    idealDateVibe?: string | null;
    traitTags?: string[] | null;
    datingIntentTags?: string[] | null;
    socialEnergyTags?: string[] | null;
    interestTags?: string[] | null;
};

const DISCOVERY_PROMPTS = [
    "Help me discover my type",
    "Surprise me with a thoughtful match",
    "Help me choose what matters most",
    "Show me a different kind of fit",
    "Ask me one question first",
];

const GENERAL_PROMPTS = [
    "Someone emotionally mature",
    "Someone easy to talk to",
    "Someone consistent and intentional",
    "Someone who matches my energy",
    "Someone open to a real connection",
    "Someone with a balanced lifestyle",
];

function humanize(value: string) {
    return value
        .trim()
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .replace(/^(?:i want|looking for|someone who is|someone who|someone)\s+/i, "")
        .trim();
}

function titleCase(value: string) {
    return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function hash(value: string) {
    let result = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        result ^= value.charCodeAt(index);
        result = Math.imul(result, 16777619);
    }
    return result >>> 0;
}

function choose(seed: string, key: string, values: string[]) {
    return values[hash(`${seed}:${key}`) % values.length];
}

function concise(value: string) {
    const normalized = value.trim().replace(/\s+/g, " ");
    return normalized.length <= 64 ? normalized : `${normalized.slice(0, 61).trim()}…`;
}

function preferencePrompt(seed: string, value: string, sentiment: "prefer" | "avoid") {
    const label = humanize(value);
    if (!label) return null;
    if (sentiment === "avoid") {
        return choose(seed, `avoid:${label}`, [
            `Avoid ${label}`,
            `Someone different from ${label}`,
            `${titleCase(label)} is not for me`,
        ]);
    }
    return choose(seed, `prefer:${label}`, [
        `Find someone with ${label}`,
        `Prioritize ${label}`,
        `${titleCase(label)} matters to me`,
    ]);
}

export function buildMatchmakerStarterSuggestions(context: MatchmakerStarterContext) {
    const personalized: string[] = [];
    const add = (value: string | null | undefined) => {
        if (!value) return;
        const cleaned = concise(value);
        if (cleaned && !personalized.some((item) => item.toLowerCase() === cleaned.toLowerCase())) {
            personalized.push(cleaned);
        }
    };

    for (const preference of context.confirmedPreferences ?? []) {
        add(preferencePrompt(context.seed, preference.value, preference.sentiment));
    }

    const relationshipGoal = humanize(context.relationshipGoal ?? context.lookingFor ?? "");
    if (relationshipGoal) add(choose(context.seed, `goal:${relationshipGoal}`, [
        `Someone seeking ${relationshipGoal}`,
        `Match me for ${relationshipGoal}`,
        `${titleCase(relationshipGoal)} is the priority`,
    ]));

    const communication = humanize(context.communicationStyle ?? "");
    if (communication) add(choose(context.seed, `communication:${communication}`, [
        `${titleCase(communication)} communication`,
        `Someone who communicates ${communication}`,
        `Prioritize a ${communication} communicator`,
    ]));

    const socialVibe = humanize(context.socialVibe ?? context.socialEnergyTags?.[0] ?? "");
    if (socialVibe) add(`Someone with ${socialVibe} energy`);

    const idealDate = humanize(context.idealDateVibe ?? "");
    if (idealDate) add(`Someone into ${idealDate} dates`);

    for (const tag of context.traitTags ?? []) add(`Someone ${humanize(tag)}`);
    for (const tag of context.datingIntentTags ?? []) add(`Someone seeking ${humanize(tag)}`);
    for (const tag of context.interestTags ?? []) add(`Someone into ${humanize(tag)}`);
    for (const quality of context.qualities ?? []) add(`Someone who values ${humanize(quality)}`);

    const ranked = personalized
        .map((value) => ({ value, rank: hash(`${context.seed}:personalized:${value}`) }))
        .sort((left, right) => left.rank - right.rank)
        .map((item) => item.value);
    const fallback = [...GENERAL_PROMPTS]
        .map((value) => ({ value, rank: hash(`${context.seed}:general:${value}`) }))
        .sort((left, right) => left.rank - right.rank)
        .map((item) => item.value);
    const discovery = choose(context.seed, "discovery", DISCOVERY_PROMPTS);

    return [...new Set([...ranked, ...fallback])].slice(0, 3).concat(discovery).slice(0, 4);
}
