import test from "node:test";
import assert from "node:assert/strict";

import { isStrongSingleFaceMatch, resolveFaceVerificationOutcome } from "@/lib/services/face-verification-decision";
import { getFaceVerificationMinimumMatchCount } from "@/lib/services/face-verification-policy";

test("one strong match is the default verification requirement", () => {
    const configuredValue = process.env.FACE_VERIFICATION_MIN_MATCH_COUNT;
    delete process.env.FACE_VERIFICATION_MIN_MATCH_COUNT;
    try {
        assert.equal(getFaceVerificationMinimumMatchCount(), 1);
    } finally {
        if (configuredValue !== undefined) {
            process.env.FACE_VERIFICATION_MIN_MATCH_COUNT = configuredValue;
        }
    }
});

test("a high score from a group photo cannot pass verification", () => {
    assert.equal(isStrongSingleFaceMatch({ similarity: 99, facesDetected: 2 }, 90), false);
    assert.equal(isStrongSingleFaceMatch({ similarity: 92, facesDetected: 1 }, 90), true);
    assert.equal(isStrongSingleFaceMatch({ similarity: 89, facesDetected: 1 }, 90), false);
});

test("face verification passes when enough photos match", () => {
    const result = resolveFaceVerificationOutcome({
        minimumMatchCount: 2,
        similarityThreshold: 90,
        comparisonResults: [
            { decision: "matched", qualityFlags: [] },
            { decision: "matched", qualityFlags: [] },
            { decision: "not_matched", qualityFlags: ["no_match_above_threshold"] },
        ],
    });

    assert.equal(result.finalStatus, "verified");
    assert.equal(result.matchedPhotoCount, 2);
    assert.deepEqual(result.failureReasons, []);
});

test("one strong solo photo match passes even when more profile photos are present", () => {
    const result = resolveFaceVerificationOutcome({
        minimumMatchCount: 1,
        similarityThreshold: 90,
        comparisonResults: [
            { decision: "not_matched", qualityFlags: ["no_match_above_threshold"] },
            { decision: "matched", qualityFlags: [] },
            { decision: "skipped", qualityFlags: [] },
            { decision: "skipped", qualityFlags: [] },
        ],
    });

    assert.equal(result.finalStatus, "verified");
    assert.equal(result.matchedPhotoCount, 1);
    assert.equal(result.decisionSummary.comparedPhotoCount, 2);
});

test("face verification asks for retry when too few photos match", () => {
    const result = resolveFaceVerificationOutcome({
        minimumMatchCount: 2,
        similarityThreshold: 90,
        comparisonResults: [
            { decision: "matched", qualityFlags: [] },
            { decision: "not_matched", qualityFlags: ["no_match_above_threshold"] },
            { decision: "not_matched", qualityFlags: ["multiple_target_faces"] },
        ],
    });

    assert.equal(result.finalStatus, "retry_required");
    assert.equal(result.matchedPhotoCount, 1);
    assert.deepEqual(
        result.failureReasons.sort(),
        ["insufficient_match_count", "no_match_above_threshold"].sort(),
    );
});

test("face verification escalates to manual review when every comparison errors", () => {
    const result = resolveFaceVerificationOutcome({
        minimumMatchCount: 2,
        similarityThreshold: 90,
        comparisonResults: [
            { decision: "error", qualityFlags: ["provider_error"] },
            { decision: "error", qualityFlags: ["provider_error"] },
        ],
    });

    assert.equal(result.finalStatus, "manual_review");
    assert.equal(result.matchedPhotoCount, 0);
    assert.deepEqual(result.failureReasons.sort(), ["insufficient_match_count", "provider_error"].sort());
});

test("provider failure is reviewed when other photos do not match", () => {
    const result = resolveFaceVerificationOutcome({
        minimumMatchCount: 1,
        similarityThreshold: 90,
        comparisonResults: [
            { decision: "error", qualityFlags: ["provider_error"] },
            { decision: "not_matched", qualityFlags: ["no_match_above_threshold"] },
        ],
    });

    assert.equal(result.finalStatus, "manual_review");
});

test("face verification asks for retry when every comparison fails because of retryable image issues", () => {
    const result = resolveFaceVerificationOutcome({
        minimumMatchCount: 2,
        similarityThreshold: 90,
        comparisonResults: [
            { decision: "error", qualityFlags: ["image_too_large"] },
            { decision: "error", qualityFlags: ["invalid_image_parameters"] },
        ],
    });

    assert.equal(result.finalStatus, "retry_required");
    assert.equal(result.matchedPhotoCount, 0);
    assert.deepEqual(
        result.failureReasons.sort(),
        ["image_too_large", "invalid_image_parameters", "insufficient_match_count"].sort(),
    );
});
