import test from "node:test";
import assert from "node:assert/strict";

import { finalRecommendationScore } from "@/lib/services/recommendation-score";

const base = {
    preferenceMode: "surprise_me" as const,
    compatibilityScore: 76,
    activityScore: 72,
    responseScore: 70,
    availabilityScore: 55,
    diversityScore: 58,
    mutualProbabilityScore: 66,
    preferenceFitScore: 68,
    profileQualityScore: 75,
    photoPreferenceScore: 55,
    ghostingPenalty: 0,
    passRiskPenalty: 0,
    activeHoldPenalty: 0,
};

test("profile intelligence candidate strength improves final recommendation score", () => {
    const average = finalRecommendationScore({
        ...base,
        profileCompletenessScore: 70,
        candidateStrengthScore: 50,
        reciprocalInterestScore: 20,
        photoPresentationScore: 70,
    });
    const strong = finalRecommendationScore({
        ...base,
        profileCompletenessScore: 90,
        candidateStrengthScore: 92,
        reciprocalInterestScore: 20,
        photoPresentationScore: 85,
    });

    assert.ok(strong > average);
});

test("incoming reciprocal interest gets a strong bounded boost", () => {
    const normal = finalRecommendationScore({
        ...base,
        profileCompletenessScore: 75,
        candidateStrengthScore: 70,
        reciprocalInterestScore: 15,
    });
    const incoming = finalRecommendationScore({
        ...base,
        profileCompletenessScore: 75,
        candidateStrengthScore: 70,
        reciprocalInterestScore: 100,
    });

    assert.ok(incoming > normal);
    assert.ok(incoming <= 100);
});

test("first-session scoring strongly favors active responsive candidates", () => {
    const activeResponder = finalRecommendationScore({
        ...base,
        compatibilityScore: 62,
        activityScore: 100,
        responseScore: 90,
        candidateStrengthScore: 82,
        profileCompletenessScore: 75,
        reciprocalInterestScore: 30,
        isFirstSessionUser: true,
    });
    const dormantCompatible = finalRecommendationScore({
        ...base,
        compatibilityScore: 96,
        activityScore: 20,
        responseScore: 50,
        candidateStrengthScore: 54,
        profileCompletenessScore: 90,
        reciprocalInterestScore: 30,
        isFirstSessionUser: true,
    });

    assert.ok(activeResponder > dormantCompatible);
});
