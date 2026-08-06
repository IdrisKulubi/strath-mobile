export const MATCHMAKER_PREFERENCE_CATEGORIES = [
    "relationship_intent",
    "values",
    "lifestyle",
    "communication",
    "social_energy",
    "practical",
    "attraction",
    "interests",
    "activity",
    "personality",
    "other",
] as const;

export type MatchmakerPreferenceCategory = typeof MATCHMAKER_PREFERENCE_CATEGORIES[number];
export type MatchmakerPreferenceSentiment = "prefer" | "avoid";
export type MatchmakerPreferenceImportance = "must_have" | "prefer" | "flexible";
export type MatchmakerPreferenceCertainty = "confirmed" | "inferred";
export type MatchmakerPreferenceSource = "direct" | "feedback" | "migrated_memory" | "system";
export type MatchmakerPreferenceStatus = "active" | "removed";
export type MatchmakerFeedbackLearningScope = "candidate_only" | "future_matches";

export interface MatchmakerPreferenceSeed {
    category: MatchmakerPreferenceCategory;
    value: string;
    normalizedValue: string;
    sentiment: MatchmakerPreferenceSentiment;
    importance: MatchmakerPreferenceImportance;
    certainty: MatchmakerPreferenceCertainty;
    source: MatchmakerPreferenceSource;
    metadata?: Record<string, unknown>;
}

export type MatchmakerBriefOperation =
    | {
        type: "add";
        category: MatchmakerPreferenceCategory;
        value: string;
        sentiment?: MatchmakerPreferenceSentiment;
        importance?: MatchmakerPreferenceImportance;
        certainty?: MatchmakerPreferenceCertainty;
        source?: MatchmakerPreferenceSource;
        metadata?: Record<string, unknown>;
    }
    | {
        type: "update";
        preferenceId: string;
        value?: string;
        sentiment?: MatchmakerPreferenceSentiment;
        metadata?: Record<string, unknown>;
    }
    | {
        type: "confirm";
        preferenceId: string;
    }
    | {
        type: "reclassify";
        preferenceId: string;
        importance: MatchmakerPreferenceImportance;
    }
    | {
        type: "remove";
        preferenceId: string;
    };

const CATEGORY_PATTERNS: Array<[MatchmakerPreferenceCategory, RegExp]> = [
    ["relationship_intent", /\b(serious|casual|intentional|relationship|long.?term)\b/i],
    ["social_energy", /\b(calm|quiet|social|expressive|outgoing|introvert|extrovert)\b/i],
    ["activity", /\b(active|activity|recently online)\b/i],
    ["communication", /\b(communication|consistent|low.?drama|direct|responsive)\b/i],
    ["lifestyle", /\b(lifestyle|fitness|workout|drinking|smoking|nightlife)\b/i],
    ["personality", /\b(infj|enfj|intj|entj|isfj|esfj|istj|estj|isfp|esfp|istp|estp|infp|enfp|intp|entp)\b/i],
    ["interests", /\b(music|gaming|fashion|photography|movies|church|study)\b/i],
];

const EXPLICIT_REASON_SIGNALS: Record<string, string[]> = {
    "not my vibe": ["avoid:vibe_mismatch"],
    "too social": ["avoid:very_social", "prefer:calm"],
    "too quiet": ["avoid:too_quiet", "prefer:expressive"],
    "not serious enough": ["avoid:casual", "prefer:serious"],
    "not active enough": ["avoid:low_activity", "prefer:active_recently"],
    "different lifestyle": ["avoid:lifestyle_mismatch"],
};

export function normalizePreferenceValue(value: string) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 80);
}

export function inferPreferenceCategory(value: string): MatchmakerPreferenceCategory {
    return CATEGORY_PATTERNS.find(([, pattern]) => pattern.test(value))?.[0] ?? "other";
}

function displayLegacyValue(key: string) {
    return key
        .replace(/^(prefer_|avoid_|interest_|quality_)/, "")
        .replace(/_/g, " ")
        .trim();
}

export function buildLegacyPreferenceSeeds(input: {
    positiveSignals?: Record<string, number> | null;
    negativeSignals?: Record<string, number> | null;
}) {
    const seeds: MatchmakerPreferenceSeed[] = [];
    const add = (signals: Record<string, number> | null | undefined, sentiment: MatchmakerPreferenceSentiment) => {
        for (const [rawKey, weight] of Object.entries(signals ?? {})) {
            const value = displayLegacyValue(rawKey);
            const normalizedValue = normalizePreferenceValue(value);
            if (!normalizedValue) continue;
            seeds.push({
                category: inferPreferenceCategory(value),
                value,
                normalizedValue,
                sentiment,
                importance: "flexible",
                certainty: "inferred",
                source: "migrated_memory",
                metadata: { legacyWeight: weight },
            });
        }
    };

    add(input.positiveSignals, "prefer");
    add(input.negativeSignals, "avoid");
    return seeds;
}

export function explicitFeedbackSignals(reason?: string | null) {
    if (!reason?.trim()) return [];
    const normalized = reason.trim().toLowerCase();
    return EXPLICIT_REASON_SIGNALS[normalized] ?? [reason.trim()];
}

function uniqueSignals(values: string[]) {
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function stripSignalPrefix(signal: string) {
    return signal.replace(/^(prefer|avoid):/i, "").trim();
}

export function buildFeedbackLearningPlan(input: {
    outcome: "interested" | "passed" | "not_this_one" | "refinement";
    reason?: string | null;
    candidateSignals?: string[];
    learningScope?: MatchmakerFeedbackLearningScope;
}) {
    const explicitSignals = explicitFeedbackSignals(input.reason);
    const candidateSignals = uniqueSignals(input.candidateSignals ?? []);
    const historySignals = uniqueSignals([...candidateSignals, ...explicitSignals]);

    if ((input.learningScope ?? "candidate_only") !== "future_matches") {
        return {
            historySignals,
            positiveSignals: [] as string[],
            negativeSignals: [] as string[],
        };
    }

    const positiveSignals: string[] = [];
    const negativeSignals: string[] = [];
    for (const signal of explicitSignals) {
        if (/^avoid:/i.test(signal)) negativeSignals.push(stripSignalPrefix(signal));
        else if (/^prefer:/i.test(signal)) positiveSignals.push(stripSignalPrefix(signal));
        else if (input.outcome === "interested" || input.outcome === "refinement") positiveSignals.push(signal);
        else negativeSignals.push(signal);
    }

    for (const signal of candidateSignals) {
        if (input.outcome === "interested") positiveSignals.push(signal);
        else if (input.outcome === "passed" || input.outcome === "not_this_one") negativeSignals.push(signal);
    }

    return {
        historySignals,
        positiveSignals: uniqueSignals(positiveSignals),
        negativeSignals: uniqueSignals(negativeSignals),
    };
}

export function assertValidBriefOperations(operations: MatchmakerBriefOperation[]) {
    if (operations.length < 1 || operations.length > 20) {
        throw new Error("A brief update requires between 1 and 20 operations");
    }
    for (const operation of operations) {
        if (operation.type === "add" && !normalizePreferenceValue(operation.value)) {
            throw new Error("Preference value is required");
        }
        if ("preferenceId" in operation && !operation.preferenceId.trim()) {
            throw new Error("Preference id is required");
        }
    }
}
