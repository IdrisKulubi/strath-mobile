import { FACE_VERIFICATION_STATUSES } from "@/lib/services/face-verification-policy";

export interface FaceVerificationComparisonDecisionInput {
    decision: string;
    qualityFlags: string[];
}

export function resolveFaceVerificationOutcome(input: {
    minimumMatchCount: number;
    similarityThreshold: number;
    comparisonResults: FaceVerificationComparisonDecisionInput[];
}) {
    const matchedPhotoCount = input.comparisonResults.filter(
        (result) => result.decision === "matched",
    ).length;

    const allFailureReasons = Array.from(
        new Set(
            input.comparisonResults.flatMap((result) => result.qualityFlags).concat(
                matchedPhotoCount >= input.minimumMatchCount ? [] : ["insufficient_match_count"],
            ),
        ),
    );

    const finalStatus =
        matchedPhotoCount >= input.minimumMatchCount
            ? FACE_VERIFICATION_STATUSES.VERIFIED
            : input.comparisonResults.every((result) => result.decision === "error")
            ? FACE_VERIFICATION_STATUSES.MANUAL_REVIEW
            : FACE_VERIFICATION_STATUSES.RETRY_REQUIRED;

    return {
        matchedPhotoCount,
        failureReasons: finalStatus === FACE_VERIFICATION_STATUSES.VERIFIED ? [] : allFailureReasons,
        finalStatus,
        decisionSummary: {
            matchedPhotoCount,
            comparedPhotoCount: input.comparisonResults.length,
            similarityThreshold: input.similarityThreshold,
            minimumMatchCount: input.minimumMatchCount,
        },
    };
}
