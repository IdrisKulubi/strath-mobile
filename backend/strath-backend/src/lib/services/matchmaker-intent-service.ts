import { requestProfileTextEmbedding } from "@/lib/services/profile-intelligence-worker-client";

export type MatchmakerParsedIntent = {
    rawText: string;
    normalizedText: string;
    semanticQuery: string;
    keywords: string[];
    traits: string[];
    activeToday: boolean;
    seriousIntent: boolean;
    maxDormantDays: number | null;
};

const STOP_WORDS = new Set([
    "a",
    "an",
    "and",
    "are",
    "be",
    "for",
    "i",
    "me",
    "of",
    "or",
    "someone",
    "that",
    "the",
    "to",
    "want",
    "who",
    "with",
]);

const TRAIT_SYNONYMS: Array<{ trait: string; terms: string[] }> = [
    { trait: "calm", terms: ["calm", "chill", "quiet", "peaceful", "gentle"] },
    { trait: "serious", terms: ["serious", "intentional", "committed", "relationship", "long-term"] },
    { trait: "active", terms: ["active", "online", "today", "available", "responsive"] },
    { trait: "ambitious", terms: ["ambitious", "driven", "focused", "career", "study"] },
    { trait: "creative", terms: ["creative", "music", "art", "fashion", "design"] },
    { trait: "social", terms: ["social", "outgoing", "fun", "party", "extrovert"] },
    { trait: "faith", terms: ["faith", "religious", "christian", "muslim", "spiritual"] },
    { trait: "fitness", terms: ["gym", "fitness", "workout", "sport", "athletic"] },
];

function normalizeText(value: string) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function unique<T>(values: T[]) {
    return [...new Set(values)];
}

export function parseMatchmakerIntent(rawText: string): MatchmakerParsedIntent {
    const normalizedText = normalizeText(rawText).slice(0, 500);
    const tokens = normalizedText
        .split(" ")
        .map((token) => token.trim())
        .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
    const traits = TRAIT_SYNONYMS
        .filter(({ terms }) => terms.some((term) => normalizedText.includes(term)))
        .map(({ trait }) => trait);
    const activeToday = /\b(active|online|available|today|now|responsive)\b/.test(normalizedText);
    const seriousIntent = /\b(serious|intentional|committed|relationship|long-term|marriage)\b/.test(normalizedText);
    const maxDormantDays = activeToday ? 7 : null;

    return {
        rawText,
        normalizedText,
        semanticQuery: normalizedText || rawText.trim(),
        keywords: unique([...traits, ...tokens]).slice(0, 18),
        traits: unique(traits),
        activeToday,
        seriousIntent,
        maxDormantDays,
    };
}

export async function embedMatchmakerIntent(intent: MatchmakerParsedIntent) {
    const response = await requestProfileTextEmbedding(intent.semanticQuery);
    return response?.embedding ?? null;
}
