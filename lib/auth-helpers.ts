import { authClient } from '@/lib/auth-client';
import * as SecureStore from 'expo-secure-store';

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

/**
 * Get the auth token, checking both Better Auth session and SecureStore fallback.
 * This is needed because Apple Sign In stores the token in SecureStore directly,
 * while Google Sign In uses Better Auth's session management.
 */
export async function getAuthToken(): Promise<string | null> {
    // First try Better Auth session
    const session = await authClient.getSession();
    const sessionToken = session?.data?.session?.token;
    
    if (sessionToken) {
        return sessionToken;
    }
    
    // Fallback to SecureStore (for Apple Sign In)
    const storedToken = await SecureStore.getItemAsync('strathspace_session_token');
    return storedToken || null;
}

/**
 * Get the current user ID from session or SecureStore.
 */
export async function getCurrentUserId(): Promise<string | null> {
    // First try Better Auth session
    const session = await authClient.getSession();
    const userId = session?.data?.user?.id;
    
    if (userId) {
        return userId;
    }
    
    // Fallback to SecureStore (for Apple Sign In)
    const storedSession = await SecureStore.getItemAsync('strathspace_session');
    if (storedSession) {
        try {
            const parsed: StoredSessionData = JSON.parse(storedSession);
            return parsed.user?.id || parsed.session?.userId || null;
        } catch {
            return null;
        }
    }
    
    return null;
}

/**
 * Get the current user data from session or SecureStore.
 */
export async function getCurrentUser(): Promise<StoredSessionData['user'] | null> {
    // First try Better Auth session
    const session = await authClient.getSession();
    const user = session?.data?.user;
    
    if (user?.id) {
        return user as StoredSessionData['user'];
    }
    
    // Fallback to SecureStore (for Apple Sign In)
    const storedSession = await SecureStore.getItemAsync('strathspace_session');
    if (storedSession) {
        try {
            const parsed: StoredSessionData = JSON.parse(storedSession);
            return parsed.user || null;
        } catch {
            return null;
        }
    }
    
    return null;
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
 * Check if user is authenticated (has a valid token).
 */
export async function isAuthenticated(): Promise<boolean> {
    const token = await getAuthToken();
    return !!token;
}
