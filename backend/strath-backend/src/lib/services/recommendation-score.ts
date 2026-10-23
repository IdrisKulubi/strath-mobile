export type RecommendationPreferenceMode =
    | "similar_to_me"
    | "different_from_me"
    | "surprise_me"
    | "active_only"
    | "serious_matches";

export type RecommendationScoreInput = {
    preferenceMode: RecommendationPreferenceMode;
    compatibilityScore: number;
    activityScore: number;
    responseScore: number;
    availabilityScore: number;
    diversityScore: number;
    mutualProbabilityScore: number;
    preferenceFitScore: number;
    profileQualityScore: number;
    profileCompletenessScore?: number;
    candidateStrengthScore?: number;
    reciprocalInterestScore?: number;
    photoQualityScore?: number;
    photoPresentationScore?: number;
    photoPreferenceScore?: number;
    photoVisualDiversityScore?: number;
    photoQualityPenalty?: number;
    ghostingPenalty: number;
    passRiskPenalty: number;
    activeHoldPenalty: number;
    isFirstSessionUser?: boolean;
};

function clampScore(value: number | null | undefined) {
    if (!Number.isFinite(value ?? NaN)) return 0;
    return Math.max(0, Math.min(100, Math.round(value ?? 0)));
}

function scoreWithPreferenceMode(input: RecommendationScoreInput) {
    const weights =
        input.preferenceMode === "active_only"
            ? { compatibility: 0.1, activity: 0.35, response: 0.25, availability: 0.1, diversity: 0.05, mutual: 0.1, preference: 0.05, quality: 0.05 }
            : input.preferenceMode === "serious_matches"
                ? { compatibility: 0.2, activity: 0.15, response: 0.25, availability: 0.15, diversity: 0.05, mutual: 0.15, preference: 0.05, quality: 0.05 }
                : input.preferenceMode === "different_from_me"
                    ? { compatibility: 0.18, activity: 0.2, response: 0.18, availability: 0.08, diversity: 0.18, mutual: 0.1, preference: 0.08, quality: 0.05 }
                    : { compatibility: 0.25, activity: 0.22, response: 0.18, availability: 0.08, diversity: 0.08, mutual: 0.11, preference: 0.08, quality: 0.05 };

    const photoWeights = input.isFirstSessionUser
        ? { quality: 0.08, preference: 0.03, visualDiversity: 0.02 }
        : { quality: 0.08, preference: 0.05, visualDiversity: 0.05 };

    return (
        clampScore(input.compatibilityScore) * weights.compatibility +
        clampScore(input.activityScore) * weights.activity +
        clampScore(input.responseScore) * weights.response +
        clampScore(input.availabilityScore) * weights.availability +
        clampScore(input.diversityScore) * weights.diversity +
        clampScore(input.mutualProbabilityScore) * weights.mutual +
        clampScore(input.preferenceFitScore) * weights.preference +
        clampScore(input.profileQualityScore) * weights.quality +
        clampScore(input.photoQualityScore ?? input.photoPresentationScore ?? 50) * photoWeights.quality +
        clampScore(input.photoPreferenceScore ?? 50) * photoWeights.preference +
        clampScore(input.photoVisualDiversityScore ?? 50) * photoWeights.visualDiversity
    );
}

function scoreWithProfileIntelligence(input: RecommendationScoreInput) {
    const reciprocalInterestScore = clampScore(input.reciprocalInterestScore ?? input.mutualProbabilityScore);
    const profileCompletenessScore = clampScore(input.profileCompletenessScore ?? input.profileQualityScore);
    const candidateStrengthScore = clampScore(input.candidateStrengthScore ?? 50);
    const visualPreferenceScore = clampScore(input.photoPreferenceScore ?? 50);
    const photoPresentationScore = clampScore(input.photoPresentationScore ?? input.photoQualityScore ?? 50);

    if (input.isFirstSessionUser) {
        return (
            clampScore(input.activityScore) * 0.35 +
            clampScore(input.responseScore) * 0.2 +
            clampScore(input.compatibilityScore) * 0.15 +
            reciprocalInterestScore * 0.15 +
            profileCompletenessScore * 0.1 +
            candidateStrengthScore * 0.05 +
            photoPresentationScore * 0.05
        );
    }

    return (
        clampScore(input.compatibilityScore) * 0.25 +
        clampScore(input.activityScore) * 0.25 +
        clampScore(input.responseScore) * 0.15 +
        reciprocalInterestScore * 0.1 +
        profileCompletenessScore * 0.1 +
        candidateStrengthScore * 0.1 +
        visualPreferenceScore * 0.05 +
        photoPresentationScore * 0.05
    );
}

export function finalRecommendationScore(input: RecommendationScoreInput) {
    const score = input.candidateStrengthScore !== undefined ||
        input.profileCompletenessScore !== undefined ||
        input.reciprocalInterestScore !== undefined ||
        input.photoPresentationScore !== undefined
        ? scoreWithProfileIntelligence(input)
        : scoreWithPreferenceMode(input);

    return clampScore(
        score -
        (input.photoQualityPenalty ?? 0) -
        clampScore(input.ghostingPenalty) -
        clampScore(input.passRiskPenalty) -
        clampScore(input.activeHoldPenalty),
    );
}
