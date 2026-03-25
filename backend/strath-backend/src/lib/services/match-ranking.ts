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

const COMPONENT_WEIGHTS = {
    interests: 0.2,
    personality: 0.18,
    lifestyle: 0.14,
    communication: 0.1,
    relationshipIntent: 0.12,
    values: 0.08,
    campusContext: 0.07,
    activity: 0.06,
    profileQuality: 0.05,
} as const;

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
]);

function normalizeText(value: string | null | undefined): string {
    return (value ?? "")
        .toLowerCase()
        .replace(/[\u{1F300}-\u{1FAFF}]/gu, " ")
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function toTokenSet(values: string[] | null | undefined): Set<string> {
    if (!Array.isArray(values)) return new Set();
    return new Set(
        values
            .flatMap((value) => normalizeText(value).split(" "))
            .filter(Boolean),
    );
}

function overlapScore(left: Set<string>, right: Set<string>): number {
    if (left.size === 0 || right.size === 0) return 50;

    let overlap = 0;
    for (const token of left) {
        if (right.has(token)) overlap++;
    }

    const union = new Set([...left, ...right]).size;
    return Math.round(35 + (overlap / Math.max(1, union)) * 65);
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
            .filter((token) => !NORMALIZED_TEXT_STOPWORDS.has(token)),
    );
}

function scoreInterests(me: MinimalProfile, them: MinimalProfile): { score: number; reasons: string[] } {
    const myInterests = toTokenSet(me.interests);
    const theirInterests = toTokenSet(them.interests);
    const myQualities = toTokenSet(me.qualities);
    const theirQualities = toTokenSet(them.qualities);
    const myLanguages = toTokenSet(me.languages);
    const theirLanguages = toTokenSet(them.languages);

    const interestScore = overlapScore(myInterests, theirInterests);
    const qualityScore = overlapScore(myQualities, theirQualities);
    const languageScore = overlapScore(myLanguages, theirLanguages);

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

function scoreStructuredAnswers(
    myAnswers: Record<string, unknown> | null | undefined,
    theirAnswers: Record<string, unknown> | null | undefined,
    labels: Record<string, string>,
): { score: number; reasons: string[] } {
    const mine = myAnswers ?? {};
    const theirs = theirAnswers ?? {};
    const reasons: string[] = [];
    let exactMatches = 0;
    let comparable = 0;

    for (const [key, label] of Object.entries(labels)) {
        const myValue = mine[key];
        const theirValue = theirs[key];
        if (!myValue || !theirValue) continue;

        comparable++;
        if (normalizeText(String(myValue)) === normalizeText(String(theirValue))) {
            exactMatches++;
            reasons.push(label);
        }
    }

    if (comparable === 0) {
        return { score: 55, reasons: [] };
    }

    return {
        score: Math.round(35 + (exactMatches / comparable) * 65),
        reasons: reasons.slice(0, 3),
    };
}

function scoreCommunication(me: MinimalProfile, them: MinimalProfile): { score: number; reasons: string[] } {
    let score = 55;
    const reasons: string[] = [];

    const myStyle = normalizeText(me.communicationStyle);
    const theirStyle = normalizeText(them.communicationStyle);
    if (myStyle && theirStyle) {
        if (myStyle === theirStyle) {
            score += 25;
            reasons.push("Matching communication style");
        } else if (myStyle === "both" || theirStyle === "both") {
            score += 12;
            reasons.push("Flexible communication match");
        } else {
            score -= 10;
        }
    }

    const myLoveLanguage = normalizeText(me.loveLanguage);
    const theirLoveLanguage = normalizeText(them.loveLanguage);
    if (myLoveLanguage && theirLoveLanguage) {
        if (myLoveLanguage === theirLoveLanguage) {
            score += 20;
            reasons.push(`Shared love language: ${myLoveLanguage}`);
        } else {
            score += 4;
        }
    }

    return {
        score: Math.max(0, Math.min(100, Math.round(score))),
        reasons: reasons.slice(0, 2),
    };
}

function scoreRelationshipIntent(me: MinimalProfile, them: MinimalProfile): { score: number; reasons: string[] } {
    const myIntent = normalizeText(me.lookingFor);
    const theirIntent = normalizeText(them.lookingFor);
    if (!myIntent || !theirIntent) {
        return { score: 55, reasons: [] };
    }

    if (myIntent === theirIntent) {
        return { score: 100, reasons: ["Aligned relationship goals"] };
    }

    const myTokens = new Set(myIntent.split(" ").filter(Boolean));
    const theirTokens = new Set(theirIntent.split(" ").filter(Boolean));
    const overlap = [...myTokens].filter((token) => theirTokens.has(token));
    if (overlap.length > 0) {
        return { score: 75, reasons: ["Similar relationship goals"] };
    }

    return { score: 25, reasons: [] };
}

function scoreValues(me: MinimalProfile, them: MinimalProfile): { score: number; reasons: string[] } {
    const myKeywords = collectProfileKeywords(me);
    const theirKeywords = collectProfileKeywords(them);
    const overlap = [...myKeywords].filter((token) => theirKeywords.has(token));
    return {
        score: overlapScore(myKeywords, theirKeywords),
        reasons: overlap.slice(0, 2).map((token) => `You both mention ${token}`),
    };
}

function scoreCampusContext(me: MinimalProfile, them: MinimalProfile): { score: number; reasons: string[] } {
    let score = 45;
    const reasons: string[] = [];

    if (me.university && them.university && me.university === them.university) {
        score += 30;
        reasons.push("Same university");
    }

    if (me.course && them.course && me.course === them.course) {
        score += 15;
        reasons.push("Similar academic path");
    }

    if (me.yearOfStudy && them.yearOfStudy) {
        const diff = Math.abs(me.yearOfStudy - them.yearOfStudy);
        if (diff === 0) {
            score += 10;
            reasons.push("Same year of study");
        } else if (diff === 1) {
            score += 6;
        }
    }

    return {
        score: Math.max(0, Math.min(100, score)),
        reasons: reasons.slice(0, 2),
    };
}

function scoreActivity(profile: MinimalProfile): { score: number; reasons: string[] } {
    if (!profile.lastActive) return { score: 45, reasons: [] };

    const lastActiveAt = new Date(profile.lastActive).getTime();
    const daysSinceActive = (Date.now() - lastActiveAt) / (1000 * 60 * 60 * 24);

    if (daysSinceActive <= 1) return { score: 100, reasons: ["Recently active"] };
    if (daysSinceActive <= 3) return { score: 90, reasons: ["Recently active"] };
    if (daysSinceActive <= 7) return { score: 75, reasons: [] };
    if (daysSinceActive <= 14) return { score: 60, reasons: [] };
    if (daysSinceActive <= 30) return { score: 40, reasons: [] };
    return { score: 20, reasons: [] };
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

export function scoreProfilePair(me: MinimalProfile, them: MinimalProfile): MatchScoreBreakdown {
    const interests = scoreInterests(me, them);
    const personality = scoreStructuredAnswers(
        me.personalityAnswers as Record<string, unknown> | null,
        them.personalityAnswers as Record<string, unknown> | null,
        PERSONALITY_LABELS,
    );
    const lifestyle = scoreStructuredAnswers(
        me.lifestyleAnswers as Record<string, unknown> | null,
        them.lifestyleAnswers as Record<string, unknown> | null,
        LIFESTYLE_LABELS,
    );
    const communication = scoreCommunication(me, them);
    const relationshipIntent = scoreRelationshipIntent(me, them);
    const values = scoreValues(me, them);
    const campusContext = scoreCampusContext(me, them);
    const activity = scoreActivity(them);
    const profileQuality = scoreProfileQuality(them);

    const score =
        interests.score * COMPONENT_WEIGHTS.interests +
        personality.score * COMPONENT_WEIGHTS.personality +
        lifestyle.score * COMPONENT_WEIGHTS.lifestyle +
        communication.score * COMPONENT_WEIGHTS.communication +
        relationshipIntent.score * COMPONENT_WEIGHTS.relationshipIntent +
        values.score * COMPONENT_WEIGHTS.values +
        campusContext.score * COMPONENT_WEIGHTS.campusContext +
        activity.score * COMPONENT_WEIGHTS.activity +
        profileQuality.score * COMPONENT_WEIGHTS.profileQuality;

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
        score: Math.max(0, Math.min(100, Math.round(score))),
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
