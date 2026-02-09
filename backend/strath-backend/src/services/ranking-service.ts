import type { SearchCandidate } from "./agent-search";
import type { ParsedIntent } from "./intent-parser";

// ============================================
// RANKING SERVICE
// ============================================
// Multi-factor scoring engine that takes raw search candidates
// and produces a final ranked list. Goes beyond simple vector
// similarity by considering:
//
// 1. Semantic similarity (vector score from pgvector)
// 2. Preference alignment (how well profile matches soft preferences)
// 3. Filter match bonus (passed hard filters = reliability boost)
// 4. Profile completeness (fuller profiles rank higher)
// 5. Activity recency (active users rank higher)
// 6. Learned preference bonus (from wingman memory)
//
// Latency: ~5ms (pure computation, no API calls)

const WEIGHTS = {
    vector:            0.35,   // Semantic similarity from embedding
    preference:        0.25,   // Soft preference matching
    filterBonus:       0.15,   // Hard filter match bonus
    completeness:      0.10,   // Profile completeness
    recency:           0.10,   // Last active recency
    learnedPref:       0.05,   // Wingman memory boost
};

export interface RankedCandidate {
    profile: SearchCandidate["profile"];
    scores: {
        total: number;           // Final score (0-100)
        vector: number;          // Semantic similarity (0-1)
        preference: number;      // Preference alignment (0-1)
        filterMatch: boolean;
        completeness: number;    // Profile completeness (0-1)
        recency: number;         // Activity recency (0-1)
        learnedPref: number;     // Learned preference boost (0-1)
    };
    matchReasons: string[];       // Human-readable match reasons
}

/**
 * Rank search candidates by multi-factor scoring.
 *
 * @param candidates - Raw candidates from agent search
 * @param intent - The parsed user intent
 * @param learnedPreferences - From agentContext (wingman memory)
 * @returns Sorted candidates with scores and match reasons
 */
export function rankCandidates(
    candidates: SearchCandidate[],
    intent: ParsedIntent,
    learnedPreferences?: Record<string, number>,
): RankedCandidate[] {
    return candidates
        .map(candidate => scoreCandidate(candidate, intent, learnedPreferences))
        .sort((a, b) => b.scores.total - a.scores.total);
}

/**
 * Score a single candidate across all factors.
 */
function scoreCandidate(
    candidate: SearchCandidate,
    intent: ParsedIntent,
    learnedPreferences?: Record<string, number>,
): RankedCandidate {
    const profile = candidate.profile;

    // 1. Vector similarity (already computed by pgvector)
    const vectorScore = candidate.vectorScore;

    // 2. Preference alignment
    const preferenceScore = scorePreferences(profile, intent.preferences);

    // 3. Filter match bonus
    const filterBonus = candidate.filterMatch ? 1 : 0;

    // 4. Profile completeness
    const completeness = scoreCompleteness(profile);

    // 5. Activity recency
    const recency = scoreRecency(profile);

    // 6. Learned preference alignment
    const learnedPrefScore = scoreLearnedPreferences(profile, learnedPreferences);

    // Compute weighted total (0-100)
    const total = Math.round(
        (vectorScore     * WEIGHTS.vector +
         preferenceScore * WEIGHTS.preference +
         filterBonus     * WEIGHTS.filterBonus +
         completeness    * WEIGHTS.completeness +
         recency         * WEIGHTS.recency +
         learnedPrefScore * WEIGHTS.learnedPref) * 100
    );

    // Generate human-readable reasons
    const matchReasons = generateMatchReasons(profile, intent, {
        vectorScore, preferenceScore, completeness, recency,
    });

    return {
        profile,
        scores: {
            total: Math.min(100, Math.max(0, total)),
            vector: vectorScore,
            preference: preferenceScore,
            filterMatch: candidate.filterMatch,
            completeness,
            recency,
            learnedPref: learnedPrefScore,
        },
        matchReasons,
    };
}

/**
 * Score how well a profile matches the user's soft preferences.
 * Checks: traits/interests overlap, personality match, lookingFor alignment.
 */
function scorePreferences(
    profile: SearchCandidate["profile"],
    preferences: ParsedIntent["preferences"],
): number {
    let score = 0;
    let maxScore = 0;

    // Interest overlap
    if (preferences.interests.length > 0) {
        maxScore += 1;
        const profileInterests = (profile.interests || []).map(i => i.toLowerCase());
        const matchCount = preferences.interests.filter(i =>
            profileInterests.some(pi => pi.includes(i.toLowerCase()) || i.toLowerCase().includes(pi))
        ).length;
        score += preferences.interests.length > 0 ? matchCount / preferences.interests.length : 0;
    }

    // Trait matching (against personalitySummary + aboutMe)
    if (preferences.traits.length > 0) {
        maxScore += 1;
        const searchText = [
            profile.personalitySummary,
            profile.aboutMe,
            profile.bio,
            (profile.qualities || []).join(" "),
        ].filter(Boolean).join(" ").toLowerCase();

        const traitMatches = preferences.traits.filter(trait =>
            searchText.includes(trait.toLowerCase())
        ).length;
        score += preferences.traits.length > 0 ? traitMatches / preferences.traits.length : 0;
    }

    // Personality type matching
    if (preferences.personality.length > 0) {
        maxScore += 1;
        const searchText = [
            profile.personalityType,
            profile.personalitySummary,
            profile.communicationStyle,
        ].filter(Boolean).join(" ").toLowerCase();

        const personalityMatches = preferences.personality.filter(p =>
            searchText.includes(p.toLowerCase())
        ).length;
        score += preferences.personality.length > 0 ? personalityMatches / preferences.personality.length : 0;
    }

    // Looking for alignment
    if (preferences.lookingFor) {
        maxScore += 0.5;
        if (profile.lookingFor &&
            profile.lookingFor.toLowerCase().includes(preferences.lookingFor.toLowerCase())) {
            score += 0.5;
        }
    }

    // Communication style
    if (preferences.communicationStyle) {
        maxScore += 0.3;
        if (profile.communicationStyle &&
            profile.communicationStyle.toLowerCase().includes(preferences.communicationStyle.toLowerCase())) {
            score += 0.3;
        }
    }

    // Love language
    if (preferences.loveLanguage) {
        maxScore += 0.3;
        if (profile.loveLanguage &&
            profile.loveLanguage.toLowerCase().includes(preferences.loveLanguage.toLowerCase())) {
            score += 0.3;
        }
    }

    return maxScore > 0 ? Math.min(1, score / maxScore) : 0.5;
}

/**
 * Score profile completeness.
 * More complete profiles = higher quality matches.
 */
function scoreCompleteness(profile: SearchCandidate["profile"]): number {
    const fields = [
        profile.firstName,
        profile.bio || profile.aboutMe,
        profile.age,
        profile.gender,
        profile.course,
        profile.yearOfStudy,
        profile.photos && profile.photos.length > 0,
        profile.profilePhoto,
        profile.interests && profile.interests.length > 0,
        profile.personalitySummary,
        profile.personalityType,
        profile.lookingFor,
        profile.qualities && profile.qualities.length > 0,
        profile.prompts && profile.prompts.length > 0,
        profile.communicationStyle,
        profile.loveLanguage,
    ];

    const filled = fields.filter(Boolean).length;
    return filled / fields.length;
}

/**
 * Score based on how recently the user was active.
 * Exponential decay over 30 days.
 */
function scoreRecency(profile: SearchCandidate["profile"]): number {
    if (!profile.lastActive) return 0.3; // Unknown = assume moderately active

    const now = Date.now();
    const lastActive = new Date(profile.lastActive).getTime();
    const daysSinceActive = (now - lastActive) / (1000 * 60 * 60 * 24);

    if (daysSinceActive <= 1) return 1.0;
    if (daysSinceActive <= 3) return 0.9;
    if (daysSinceActive <= 7) return 0.7;
    if (daysSinceActive <= 14) return 0.5;
    if (daysSinceActive <= 30) return 0.3;
    return 0.1;
}

/**
 * Score based on learned preferences from wingman memory.
 * Checks if any learned traits match this profile's characteristics.
 */
function scoreLearnedPreferences(
    profile: SearchCandidate["profile"],
    learnedPreferences?: Record<string, number>,
): number {
    if (!learnedPreferences || Object.keys(learnedPreferences).length === 0) return 0.5;

    const profileText = [
        profile.personalitySummary,
        profile.aboutMe,
        profile.bio,
        (profile.interests || []).join(" "),
        (profile.qualities || []).join(" "),
        profile.personalityType,
        profile.communicationStyle,
        profile.gender,
        profile.course,
    ].filter(Boolean).join(" ").toLowerCase();

    let totalWeight = 0;
    let matchWeight = 0;

    for (const [trait, weight] of Object.entries(learnedPreferences)) {
        totalWeight += Math.abs(weight);
        const traitLower = trait.toLowerCase().replace(/_/g, " ");
        if (profileText.includes(traitLower)) {
            matchWeight += weight; // Positive = user likes it, negative = dislikes
        }
    }

    if (totalWeight === 0) return 0.5;

    // Normalize to 0-1 range
    return Math.min(1, Math.max(0, 0.5 + (matchWeight / totalWeight) * 0.5));
}

/**
 * Generate human-readable match reasons.
 */
function generateMatchReasons(
    profile: SearchCandidate["profile"],
    intent: ParsedIntent,
    scores: { vectorScore: number; preferenceScore: number; completeness: number; recency: number },
): string[] {
    const reasons: string[] = [];

    // High vector similarity = semantically similar
    if (scores.vectorScore > 0.7) {
        reasons.push("Strong match for what you're looking for");
    } else if (scores.vectorScore > 0.5) {
        reasons.push("Good fit for your vibe");
    }

    // Interest overlap
    const profileInterests = (profile.interests || []).map(i => i.toLowerCase());
    const matchingInterests = intent.preferences.interests.filter(i =>
        profileInterests.some(pi => pi.includes(i.toLowerCase()))
    );
    if (matchingInterests.length > 0) {
        reasons.push(`Shared interests: ${matchingInterests.slice(0, 3).join(", ")}`);
    }

    // Trait matches
    const searchText = [profile.personalitySummary, profile.aboutMe, profile.bio].filter(Boolean).join(" ").toLowerCase();
    const matchingTraits = intent.preferences.traits.filter(t => searchText.includes(t.toLowerCase()));
    if (matchingTraits.length > 0) {
        reasons.push(`${matchingTraits[0]} personality`);
    }

    // Course/field
    if (intent.filters.course && profile.course?.toLowerCase().includes(intent.filters.course.toLowerCase())) {
        reasons.push(`Studies ${profile.course}`);
    }

    // Active user
    if (scores.recency > 0.8) {
        reasons.push("Active on campus");
    }

    // Personality type
    if (profile.personalityType) {
        reasons.push(`${profile.personalityType} personality type`);
    }

    // Fallback
    if (reasons.length === 0) {
        reasons.push("Recommended by Wingman AI");
    }

    return reasons.slice(0, 4);
}
