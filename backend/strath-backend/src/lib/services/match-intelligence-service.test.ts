import "./match-intelligence-service.test-setup";

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
    applyDailyMix,
    classifyMatchType,
    finalRecommendationScore,
    preferenceFitScore,
    type RankedRecommendation,
    scoreDiversity,
} from "@/lib/services/match-intelligence-service";

describe("match intelligence scoring", () => {
    it("changes preference fit by selected mode", () => {
        const base = {
            compatibilityScore: 86,
            activityScore: 62,
            responseScore: 64,
            diversityScore: 38,
            availabilityScore: 55,
        };

        const similar = preferenceFitScore({ preferenceMode: "similar_to_me", ...base });
        const different = preferenceFitScore({ preferenceMode: "different_from_me", ...base });

        assert.ok(similar > different);
    });

    it("lets an active decent match beat an inactive high-compatibility match in active mode", () => {
        const activeDecent = finalRecommendationScore({
            preferenceMode: "active_only",
            compatibilityScore: 68,
            activityScore: 98,
            responseScore: 85,
            availabilityScore: 85,
            diversityScore: 45,
            mutualProbabilityScore: 74,
            preferenceFitScore: 90,
            profileQualityScore: 80,
            ghostingPenalty: 0,
            passRiskPenalty: 0,
            activeHoldPenalty: 0,
        });

        const inactiveGreat = finalRecommendationScore({
            preferenceMode: "active_only",
            compatibilityScore: 94,
            activityScore: 20,
            responseScore: 55,
            availabilityScore: 45,
            diversityScore: 40,
            mutualProbabilityScore: 65,
            preferenceFitScore: 52,
            profileQualityScore: 90,
            ghostingPenalty: 0,
            passRiskPenalty: 0,
            activeHoldPenalty: 0,
        });

        assert.ok(activeDecent > inactiveGreat);
    });

    it("rewards useful difference for complementary mode", () => {
        const diversity = scoreDiversity(
            {
                course: "Computer Science",
                university: "Strathmore University",
                interests: ["coding", "music", "startups"],
                personalityAnswers: { socialVibe: "introvert" },
                lifestyleAnswers: {},
            },
            {
                course: "Finance",
                university: "USIU",
                interests: ["fashion", "travel", "coffee"],
                personalityAnswers: { socialVibe: "extrovert" },
                lifestyleAnswers: {},
            },
        );

        assert.ok(diversity >= 80);
        assert.equal(
            classifyMatchType({
                preferenceMode: "different_from_me",
                compatibilityScore: 66,
                activityScore: 70,
                responseScore: 70,
                diversityScore: diversity,
            }),
            "complementary",
        );
    });

    it("reduces rank for ghosting and pass-risk penalties", () => {
        const healthy = finalRecommendationScore({
            preferenceMode: "surprise_me",
            compatibilityScore: 76,
            activityScore: 82,
            responseScore: 78,
            availabilityScore: 65,
            diversityScore: 58,
            mutualProbabilityScore: 75,
            preferenceFitScore: 72,
            profileQualityScore: 85,
            ghostingPenalty: 0,
            passRiskPenalty: 0,
            activeHoldPenalty: 0,
        });

        const penalized = finalRecommendationScore({
            preferenceMode: "surprise_me",
            compatibilityScore: 76,
            activityScore: 82,
            responseScore: 78,
            availabilityScore: 65,
            diversityScore: 58,
            mutualProbabilityScore: 75,
            preferenceFitScore: 72,
            profileQualityScore: 85,
            ghostingPenalty: 15,
            passRiskPenalty: 12,
            activeHoldPenalty: 0,
        });

        assert.ok(healthy > penalized);
    });

    it("daily mix prioritizes incoming interest and active high-probability candidates", () => {
        const candidate = (overrides: Partial<RankedRecommendation>): RankedRecommendation => ({
            candidateUserId: overrides.candidateUserId ?? "candidate",
            currentUserDecision: "pending",
            finalScore: overrides.finalScore ?? 70,
            matchType: overrides.matchType ?? "similarity",
            compatibilityScore: 70,
            activityScore: overrides.activityScore ?? 70,
            responseScore: overrides.responseScore ?? 70,
            availabilityScore: 60,
            diversityScore: overrides.diversityScore ?? 50,
            mutualProbabilityScore: overrides.mutualProbabilityScore ?? 50,
            preferenceFitScore: 70,
            profileQualityScore: overrides.profileQualityScore ?? 70,
            photoQualityScore: 70,
            photoPreferenceScore: 50,
            photoVisualDiversityScore: 50,
            reason: "Similar vibe",
            reasons: ["Similar vibe"],
            activityStatus: "active_today",
            profilePreview: {
                firstName: "Amina",
                age: 22,
                university: "Strathmore",
                course: "Computer Science",
                photos: [],
                profilePhoto: null,
                bio: null,
                interests: [],
            },
            ...overrides,
        });
        const mixed = applyDailyMix([
            candidate({ candidateUserId: "normal-top", finalScore: 95, matchType: "similarity" }),
            candidate({ candidateUserId: "incoming", finalScore: 82, mutualProbabilityScore: 100 }),
            candidate({ candidateUserId: "active", finalScore: 80, matchType: "high_activity", activityScore: 98, responseScore: 85 }),
            candidate({ candidateUserId: "complementary", finalScore: 75, matchType: "complementary" }),
            candidate({ candidateUserId: "quality", finalScore: 72, profileQualityScore: 92 }),
        ], "surprise_me");

        assert.equal(mixed[0].candidateUserId, "incoming");
        assert.equal(mixed[1].candidateUserId, "active");
        assert.ok(mixed.some((item) => item.candidateUserId === "complementary"));
        assert.equal(new Set(mixed.map((item) => item.candidateUserId)).size, mixed.length);
    });
});
