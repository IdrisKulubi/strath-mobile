import type { Profile } from '@/hooks/use-profile';

export function hasCompletedProfile(profile: Profile | null | undefined) {
    return !!profile?.profileCompleted || !!profile?.isComplete;
}

export function requiresFaceVerification(profile: Profile | null | undefined) {
    return profile?.faceVerificationRequired !== false;
}

export function hasVerifiedFace(profile: Profile | null | undefined) {
    if (!profile) {
        return false;
    }

    if (!requiresFaceVerification(profile)) {
        return true;
    }

    return profile.faceVerificationStatus === 'verified';
}

export function isWaitlisted(profile: Profile | null | undefined) {
    return profile?.waitlist?.status === 'waitlisted';
}

export function getProfileRoute(profile: Profile | null | undefined) {
    if (!profile || !hasCompletedProfile(profile)) {
        return '/onboarding' as const;
    }

    if (!hasVerifiedFace(profile)) {
        return '/verification' as const;
    }

    // Soft-launch gate: if the user finished onboarding but is on the
    // waitlist, park them on the waitlist screen until admitted.
    if (isWaitlisted(profile)) {
        return '/waitlist' as const;
    }

    return '/(tabs)' as const;
}
