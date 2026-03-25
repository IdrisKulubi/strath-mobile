import { Redirect, useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useSession } from '../lib/auth-client';
import { useEffect, useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { getAuthToken, clearSession } from '@/lib/auth-helpers';
import { useTheme } from '@/hooks/use-theme';
import { getProfileRoute } from '@/lib/profile-access';

export default function Index() {
    const { data: session, isPending } = useSession();
    const [isCheckingProfile, setIsCheckingProfile] = useState(false);
    const [hasManualSession, setHasManualSession] = useState<boolean | null>(null);
    const router = useRouter();
    const { colors } = useTheme();

    // Check for manually stored session (Apple Sign In)
    useEffect(() => {
        const checkManualSession = async () => {
            try {
                const storedSession = await SecureStore.getItemAsync('strathspace_session');
                if (storedSession) {
                    const parsed = JSON.parse(storedSession);
                    if (parsed?.session?.token && parsed?.user) {
                        console.log("[Index] Found manual session for user:", parsed.user.id);
                        setHasManualSession(true);
                        return;
                    }
                }
            } catch (e) {
                console.error("[Index] Error checking manual session:", e);
            }
            setHasManualSession(false);
        };
        
        if (!session && !isPending) {
            checkManualSession();
        }
    }, [session, isPending]);

    const checkProfile = useCallback(async () => {
        setIsCheckingProfile(true);
        try {
            // Get token using shared helper (handles both Better Auth and Apple Sign In)
            const token = await getAuthToken();

            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/user/me`, {
                headers
            });

            if (res.ok) {
                const responseData = await res.json();
                const nextRoute = getProfileRoute(responseData.data ?? null);
                router.replace(nextRoute as any);
            } else if (res.status === 401) {
                // Session is invalid/expired - clear and go to login
                console.log('[Index] Unauthorized - clearing session and redirecting to login');
                await clearSession();
                router.replace('/(auth)/login');
            } else if (res.status === 404) {
                // Profile not found - go to onboarding to create one
                router.replace('/onboarding' as any);
            } else {
                // Other error - try onboarding as fallback
                console.warn('[Index] Profile check failed with status:', res.status);
                router.replace('/onboarding' as any);
            }
        } catch (e) {
            console.error("Profile check failed:", e);
            // On network failure, go to onboarding which is safer than dumping into tabs with no profile
            router.replace('/onboarding' as any);
        } finally {
            setIsCheckingProfile(false);
        }
    }, [router]);

    useEffect(() => {
        if (session || hasManualSession) {
            checkProfile();
        }
    }, [session, hasManualSession, checkProfile]);

    // Still loading Better Auth session or checking manual session
    if (isPending || hasManualSession === null) {
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: colors.background,
                }}
            >
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if ((session || hasManualSession) && isCheckingProfile) {
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: colors.background,
                }}
            >
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    // No session at all - go to login
    if (!session && !hasManualSession) {
        return <Redirect href="/(auth)/login" />;
    }

    return null;
}
