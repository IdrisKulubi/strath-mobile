const DEFAULT_SESSION_TTL_HOURS = 2;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_THRESHOLD_VERSION = "comparefaces_v1";
const DEFAULT_AUTOPASS_SIMILARITY = 90;
const DEFAULT_MIN_MATCH_COUNT = 2;
const DEFAULT_PROCESSING_MODE = "async";
const DEFAULT_CRON_BATCH_SIZE = 10;

export const FACE_VERIFICATION_STATUSES = {
    NOT_STARTED: "not_started",
    PENDING_CAPTURE: "pending_capture",
    PROCESSING: "processing",
    VERIFIED: "verified",
    RETRY_REQUIRED: "retry_required",
    MANUAL_REVIEW: "manual_review",
    FAILED: "failed",
    BLOCKED: "blocked",
} as const;

export type FaceVerificationStatus =
    typeof FACE_VERIFICATION_STATUSES[keyof typeof FACE_VERIFICATION_STATUSES];

export function getFaceVerificationSessionTtlHours() {
    const value = Number(process.env.FACE_VERIFICATION_SESSION_TTL_HOURS ?? DEFAULT_SESSION_TTL_HOURS);
    return Number.isFinite(value) && value > 0 ? value : DEFAULT_SESSION_TTL_HOURS;
}

export function getFaceVerificationMaxAttempts() {
    const value = Number(process.env.FACE_VERIFICATION_MAX_ATTEMPTS ?? DEFAULT_MAX_ATTEMPTS);
    return Number.isFinite(value) && value >= 1 ? Math.floor(value) : DEFAULT_MAX_ATTEMPTS;
}

export function getFaceVerificationThresholdVersion() {
    return process.env.FACE_VERIFICATION_THRESHOLD_VERSION?.trim() || DEFAULT_THRESHOLD_VERSION;
}

export function getFaceVerificationAutoPassSimilarity() {
    const value = Number(process.env.FACE_VERIFICATION_AUTOPASS_SIMILARITY ?? DEFAULT_AUTOPASS_SIMILARITY);
    return Number.isFinite(value) && value > 0 ? value : DEFAULT_AUTOPASS_SIMILARITY;
}

export function getFaceVerificationMinimumMatchCount() {
    const value = Number(process.env.FACE_VERIFICATION_MIN_MATCH_COUNT ?? DEFAULT_MIN_MATCH_COUNT);
    return Number.isFinite(value) && value >= 1 ? Math.floor(value) : DEFAULT_MIN_MATCH_COUNT;
}

export function getFaceVerificationProcessingMode() {
    const value = process.env.FACE_VERIFICATION_PROCESSING_MODE?.trim().toLowerCase();
    return value === "inline" ? "inline" : DEFAULT_PROCESSING_MODE;
}

export function getFaceVerificationCronBatchSize() {
    const value = Number(process.env.FACE_VERIFICATION_CRON_BATCH_SIZE ?? DEFAULT_CRON_BATCH_SIZE);
    return Number.isFinite(value) && value >= 1 ? Math.min(Math.floor(value), 100) : DEFAULT_CRON_BATCH_SIZE;
}

export function getFaceVerificationMethod() {
    return "rekognition_comparefaces_v1";
}

export function getFaceVerificationExpiryDate(from = new Date()) {
    const expiresAt = new Date(from);
    expiresAt.setHours(expiresAt.getHours() + getFaceVerificationSessionTtlHours());
    return expiresAt;
}

export function isFaceVerificationExpired(expiresAt: Date | string | null | undefined, now = new Date()) {
    if (!expiresAt) {
        return false;
    }

    const expiryDate = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
    return expiryDate.getTime() <= now.getTime();
}

export function isFaceVerificationTerminalStatus(status: string | null | undefined) {
    return new Set<FaceVerificationStatus>([
        FACE_VERIFICATION_STATUSES.VERIFIED,
        FACE_VERIFICATION_STATUSES.RETRY_REQUIRED,
        FACE_VERIFICATION_STATUSES.MANUAL_REVIEW,
        FACE_VERIFICATION_STATUSES.FAILED,
        FACE_VERIFICATION_STATUSES.BLOCKED,
    ]).has((status ?? "") as FaceVerificationStatus);
}

export function isFaceVerificationActiveStatus(status: string | null | undefined) {
    return new Set<FaceVerificationStatus>([
        FACE_VERIFICATION_STATUSES.PENDING_CAPTURE,
        FACE_VERIFICATION_STATUSES.PROCESSING,
    ]).has((status ?? "") as FaceVerificationStatus);
}

export function canRetryFaceVerification(status: string | null | undefined, attemptNumber: number) {
    if (!isFaceVerificationTerminalStatus(status)) {
        return false;
    }

    if (status === FACE_VERIFICATION_STATUSES.VERIFIED || status === FACE_VERIFICATION_STATUSES.BLOCKED) {
        return false;
    }

    return attemptNumber < getFaceVerificationMaxAttempts();
}

export function isFaceVerificationPassed(status: string | null | undefined) {
    return status === FACE_VERIFICATION_STATUSES.VERIFIED;
}
