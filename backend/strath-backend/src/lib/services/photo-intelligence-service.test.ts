import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
    buildPhotoImprovementTips,
    calculatePhotoQualityScore,
} from "@/lib/services/photo-intelligence-scoring";
import type { PhotoAnalysisResult } from "@/lib/services/photo-intelligence-types";

describe("calculatePhotoQualityScore", () => {
    it("rewards clear usable photos", () => {
        const score = calculatePhotoQualityScore({
            faceVisible: true,
            imageClear: true,
            lightingScore: 60,
            blurScore: 55,
            duplicateScore: 100,
            hasMultiplePeople: false,
            isScreenshotOrMeme: false,
            isObjectOrLandscapeOnly: false,
            moderationStatus: "approved",
        });

        assert.ok(score >= 70);
    });

    it("penalizes rejected or low-quality presentation", () => {
        const score = calculatePhotoQualityScore({
            faceVisible: false,
            imageClear: false,
            lightingScore: 10,
            blurScore: 10,
            duplicateScore: 20,
            hasMultiplePeople: true,
            isScreenshotOrMeme: true,
            isObjectOrLandscapeOnly: true,
            moderationStatus: "rejected",
        });

        assert.ok(score <= 20);
    });
});

describe("buildPhotoImprovementTips", () => {
    it("suggests actionable profile tips without attractiveness language", () => {
        const tips = buildPhotoImprovementTips({
            photoCount: 1,
            analyses: [
                {
                    userId: "u1",
                    photoUrl: "https://example.com/a.jpg",
                    photoHash: "hash",
                    qualityScore: 20,
                    faceVisible: false,
                    imageClear: false,
                    lightingScore: 10,
                    blurScore: 10,
                    duplicateScore: 100,
                    hasMultiplePeople: false,
                    isScreenshotOrMeme: false,
                    isObjectOrLandscapeOnly: true,
                    moderationStatus: "approved",
                    moderationReason: null,
                    analysisVersion: "v1",
                    metadata: {},
                } satisfies PhotoAnalysisResult,
            ],
        });

        assert.ok(tips.some((tip) => tip.includes("face is visible")));
        assert.ok(tips.some((tip) => tip.includes("at least 2 photos")));
        assert.equal(
            tips.some((tip) => /\b(attractiveness|beauty|hotness)\b/i.test(tip)),
            false,
        );
    });
});
