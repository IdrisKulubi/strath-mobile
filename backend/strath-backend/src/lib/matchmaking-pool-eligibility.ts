import { eq, isNotNull, or, type SQL } from "drizzle-orm";

import { profiles } from "@/db/schema";
import { FACE_VERIFICATION_STATUSES, isFaceVerificationPassed } from "@/lib/services/face-verification-policy";

/**
 * Minimal profile fields for deciding if someone has finished the first (face) verification.
 * Shared by admin manual matchmaking, suggestions, and any other pool UIs.
 */
export interface ProfileFaceVerificationFields {
    faceVerificationStatus: string | null;
    faceVerifiedAt?: Date | string | null;
}

/**
 * True when the user has completed initial face verification successfully.
 * Uses canonical status check plus legacy rows that only set `faceVerifiedAt`.
 */
export function hasCompletedInitialFaceVerification(profile: ProfileFaceVerificationFields): boolean {
    return isFaceVerificationPassed(profile.faceVerificationStatus) || Boolean(profile.faceVerifiedAt);
}

/** Drizzle WHERE fragment: profile has passed initial face verification. */
export function faceVerifiedProfileWhereClause(): SQL {
    return or(
        eq(profiles.faceVerificationStatus, FACE_VERIFICATION_STATUSES.VERIFIED),
        isNotNull(profiles.faceVerifiedAt),
    )!;
}

/**
 * Admin manual matchmaking pool: only people who have passed the first face check.
 */
export function isEligibleForAdminManualMatchmakingPool(profile: ProfileFaceVerificationFields): boolean {
    return hasCompletedInitialFaceVerification(profile);
}
