import { eq } from "drizzle-orm";

import { profiles } from "@/db/schema";
import { db } from "@/lib/db";
import { isFaceVerificationPassed } from "@/lib/services/face-verification-policy";

export async function getProfileAccessState(userId: string) {
    const profile = await db.query.profiles.findFirst({
        where: eq(profiles.userId, userId),
    });

    if (!profile) {
        return {
            profile: null,
            hasCompletedProfile: false,
            hasVerifiedFace: false,
            canAccessMatchmaking: false,
        };
    }

    const hasCompletedProfile = !!profile.profileCompleted;
    const hasVerifiedFace =
        !profile.faceVerificationRequired || isFaceVerificationPassed(profile.faceVerificationStatus);
    const canAccessMatchmaking =
        hasCompletedProfile && hasVerifiedFace && !profile.discoveryPaused;

    return {
        profile,
        hasCompletedProfile,
        hasVerifiedFace,
        canAccessMatchmaking,
    };
}

export async function requireMatchmakingAccess(userId: string) {
    const accessState = await getProfileAccessState(userId);

    if (!accessState.profile) {
        throw new Error("Profile not found");
    }

    if (!accessState.canAccessMatchmaking) {
        throw new Error("Face verification required before using matchmaking");
    }

    return accessState;
}
