import { authClient } from '@/lib/auth-client';
import * as SecureStore from 'expo-secure-store';
import { clearCachedProfile } from '@/lib/session-cache';

interface StoredSessionData {
    session: {
        token: string;
        userId: string;
        expiresAt: string;
    };
    user: {
        id: string;
        name?: string;
        email?: string;
        image?: string;
    };
}

// Keys used by @better-auth/expo's expoClient with storagePrefix "strathspace".
// Verified against node_modules/@better-auth/expo/dist/client.mjs which stores:
//   - `${storagePrefix}_cookie`       → JSON map of cookies (incl. session_token)
//   - `${storagePrefix}_session_data` → full /get-session response cached locally
const BA_COOKIE_KEY = 'strathspace_cookie';
const BA_SESSION_DATA_KEY = 'strathspace_session_data';

// Keys used by our custom Apple Sign-In flow.
const APPLE_SESSION_KEY = 'strathspace_session';
const APPLE_TOKEN_KEY = 'strathspace_session_token';
const APPLE_USER_ID_KEY = 'strathspace_user_id';

export interface StoredAuthSnapshot {
    token: string;
    userId: string;
    user?: StoredSessionData['user'];
    source: 'better-auth' | 'apple';
}

async function readBetterAuthSessionData(): Promise<StoredSessionData | null> {
    try {
        const raw = await SecureStore.getItemAsync(BA_SESSION_DATA_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        // Better Auth stores the /get-session response shape which contains
        // { session, user }. Empty cache is sometimes written as "{}".
        if (parsed?.session?.token && parsed?.user?.id) {
            return parsed as StoredSessionData;
        }
        return null;
    } catch {
        return null;
    }
}

async function readBetterAuthCookieToken(): Promise<string | null> {
    try {
        const raw = await SecureStore.getItemAsync(BA_COOKIE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Record<string, { value: string; expires?: string | null }>;
        // Cookie keys look like "strathspace.session_token" or prefixed variants.
        // We accept any key ending in session_token.
        const now = new Date();
        for (const [name, entry] of Object.entries(parsed)) {
            if (!name.includes('session_token')) continue;
            if (!entry?.value) continue;
            if (entry.expires && new Date(entry.expires) < now) continue;
            return entry.value;
        }
        return null;
    } catch {
        return null;
    }
}

async function readAppleSession(): Promise<StoredSessionData | null> {
    try {
        const raw = await SecureStore.getItemAsync(APPLE_SESSION_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as StoredSessionData;
        if (parsed?.session?.token && parsed?.user?.id) return parsed;
        return null;
    } catch {
        return null;
    }
}

/**
 * Reads the stored auth state from local SecureStore WITHOUT making a network
 * call. This is what we use on cold boot to decide whether the user is
 * authenticated — so offline launches never kick the user to the login page.
 *
 * Priority order:
 *   1. Better Auth's own cached session_data (most complete: includes user)
 *   2. Better Auth's cookie store (just token — user will be rehydrated from
 *      the profile cache or a subsequent /api/user/me call)
 *   3. Custom Apple Sign-In session blob
 */
export async function getStoredAuth(): Promise<StoredAuthSnapshot | null> {
    const baSession = await readBetterAuthSessionData();
    if (baSession) {
        return {
            token: baSession.session.token,
            userId: baSession.user.id,
            user: baSession.user,
            source: 'better-auth',
        };
    }

    const apple = await readAppleSession();
    if (apple) {
        return {
            token: apple.session.token,
            userId: apple.user.id,
            user: apple.user,
            source: 'apple',
        };
    }

    const baCookieToken = await readBetterAuthCookieToken();
    if (baCookieToken) {
        // We have a token but no cached user. Caller can proceed as
        // authenticated and let /api/user/me (or the profile cache) fill in
        // the rest later.
        const fallbackUserId = (await SecureStore.getItemAsync(APPLE_USER_ID_KEY)) || '';
        return {
            token: baCookieToken,
            userId: fallbackUserId,
            source: 'better-auth',
        };
    }

    return null;
}

/**
 * Get the auth token, checking every storage location we know about. This
 * purposely does NOT hit the network — callers that need a live session
 * should use /api/user/me or apiFetch instead.
 */
export async function getAuthToken(): Promise<string | null> {
    const snapshot = await getStoredAuth();
    if (snapshot?.token) return snapshot.token;

    // Last-resort legacy key, in case the Apple flow wrote the token on its own
    const legacy = await SecureStore.getItemAsync(APPLE_TOKEN_KEY);
    return legacy || null;
}

/**
 * Get the current user ID from any stored session.
 */
export async function getCurrentUserId(): Promise<string | null> {
    const snapshot = await getStoredAuth();
    if (snapshot?.userId) return snapshot.userId;
    const legacy = await SecureStore.getItemAsync(APPLE_USER_ID_KEY);
    return legacy || null;
}

/**
 * Get the current user data from any stored session.
 */
export async function getCurrentUser(): Promise<StoredSessionData['user'] | null> {
    const snapshot = await getStoredAuth();
    return snapshot?.user ?? null;
}

/**
 * Get auth headers for API requests.
 * Returns headers with Bearer token if authenticated, or empty auth header if not.
 */
export async function getAuthHeaders(): Promise<HeadersInit> {
    const token = await getAuthToken();

    return {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
    };
}

/**
 * Check if user is authenticated (has a valid token stored locally).
 * Purely local check — never makes a network call.
 */
export async function isAuthenticated(): Promise<boolean> {
    const token = await getAuthToken();
    return !!token;
}

/**
 * Clear all session data from both Better Auth and SecureStore.
 * Only call this when the server has explicitly told us the session is dead
 * (see api-client.ts) or when the user signs out manually. Never call on a
 * plain network failure — that would log out offline users.
 */
export async function clearSession(): Promise<void> {
    try {
        try {
            await authClient.signOut();
        } catch {
            // Ignore - session may already be invalid / offline
        }

        const keysToDelete = [
            APPLE_SESSION_KEY,
            APPLE_TOKEN_KEY,
            APPLE_USER_ID_KEY,
            BA_COOKIE_KEY,
            BA_SESSION_DATA_KEY,
        ];

        for (const key of keysToDelete) {
            try {
                await SecureStore.deleteItemAsync(key);
            } catch {
                // Key might not exist, continue
            }
        }

        await clearCachedProfile();

        console.log('[Auth] Session cleared');
    } catch (error) {
        console.error('[Auth] Error clearing session:', error);
    }
}
