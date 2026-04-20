import * as SecureStore from 'expo-secure-store';
import type { Profile } from '@/hooks/use-profile';
import { getProfileRoute } from '@/lib/profile-access';

/**
 * Local cache for the minimal identity + routing info we need to boot the
 * authenticated UI instantly, even without a network connection.
 *
 * Principle: the presence of a token in SecureStore (see auth-helpers.ts) is
 * the source of truth for "am I logged in?". This cache is the source of
 * truth for "where should I land?" so the user never sees a blank/login screen
 * while offline.
 */

const CACHE_KEY = 'strathspace_profile_cache_v1';

export type CachedProfileRoute = '/onboarding' | '/verification' | '/(tabs)';

export interface CachedProfileSnapshot {
    userId: string;
    route: CachedProfileRoute;
    profileCompleted: boolean;
    faceVerified: boolean;
    updatedAt: number;
}

export async function getCachedProfile(): Promise<CachedProfileSnapshot | null> {
    try {
        const raw = await SecureStore.getItemAsync(CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as CachedProfileSnapshot;
        if (!parsed?.userId || !parsed?.route) return null;
        return parsed;
    } catch (error) {
        console.warn('[session-cache] Failed to read cache:', error);
        return null;
    }
}

export async function setCachedProfile(
    userId: string,
    profile: Profile | null | undefined
): Promise<void> {
    try {
        const route = getProfileRoute(profile);
        const snapshot: CachedProfileSnapshot = {
            userId,
            route,
            profileCompleted: !!(profile?.profileCompleted || profile?.isComplete),
            faceVerified: profile?.faceVerificationStatus === 'verified' || profile?.faceVerificationRequired === false,
            updatedAt: Date.now(),
        };
        await SecureStore.setItemAsync(CACHE_KEY, JSON.stringify(snapshot));
    } catch (error) {
        console.warn('[session-cache] Failed to write cache:', error);
    }
}

export async function clearCachedProfile(): Promise<void> {
    try {
        await SecureStore.deleteItemAsync(CACHE_KEY);
    } catch {
        // ignore - nothing to clear
    }
}
