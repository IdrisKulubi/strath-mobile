import { FACE_VERIFICATION_STATUSES } from "@/lib/services/face-verification-policy";

const RETRYABLE_IMAGE_ERROR_FLAGS = new Set([
    "image_too_large",
    "invalid_image_format",
    "invalid_image_parameters",
    "image_processing_failed",
]);

export interface FaceVerificationComparisonDecisionInput {
    decision: string;
    qualityFlags: string[];
}

function getEvaluatedComparisonResults(results: FaceVerificationComparisonDecisionInput[]) {
    return results.filter((result) => result.decision !== "skipped");
}

export function resolveFaceVerificationOutcome(input: {
    minimumMatchCount: number;
    similarityThreshold: number;
    comparisonResults: FaceVerificationComparisonDecisionInput[];
}) {
    const evaluatedResults = getEvaluatedComparisonResults(input.comparisonResults);
    const matchedPhotoCount = evaluatedResults.filter((result) => result.decision === "matched").length;

    const failureReasons = buildFailureReasons({
        comparisonResults: evaluatedResults,
        matchedPhotoCount,
        minimumMatchCount: input.minimumMatchCount,
    });

    const finalStatus =
        matchedPhotoCount >= input.minimumMatchCount
            ? FACE_VERIFICATION_STATUSES.VERIFIED
            : evaluatedResults.length === 0
              ? FACE_VERIFICATION_STATUSES.RETRY_REQUIRED
              : evaluatedResults.every((result) => result.decision === "error")
                ? evaluatedResults.every((result) =>
                      result.qualityFlags.every((flag) => RETRYABLE_IMAGE_ERROR_FLAGS.has(flag)),
                  )
                    ? FACE_VERIFICATION_STATUSES.RETRY_REQUIRED
                    : FACE_VERIFICATION_STATUSES.MANUAL_REVIEW
                : FACE_VERIFICATION_STATUSES.RETRY_REQUIRED;

    return {
        matchedPhotoCount,
        failureReasons: finalStatus === FACE_VERIFICATION_STATUSES.VERIFIED ? [] : failureReasons,
        finalStatus,
        decisionSummary: {
            matchedPhotoCount,
            comparedPhotoCount: evaluatedResults.length,
            similarityThreshold: input.similarityThreshold,
            minimumMatchCount: input.minimumMatchCount,
        },
    };
}

function buildFailureReasons(input: {
    comparisonResults: FaceVerificationComparisonDecisionInput[];
    matchedPhotoCount: number;
    minimumMatchCount: number;
}) {
    const flagCounts = new Map<string, number>();

    for (const result of input.comparisonResults) {
        for (const flag of result.qualityFlags) {
            flagCounts.set(flag, (flagCounts.get(flag) ?? 0) + 1);
        }
    }

    const failureReasons: string[] = [];

    for (const [flag, count] of flagCounts.entries()) {
        if (shouldIncludeFailureFlag(flag, count, input.comparisonResults.length)) {
            failureReasons.push(flag);
        }
    }

    if (input.matchedPhotoCount < input.minimumMatchCount) {
        failureReasons.push("insufficient_match_count");
    }

    return Array.from(new Set(failureReasons));
}

function shouldIncludeFailureFlag(flag: string, count: number, totalResults: number) {
    if (PRIMARY_FAILURE_FLAGS.has(flag)) {
        return true;
    }

    if (NOISY_PHOTO_FLAGS.has(flag)) {
        return count >= 2 || count === totalResults;
    }

    return count >= 1;
}

const PRIMARY_FAILURE_FLAGS = new Set([
    "selfie_face_not_detected",
    "missing_verification_assets",
    "insufficient_usable_profile_photos",
]);

const NOISY_PHOTO_FLAGS = new Set([
    "multiple_target_faces",
    "multiple_faces_detected",
    "no_face_detected",
]);
