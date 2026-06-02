export type DecisionSummary = {
    matchedPhotoCount: number | null;
    comparedPhotoCount: number | null;
    similarityThreshold: number | null;
    minimumMatchCount: number | null;
    sourceFacesDetected: number | null;
    usableProfilePhotoCount: number | null;
    candidateProfilePhotoCount: number | null;
};

export function parseDecisionSummary(raw: Record<string, unknown> | null | undefined): DecisionSummary {
    if (!raw || typeof raw !== 'object') {
        return {
            matchedPhotoCount: null,
            comparedPhotoCount: null,
            similarityThreshold: null,
            minimumMatchCount: null,
            sourceFacesDetected: null,
            usableProfilePhotoCount: null,
            candidateProfilePhotoCount: null,
        };
    }

    return {
        matchedPhotoCount: pickNumber(raw.matchedPhotoCount),
        comparedPhotoCount: pickNumber(raw.comparedPhotoCount),
        similarityThreshold: pickNumber(raw.similarityThreshold),
        minimumMatchCount: pickNumber(raw.minimumMatchCount),
        sourceFacesDetected: pickNumber(raw.sourceFacesDetected),
        usableProfilePhotoCount: pickNumber(raw.usableProfilePhotoCount),
        candidateProfilePhotoCount: pickNumber(raw.candidateProfilePhotoCount),
    };
}

function pickNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

export function formatVerificationTimestamp(value: string | Date) {
    const date = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) {
        return null;
    }
    return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

export function formatDecisionLabel(decision: string) {
    switch (decision) {
        case 'matched':
            return 'Match';
        case 'not_matched':
            return 'Below threshold';
        case 'error':
            return 'Could not read';
        case 'skipped':
            return 'Skipped';
        default:
            return decision.replace(/_/g, ' ');
    }
}

const FAILURE_REASON_LABELS: Record<string, string> = {
    insufficient_match_count: 'Not enough photos matched closely enough to your selfie.',
    selfie_face_not_detected: 'We could not detect a clear face in your selfie.',
    no_face_detected: 'At least one profile photo did not show a readable face.',
    multiple_faces_detected: 'A profile photo showed more than one face.',
    multiple_target_faces: 'A profile photo looked like it had multiple faces to match.',
    missing_verification_assets: 'Some verification files were missing when we ran the check.',
    insufficient_usable_profile_photos: 'Not enough profile photos passed the quality bar.',
    invalid_image_format: 'An image used a format we could not process.',
    invalid_image_parameters: 'An image had settings we could not process.',
    image_too_large: 'An image file was too large to process.',
    image_processing_failed: 'An image failed processing on our side.',
    provider_error: 'The verification provider returned an error.',
};

const QUALITY_FLAG_LABELS: Record<string, string> = {
    no_face_detected: 'No clear face',
    multiple_faces_detected: 'Multiple faces',
    multiple_target_faces: 'Multiple faces in target',
    image_too_large: 'Image too large',
    invalid_image_format: 'Unsupported format',
    invalid_image_parameters: 'Bad image parameters',
    image_processing_failed: 'Processing failed',
    provider_error: 'Provider error',
};

export function humanizeFailureReason(code: string) {
    return (
        FAILURE_REASON_LABELS[code] ??
        code.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    );
}

export function humanizeQualityFlag(code: string) {
    return QUALITY_FLAG_LABELS[code] ?? code.replace(/_/g, ' ');
}

export function getMatchOutcomeSummary(summary: DecisionSummary): string | null {
    if (summary.matchedPhotoCount !== null && summary.comparedPhotoCount !== null) {
        return `${summary.matchedPhotoCount} of ${summary.comparedPhotoCount} profile photos matched your selfie.`;
    }
    if (summary.matchedPhotoCount !== null) {
        return `${summary.matchedPhotoCount} profile photo${summary.matchedPhotoCount === 1 ? '' : 's'} matched your selfie.`;
    }
    return null;
}
