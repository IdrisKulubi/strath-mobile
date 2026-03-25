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

export function getProfileRoute(profile: Profile | null | undefined) {
    if (!profile || !hasCompletedProfile(profile)) {
        return '/onboarding' as const;
    }

    if (!hasVerifiedFace(profile)) {
        return '/verification' as const;
    }

    return '/(tabs)' as const;
}
