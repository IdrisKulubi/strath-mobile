import test from "node:test";
import assert from "node:assert/strict";

import { resolveFaceVerificationOutcome } from "@/lib/services/face-verification-decision";

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
        ["insufficient_match_count", "multiple_target_faces", "no_match_above_threshold"].sort(),
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
