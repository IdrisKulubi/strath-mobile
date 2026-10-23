import { profiles } from "@/db/schema";

type ProfileRow = typeof profiles.$inferSelect;

export interface MatchScoreBreakdown {
    score: number;
    reasons: string[];
    components: {
        interests: number;
        personality: number;
        lifestyle: number;
        communication: number;
        relationshipIntent: number;
        values: number;
        campusContext: number;
        activity: number;
        profileQuality: number;
    };
}

type MinimalProfile = Pick<
    ProfileRow,
    | "userId"
    | "age"
    | "bio"
    | "aboutMe"
    | "interests"
    | "qualities"
    | "languages"
    | "lookingFor"
    | "course"
    | "yearOfStudy"
    | "university"
    | "personalityType"
    | "personalitySummary"
    | "communicationStyle"
    | "loveLanguage"
    | "prompts"
    | "lastActive"
    | "profileCompleted"
    | "photos"
    | "profilePhoto"
    | "personalityAnswers"
    | "lifestyleAnswers"
>;

// Core compatibility weights. Activity and profile quality are folded into a
// freshness multiplier, not weighted components, so we keep them at 0 in the
// weight table (they remain in `components` output for UI breakdowns).
const COMPONENT_WEIGHTS = {
    interests: 0.18,
    personality: 0.2,
    lifestyle: 0.16,
    communication: 0.1,
    relationshipIntent: 0.16,
    values: 0.05,
    campusContext: 0.1,
    activity: 0,
    profileQuality: 0,
} as const;

// Gentle baseline used by most sub-scores when both sides have some signal —
// the old engine used 35 which made typical couples land in the 50s.
const DEFAULT_NEUTRAL_SCORE = 60;
const DEFAULT_SINGLE_SIDED_SCORE = 55;

const PERSONALITY_LABELS: Record<string, string> = {
    sleepSchedule: "Similar sleep rhythm",
    socialVibe: "Similar social energy",
    convoStyle: "Compatible conversation style",
    socialBattery: "Similar social battery",
    idealDateVibe: "Same ideal first date vibe",
    driveStyle: "Similar pace and spontaneity",
};

const LIFESTYLE_LABELS: Record<string, string> = {
    relationshipGoal: "Aligned relationship goals",
    outingFrequency: "Similar social frequency",
    drinks: "Compatible drinking preference",
    smokes: "Compatible smoking preference",
};

const NORMALIZED_TEXT_STOPWORDS = new Set([
    "the", "and", "for", "with", "that", "this", "from", "have", "just", "want", "looking",
    "someone", "into", "your", "about", "their", "they", "them", "very", "really", "like",
    "love", "enjoy", "people", "person", "things", "stuff", "good", "great", "nice", "also",
    "more", "much", "some", "something", "anything", "always", "never", "would", "could",
]);

// Canonical-token synonym map for interests / qualities / languages. Variants
// are lowercased phrases; canonical tokens drive overlap detection so that
// "listening to music", "music lover", "musician" all collapse to "music".
const INTEREST_SYNONYMS: Record<string, string[]> = {
    music: ["music", "musical", "musician", "listening to music", "music lover", "singing", "songs", "spotify"],
    film: ["film", "films", "movies", "movie", "cinema", "netflix", "series", "shows", "tv"],
    gym: ["gym", "fitness", "working out", "work out", "workout", "weights", "lifting", "bodybuilding"],
    running: ["running", "runner", "jogging", "marathon"],
    hiking: ["hiking", "hike", "trekking", "trail", "trails", "mountains"],
    reading: ["reading", "read", "books", "book", "novels", "literature", "bookworm"],
    writing: ["writing", "writer", "poetry", "poems", "journaling"],
    coffee: ["coffee", "cafes", "cafe", "espresso", "latte", "coffee dates"],
    tea: ["tea", "chai"],
    cooking: ["cooking", "cook", "baking", "bake", "foodie", "food", "recipes"],
    travel: ["travel", "travelling", "traveling", "traveler", "wanderlust", "road trips", "adventure"],
    art: ["art", "arts", "painting", "paint", "drawing", "sketching", "design", "illustration"],
    photography: ["photography", "photo", "photos", "photographer"],
    dance: ["dance", "dancing", "dancer", "choreography"],
    gaming: ["gaming", "games", "gamer", "video games", "console", "playstation", "xbox"],
    coding: ["coding", "code", "programming", "developer", "tech", "software", "engineering"],
    startups: ["startups", "startup", "entrepreneurship", "entrepreneur", "business", "founder"],
    faith: ["faith", "christian", "christianity", "muslim", "islam", "church", "mosque", "spiritual", "god"],
    fashion: ["fashion", "style", "styling", "outfits", "thrift", "thrifting"],
    football: ["football", "soccer", "fifa"],
    basketball: ["basketball", "nba", "hoops"],
    rugby: ["rugby"],
    swimming: ["swimming", "swim", "swimmer", "beach"],
    cycling: ["cycling", "cycle", "biking", "bike", "bikes"],
    yoga: ["yoga", "pilates", "meditation", "mindfulness"],
    animals: ["animals", "pets", "dogs", "dog", "cats", "cat", "animal lover"],
    nature: ["nature", "outdoors", "outdoor", "camping", "picnic", "picnics"],
    volunteering: ["volunteering", "volunteer", "community service", "charity", "ngo", "impact"],
    politics: ["politics", "debate", "debates", "activism", "activist"],
    languages: ["languages", "language", "linguistics", "polyglot"],
    chess: ["chess"],
    anime: ["anime", "manga", "otaku"],
    podcasts: ["podcasts", "podcast"],
    partying: ["partying", "party", "clubbing", "club", "nightlife"],
    studying: ["studying", "study", "academics", "learning", "student life"],
    ambition: ["ambition", "ambitious", "driven", "motivated", "hustle", "grind"],
    kindness: ["kindness", "kind", "caring", "compassion", "compassionate", "empathy", "empathetic"],
    humor: ["humor", "humour", "funny", "jokes", "laughter", "witty"],
    loyalty: ["loyalty", "loyal", "trust", "trustworthy"],
    honesty: ["honesty", "honest", "authentic", "authenticity", "genuine"],
    adventurous: ["adventurous", "adventure", "bold", "spontaneous"],
    chill: ["chill", "relaxed", "calm", "easygoing", "laid back", "laidback"],
    creative: ["creative", "creativity", "imaginative"],
    intellectual: ["intellectual", "deep conversations", "deep talks", "thinker", "philosophy", "philosophical"],
};

const SYNONYM_LOOKUP: Map<string, string> = (() => {
    const map = new Map<string, string>();
    for (const [canonical, variants] of Object.entries(INTEREST_SYNONYMS)) {
        map.set(canonical, canonical);
        for (const variant of variants) {
            map.set(normalizeText(variant), canonical);
        }
    }
    return map;
})();

function normalizeText(value: string | null | undefined): string {
    return (value ?? "")
        .toLowerCase()
        .replace(/[\u{1F300}-\u{1FAFF}]/gu, " ")
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Apply light stemming so "running", "runner" collapse to the same token.
 * Conservative rules — we avoid aggressive Porter-style stemming because it
 * over-conflates short tokens.
 */
function stemToken(token: string): string {
    if (token.length <= 4) return token;
    if (token.endsWith("ing") && token.length > 5) return token.slice(0, -3);
    if (token.endsWith("ers") && token.length > 5) return token.slice(0, -3);
    if (token.endsWith("er") && token.length > 4) return token.slice(0, -2);
    if (token.endsWith("ies") && token.length > 5) return token.slice(0, -3) + "y";
    if (token.endsWith("es") && token.length > 4) return token.slice(0, -2);
    if (token.endsWith("s") && token.length > 4 && !token.endsWith("ss")) return token.slice(0, -1);
    return token;
}

function canonicalizeToken(token: string): string {
    const direct = SYNONYM_LOOKUP.get(token);
    if (direct) return direct;
    const stemmed = stemToken(token);
    const stemmedHit = SYNONYM_LOOKUP.get(stemmed);
    if (stemmedHit) return stemmedHit;
    return stemmed;
}

function toTokenSet(values: string[] | null | undefined): Set<string> {
    if (!Array.isArray(values)) return new Set();
    const out = new Set<string>();
    for (const raw of values) {
        const normalized = normalizeText(raw);
        if (!normalized) continue;
        const phraseHit = SYNONYM_LOOKUP.get(normalized);
        if (phraseHit) {
            out.add(phraseHit);
            continue;
        }
        for (const token of normalized.split(" ")) {
            if (!token || token.length < 3) continue;
            if (NORMALIZED_TEXT_STOPWORDS.has(token)) continue;
            out.add(canonicalizeToken(token));
        }
    }
    return out;
}

/**
 * Similarity in 0–100 space, combining Dice coefficient and coverage so that
 * partial-but-meaningful overlaps (e.g. 3/6 shared interests) land in the 70s
 * instead of the low-50s that strict Jaccard produced.
 */
function similarityScore(left: Set<string>, right: Set<string>): number {
    if (left.size === 0 && right.size === 0) return DEFAULT_NEUTRAL_SCORE;
    if (left.size === 0 || right.size === 0) return DEFAULT_SINGLE_SIDED_SCORE;

    let overlap = 0;
    for (const token of left) {
        if (right.has(token)) overlap++;
    }

    const dice = (2 * overlap) / (left.size + right.size);
    const coverage = overlap / Math.min(left.size, right.size);
    return Math.round(55 + (0.55 * dice + 0.45 * coverage) * 45);
}

function collectProfileKeywords(profile: MinimalProfile): Set<string> {
    const promptTokens = Array.isArray(profile.prompts)
        ? profile.prompts.flatMap((prompt) => normalizeText(prompt.response).split(" "))
        : [];

    const baseTokens = [
        normalizeText(profile.bio),
        normalizeText(profile.aboutMe),
        normalizeText(profile.personalitySummary),
        normalizeText(profile.lookingFor),
        normalizeText(profile.personalityType),
        normalizeText(profile.communicationStyle),
        normalizeText(profile.loveLanguage),
    ]
        .flatMap((value) => value.split(" "))
        .filter(Boolean);

    return new Set(
        [...baseTokens, ...promptTokens]
            .filter((token) => token.length > 2)
            .filter((token) => !NORMALIZED_TEXT_STOPWORDS.has(token))
            .map((token) => canonicalizeToken(token)),
    );
}

function scoreInterests(me: MinimalProfile, them: MinimalProfile): { score: number; reasons: string[] } {
    const myInterests = toTokenSet(me.interests);
    const theirInterests = toTokenSet(them.interests);
    const myQualities = toTokenSet(me.qualities);
    const theirQualities = toTokenSet(them.qualities);
    const myLanguages = toTokenSet(me.languages);
    const theirLanguages = toTokenSet(them.languages);

    const interestScore = similarityScore(myInterests, theirInterests);
    const qualityScore = similarityScore(myQualities, theirQualities);
    const languageScore = similarityScore(myLanguages, theirLanguages);

    const sharedInterests = [...myInterests].filter((token) => theirInterests.has(token)).slice(0, 2);
    const sharedQualities = [...myQualities].filter((token) => theirQualities.has(token)).slice(0, 1);
    const sharedLanguages = [...myLanguages].filter((token) => theirLanguages.has(token)).slice(0, 1);

    const reasons = [
        ...sharedInterests.map((interest) => `Shared interest in ${interest}`),
        ...sharedQualities.map((quality) => `Both value ${quality}`),
        ...sharedLanguages.map((language) => `Both speak ${language}`),
    ];

    const score = Math.round(interestScore * 0.65 + qualityScore * 0.2 + languageScore * 0.15);
    return { score, reasons };
}

// Compatibility tables keyed by normalized answer value. Values are graded
// 0..1: 1 = identical vibe, 0.85+ = practically the same, 0.6 = workable,
// 0.3 = tense, 0 = hard incompatibility. Missing entries fall through to 0.35.
type CompatibilityTable = Record<string, Record<string, number>>;

const PERSONALITY_COMPATIBILITY: Record<string, CompatibilityTable> = {
    sleepSchedule: {
        early_bird: { early_bird: 1, morning_person: 0.95, flexible: 0.75, balanced: 0.7, late_riser: 0.4, night_owl: 0.35 },
        morning_person: { early_bird: 0.95, morning_person: 1, flexible: 0.75, balanced: 0.7, late_riser: 0.4, night_owl: 0.35 },
        night_owl: { night_owl: 1, late_riser: 0.9, flexible: 0.75, balanced: 0.7, morning_person: 0.35, early_bird: 0.3 },
        late_riser: { late_riser: 1, night_owl: 0.9, flexible: 0.75, balanced: 0.7, morning_person: 0.4, early_bird: 0.4 },
        flexible: { flexible: 1, balanced: 0.9, early_bird: 0.75, morning_person: 0.75, night_owl: 0.75, late_riser: 0.75 },
        balanced: { balanced: 1, flexible: 0.9, early_bird: 0.7, morning_person: 0.7, night_owl: 0.7, late_riser: 0.7 },
    },
    socialVibe: {
        introvert: { introvert: 1, ambivert: 0.85, balanced: 0.75, extrovert: 0.45 },
        extrovert: { extrovert: 1, ambivert: 0.85, balanced: 0.75, introvert: 0.45 },
        ambivert: { ambivert: 1, introvert: 0.85, extrovert: 0.85, balanced: 0.9 },
        balanced: { balanced: 1, ambivert: 0.9, introvert: 0.75, extrovert: 0.75 },
    },
    socialBattery: {
        introvert: { introvert: 1, ambivert: 0.85, extrovert: 0.5 },
        extrovert: { extrovert: 1, ambivert: 0.85, introvert: 0.5 },
        ambivert: { ambivert: 1, introvert: 0.85, extrovert: 0.85 },
    },
    convoStyle: {
        deep_talks: { deep_talks: 1, thoughtful: 0.85, mixed: 0.8, both: 0.8, playful: 0.6, light: 0.45 },
        playful: { playful: 1, light: 0.9, mixed: 0.8, both: 0.8, thoughtful: 0.55, deep_talks: 0.6 },
        light: { light: 1, playful: 0.9, mixed: 0.8, both: 0.8, deep_talks: 0.45, thoughtful: 0.55 },
        mixed: { mixed: 1, both: 0.95, deep_talks: 0.8, playful: 0.8, light: 0.8, thoughtful: 0.8 },
        both: { both: 1, mixed: 0.95, deep_talks: 0.8, playful: 0.8, light: 0.8, thoughtful: 0.8 },
        thoughtful: { thoughtful: 1, deep_talks: 0.85, mixed: 0.8, both: 0.8, playful: 0.55, light: 0.55 },
    },
    idealDateVibe: {
        coffee_and_walk: { coffee_and_walk: 1, chill: 0.9, quiet: 0.85, adventurous: 0.65, party: 0.45 },
        chill: { chill: 1, coffee_and_walk: 0.9, quiet: 0.85, adventurous: 0.65, party: 0.55 },
        adventurous: { adventurous: 1, active: 0.9, chill: 0.65, coffee_and_walk: 0.65, party: 0.75 },
        active: { active: 1, adventurous: 0.9, chill: 0.7, party: 0.7 },
        party: { party: 1, adventurous: 0.75, active: 0.7, chill: 0.55, coffee_and_walk: 0.45 },
        quiet: { quiet: 1, chill: 0.85, coffee_and_walk: 0.85, party: 0.4 },
    },
    driveStyle: {
        spontaneous: { spontaneous: 1, flexible: 0.85, balanced: 0.75, planned: 0.5, structured: 0.45 },
        planned: { planned: 1, structured: 0.95, balanced: 0.75, flexible: 0.65, spontaneous: 0.5 },
        structured: { structured: 1, planned: 0.95, balanced: 0.75, flexible: 0.6, spontaneous: 0.45 },
        balanced: { balanced: 1, flexible: 0.9, spontaneous: 0.75, planned: 0.75, structured: 0.75 },
        flexible: { flexible: 1, balanced: 0.9, spontaneous: 0.85, planned: 0.65, structured: 0.6 },
    },
};

const LIFESTYLE_COMPATIBILITY: Record<string, CompatibilityTable> = {
    relationshipGoal: {
        serious_relationship: {
            serious_relationship: 1, long_term: 0.95, relationship: 0.9, marriage: 0.9,
            exploring: 0.55, not_sure: 0.5, casual: 0.2, friends: 0.15,
        },
        long_term: {
            long_term: 1, serious_relationship: 0.95, relationship: 0.9, marriage: 0.9,
            exploring: 0.6, not_sure: 0.5, casual: 0.2, friends: 0.15,
        },
        relationship: {
            relationship: 1, serious_relationship: 0.9, long_term: 0.9, marriage: 0.85,
            exploring: 0.7, not_sure: 0.55, casual: 0.35, friends: 0.25,
        },
        marriage: {
            marriage: 1, serious_relationship: 0.9, long_term: 0.9, relationship: 0.85,
            exploring: 0.45, not_sure: 0.4, casual: 0.1, friends: 0.1,
        },
        casual: {
            casual: 1, exploring: 0.85, not_sure: 0.7, friends: 0.6,
            relationship: 0.35, long_term: 0.2, serious_relationship: 0.2, marriage: 0.1,
        },
        exploring: {
            exploring: 1, not_sure: 0.9, casual: 0.85, relationship: 0.7,
            long_term: 0.6, serious_relationship: 0.55, marriage: 0.45, friends: 0.7,
        },
        not_sure: {
            not_sure: 1, exploring: 0.9, casual: 0.7, relationship: 0.6,
            long_term: 0.5, serious_relationship: 0.5, marriage: 0.4, friends: 0.6,
        },
        friends: {
            friends: 1, exploring: 0.7, casual: 0.6, not_sure: 0.6,
            relationship: 0.3, long_term: 0.2, serious_relationship: 0.2, marriage: 0.1,
        },
    },
    outingFrequency: {
        never: { never: 1, rarely: 0.85, sometimes: 0.6, often: 0.35, always: 0.2 },
        rarely: { rarely: 1, never: 0.85, sometimes: 0.8, often: 0.55, always: 0.35 },
        sometimes: { sometimes: 1, often: 0.85, rarely: 0.8, never: 0.6, always: 0.7 },
        often: { often: 1, sometimes: 0.85, always: 0.9, rarely: 0.55, never: 0.35 },
        always: { always: 1, often: 0.9, sometimes: 0.7, rarely: 0.35, never: 0.2 },
    },
    drinks: {
        no: { no: 1, never: 1, rarely: 0.8, socially: 0.55, sometimes: 0.5, often: 0.25, yes: 0.3 },
        never: { never: 1, no: 1, rarely: 0.8, socially: 0.55, sometimes: 0.5, often: 0.25, yes: 0.3 },
        rarely: { rarely: 1, no: 0.8, never: 0.8, socially: 0.85, sometimes: 0.85, often: 0.55, yes: 0.6 },
        socially: { socially: 1, sometimes: 0.95, rarely: 0.85, often: 0.75, no: 0.55, never: 0.55, yes: 0.85 },
        sometimes: { sometimes: 1, socially: 0.95, rarely: 0.85, often: 0.8, no: 0.5, never: 0.5, yes: 0.85 },
        often: { often: 1, yes: 0.95, socially: 0.75, sometimes: 0.8, rarely: 0.55, no: 0.25, never: 0.25 },
        yes: { yes: 1, often: 0.95, socially: 0.85, sometimes: 0.85, rarely: 0.6, no: 0.3, never: 0.3 },
    },
    smokes: {
        no: { no: 1, never: 1, rarely: 0.65, socially: 0.45, sometimes: 0.4, often: 0.15, yes: 0.2 },
        never: { never: 1, no: 1, rarely: 0.65, socially: 0.45, sometimes: 0.4, often: 0.15, yes: 0.2 },
        rarely: { rarely: 1, no: 0.65, never: 0.65, socially: 0.85, sometimes: 0.85, often: 0.6, yes: 0.6 },
        socially: { socially: 1, sometimes: 0.95, rarely: 0.85, often: 0.8, no: 0.45, never: 0.45, yes: 0.85 },
        sometimes: { sometimes: 1, socially: 0.95, rarely: 0.85, often: 0.8, no: 0.4, never: 0.4, yes: 0.85 },
        often: { often: 1, yes: 0.95, socially: 0.8, sometimes: 0.8, rarely: 0.6, no: 0.15, never: 0.15 },
        yes: { yes: 1, often: 0.95, socially: 0.85, sometimes: 0.85, rarely: 0.6, no: 0.2, never: 0.2 },
    },
};

function normalizeAnswerKey(value: unknown): string {
    return normalizeText(String(value ?? ""))
        .replace(/\s+/g, "_");
}

function compatibilityFor(field: string, mine: string, theirs: string, table: Record<string, CompatibilityTable>): number {
    if (!mine || !theirs) return 0;
    if (mine === theirs) return 1;
    const fieldTable = table[field];
    if (!fieldTable) return mine === theirs ? 1 : 0.35;
    const row = fieldTable[mine];
    if (!row) return 0.35;
    const score = row[theirs];
    if (typeof score === "number") return score;
    return 0.35;
}

function scoreStructuredAnswers(
    myAnswers: Record<string, unknown> | null | undefined,
    theirAnswers: Record<string, unknown> | null | undefined,
    labels: Record<string, string>,
    table: Record<string, CompatibilityTable>,
): { score: number; reasons: string[] } {
    const mine = myAnswers ?? {};
    const theirs = theirAnswers ?? {};
    const reasons: string[] = [];
    let compatSum = 0;
    let comparable = 0;

    for (const [key, label] of Object.entries(labels)) {
        const myRaw = mine[key];
        const theirRaw = theirs[key];
        if (!myRaw || !theirRaw) continue;

        const myValue = normalizeAnswerKey(myRaw);
        const theirValue = normalizeAnswerKey(theirRaw);
        if (!myValue || !theirValue) continue;

        comparable++;
        const compat = compatibilityFor(key, myValue, theirValue, table);
        compatSum += compat;
        if (compat >= 0.8) {
            reasons.push(label);
        }
    }

    if (comparable === 0) {
        return { score: DEFAULT_NEUTRAL_SCORE, reasons: [] };
    }

    const ratio = compatSum / comparable;
    return {
        score: Math.round(60 + ratio * 40),
        reasons: reasons.slice(0, 3),
    };
}

function scoreCommunication(me: MinimalProfile, them: MinimalProfile): { score: number; reasons: string[] } {
    let score = 65;
    const reasons: string[] = [];

    const myStyle = normalizeText(me.communicationStyle);
    const theirStyle = normalizeText(them.communicationStyle);
    if (myStyle && theirStyle) {
        if (myStyle === theirStyle) {
            score += 22;
            reasons.push("Matching communication style");
        } else if (myStyle === "both" || theirStyle === "both" || myStyle === "flexible" || theirStyle === "flexible") {
            score += 14;
            reasons.push("Flexible communication match");
        } else {
            score -= 4;
        }
    }

    const myLoveLanguage = normalizeText(me.loveLanguage);
    const theirLoveLanguage = normalizeText(them.loveLanguage);
    if (myLoveLanguage && theirLoveLanguage) {
        if (myLoveLanguage === theirLoveLanguage) {
            score += 18;
            reasons.push(`Shared love language: ${myLoveLanguage}`);
        } else {
            score += 6;
        }
    }

    return {
        score: Math.max(0, Math.min(100, Math.round(score))),
        reasons: reasons.slice(0, 2),
    };
}

// Normalized intent buckets used by the 2D compatibility map. Free-text intents
// like "serious relationship" or "just exploring" are mapped into these buckets
// before lookup so we handle inconsistent user phrasing.
type IntentBucket =
    | "serious"
    | "long_term"
    | "relationship"
    | "marriage"
    | "exploring"
    | "casual"
    | "friends"
    | "not_sure";

const INTENT_BUCKET_KEYWORDS: Array<{ bucket: IntentBucket; keywords: string[] }> = [
    { bucket: "marriage", keywords: ["marriage", "marry", "wife", "husband"] },
    { bucket: "long_term", keywords: ["long term", "long-term", "longterm"] },
    { bucket: "serious", keywords: ["serious"] },
    { bucket: "relationship", keywords: ["relationship", "partner", "committed", "commitment"] },
    { bucket: "friends", keywords: ["friend", "friends", "friendship"] },
    { bucket: "casual", keywords: ["casual", "fling", "fun", "flings"] },
    { bucket: "exploring", keywords: ["explore", "exploring", "open", "see where"] },
    { bucket: "not_sure", keywords: ["not sure", "idk", "dont know", "undecided", "whatever"] },
];

const INTENT_COMPATIBILITY: Record<IntentBucket, Record<IntentBucket, number>> = {
    serious: { serious: 100, long_term: 96, relationship: 92, marriage: 92, exploring: 62, not_sure: 55, casual: 25, friends: 25 },
    long_term: { long_term: 100, serious: 96, relationship: 92, marriage: 92, exploring: 64, not_sure: 55, casual: 25, friends: 25 },
    relationship: { relationship: 100, serious: 92, long_term: 92, marriage: 88, exploring: 72, not_sure: 60, casual: 45, friends: 35 },
    marriage: { marriage: 100, serious: 92, long_term: 92, relationship: 88, exploring: 52, not_sure: 48, casual: 20, friends: 20 },
    exploring: { exploring: 100, not_sure: 92, casual: 85, relationship: 72, long_term: 64, serious: 62, marriage: 52, friends: 72 },
    casual: { casual: 100, exploring: 85, not_sure: 70, friends: 60, relationship: 45, long_term: 25, serious: 25, marriage: 20 },
    friends: { friends: 100, exploring: 72, casual: 60, not_sure: 60, relationship: 35, long_term: 25, serious: 25, marriage: 20 },
    not_sure: { not_sure: 100, exploring: 92, casual: 70, relationship: 60, long_term: 55, serious: 55, marriage: 48, friends: 60 },
};

function classifyIntent(value: string | null | undefined): IntentBucket | null {
    const text = normalizeText(value);
    if (!text) return null;
    for (const { bucket, keywords } of INTENT_BUCKET_KEYWORDS) {
        for (const keyword of keywords) {
            if (text.includes(keyword)) return bucket;
        }
    }
    return null;
}

function scoreRelationshipIntent(me: MinimalProfile, them: MinimalProfile): { score: number; reasons: string[] } {
    const myBucket = classifyIntent(me.lookingFor);
    const theirBucket = classifyIntent(them.lookingFor);

    if (!myBucket || !theirBucket) {
        // Fall back to generous baseline when one side hasn't expressed intent
        // rather than the old 25 cliff, but reward token overlap when present.
        const myText = normalizeText(me.lookingFor);
        const theirText = normalizeText(them.lookingFor);
        if (myText && theirText && myText === theirText) {
            return { score: 100, reasons: ["Aligned relationship goals"] };
        }
        if (myText && theirText) {
            const myTokens = new Set(myText.split(" ").filter(Boolean));
            const theirTokens = new Set(theirText.split(" ").filter(Boolean));
            const overlap = [...myTokens].filter((token) => theirTokens.has(token));
            if (overlap.length > 0) {
                return { score: 78, reasons: ["Similar relationship goals"] };
            }
        }
        return { score: 70, reasons: [] };
    }

    const score = INTENT_COMPATIBILITY[myBucket]?.[theirBucket] ?? 55;
    const reasons: string[] = [];
    if (score >= 90) reasons.push("Aligned relationship goals");
    else if (score >= 75) reasons.push("Similar relationship goals");
    return { score, reasons };
}

function scoreValues(me: MinimalProfile, them: MinimalProfile): { score: number; reasons: string[] } {
    const myKeywords = collectProfileKeywords(me);
    const theirKeywords = collectProfileKeywords(them);
    const overlap = [...myKeywords].filter((token) => theirKeywords.has(token));
    return {
        score: similarityScore(myKeywords, theirKeywords),
        reasons: overlap.slice(0, 2).map((token) => `You both mention ${token}`),
    };
}

function scoreCampusContext(me: MinimalProfile, them: MinimalProfile): { score: number; reasons: string[] } {
    let score = 60;
    const reasons: string[] = [];

    if (me.university && them.university && me.university === them.university) {
        score += 25;
        reasons.push("Same university");
    }

    if (me.course && them.course && me.course === them.course) {
        score += 12;
        reasons.push("Similar academic path");
    }

    if (me.yearOfStudy && them.yearOfStudy) {
        const diff = Math.abs(me.yearOfStudy - them.yearOfStudy);
        if (diff === 0) {
            score += 6;
            reasons.push("Same year of study");
        } else if (diff === 1) {
            score += 3;
        }
    }

    return {
        score: Math.max(0, Math.min(100, score)),
        reasons: reasons.slice(0, 2),
    };
}

function scoreActivity(profile: MinimalProfile): { score: number; reasons: string[] } {
    if (!profile.lastActive) return { score: 55, reasons: [] };

    const lastActiveAt = new Date(profile.lastActive).getTime();
    const daysSinceActive = (Date.now() - lastActiveAt) / (1000 * 60 * 60 * 24);

    if (daysSinceActive <= 1) return { score: 100, reasons: ["Recently active"] };
    if (daysSinceActive <= 3) return { score: 92, reasons: ["Recently active"] };
    if (daysSinceActive <= 7) return { score: 80, reasons: [] };
    if (daysSinceActive <= 14) return { score: 68, reasons: [] };
    if (daysSinceActive <= 30) return { score: 52, reasons: [] };
    return { score: 35, reasons: [] };
}

function scoreProfileQuality(profile: MinimalProfile): { score: number; reasons: string[] } {
    const prompts = Array.isArray(profile.prompts) ? profile.prompts.length : 0;
    const photos = Array.isArray(profile.photos) ? profile.photos.length : 0;

    const fields = [
        profile.profileCompleted,
        profile.profilePhoto,
        photos > 1,
        profile.bio || profile.aboutMe,
        Array.isArray(profile.interests) && profile.interests.length > 0,
        Array.isArray(profile.qualities) && profile.qualities.length > 0,
        prompts > 0,
        profile.personalitySummary,
        profile.communicationStyle,
        profile.lookingFor,
    ];

    const score = Math.round((fields.filter(Boolean).length / fields.length) * 100);
    return {
        score,
        reasons: score >= 75 ? ["Complete profile"] : [],
    };
}

/**
 * Combine activity + profile quality into a small multiplicative nudge rather
 * than a heavy weighted component. Range ~0.92..1.05 so these act as gentle
 * tiebreakers instead of dominating compatibility.
 */
function freshnessMultiplier(activity: number, profileQuality: number): number {
    const activityFactor = 0.94 + (activity / 100) * 0.06; // 0.94..1.00
    const qualityFactor = 0.97 + (profileQuality / 100) * 0.05; // 0.97..1.02
    return Math.max(0.9, Math.min(1.05, activityFactor * qualityFactor));
}

export function scoreProfilePair(me: MinimalProfile, them: MinimalProfile): MatchScoreBreakdown {
    const interests = scoreInterests(me, them);
    const personality = scoreStructuredAnswers(
        me.personalityAnswers as Record<string, unknown> | null,
        them.personalityAnswers as Record<string, unknown> | null,
        PERSONALITY_LABELS,
        PERSONALITY_COMPATIBILITY,
    );
    const lifestyle = scoreStructuredAnswers(
        me.lifestyleAnswers as Record<string, unknown> | null,
        them.lifestyleAnswers as Record<string, unknown> | null,
        LIFESTYLE_LABELS,
        LIFESTYLE_COMPATIBILITY,
    );
    const communication = scoreCommunication(me, them);
    const relationshipIntent = scoreRelationshipIntent(me, them);
    const values = scoreValues(me, them);
    const campusContext = scoreCampusContext(me, them);
    const activity = scoreActivity(them);
    const profileQuality = scoreProfileQuality(them);

    const weightedCore =
        interests.score * COMPONENT_WEIGHTS.interests +
        personality.score * COMPONENT_WEIGHTS.personality +
        lifestyle.score * COMPONENT_WEIGHTS.lifestyle +
        communication.score * COMPONENT_WEIGHTS.communication +
        relationshipIntent.score * COMPONENT_WEIGHTS.relationshipIntent +
        values.score * COMPONENT_WEIGHTS.values +
        campusContext.score * COMPONENT_WEIGHTS.campusContext;

    const multiplier = freshnessMultiplier(activity.score, profileQuality.score);
    let finalScore = weightedCore * multiplier;

    // Small reward when all three "core fit" signals land strong together —
    // this prevents the multiplier alone from ever being the deciding factor.
    if (relationshipIntent.score >= 80 && personality.score >= 70 && lifestyle.score >= 70) {
        finalScore += 4;
    }

    const reasons = Array.from(
        new Set([
            ...relationshipIntent.reasons,
            ...interests.reasons,
            ...personality.reasons,
            ...lifestyle.reasons,
            ...communication.reasons,
            ...campusContext.reasons,
            ...values.reasons,
            ...activity.reasons,
            ...profileQuality.reasons,
        ]),
    ).slice(0, 4);

    return {
        score: Math.max(0, Math.min(100, Math.round(finalScore))),
        reasons: reasons.length > 0 ? reasons : ["Potential match"],
        components: {
            interests: interests.score,
            personality: personality.score,
            lifestyle: lifestyle.score,
            communication: communication.score,
            relationshipIntent: relationshipIntent.score,
            values: values.score,
            campusContext: campusContext.score,
            activity: activity.score,
            profileQuality: profileQuality.score,
        },
    };
}
