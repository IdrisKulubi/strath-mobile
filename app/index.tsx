import { Redirect, useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useSession } from '../lib/auth-client';
import { useEffect, useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { getAuthToken } from '@/lib/auth-helpers';

export default function Index() {
    const { data: session, isPending } = useSession();
    const [isCheckingProfile, setIsCheckingProfile] = useState(false);
    const [hasManualSession, setHasManualSession] = useState<boolean | null>(null);
    const router = useRouter();

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
                // Check both fields just in case
                const isComplete = responseData.data?.isComplete || responseData.data?.profileCompleted;

                if (isComplete) {
                    router.replace('/(tabs)');
                } else {
                    router.replace('/onboarding' as any);
                }
            } else {
                // If we can't fetch profile, assume incomplete or error. 
                // For safety, let's go to onboarding so they can try to set it up.
                router.replace('/onboarding' as any);
            }
        } catch (e) {
            console.error("Profile check failed:", e);
            router.replace('/(tabs)'); // Fallback to tabs if completely failed
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
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
                <ActivityIndicator size="large" color="#fff" />
            </View>
        );
    }

    // Checking profile after finding a session
    if ((session || hasManualSession) && isCheckingProfile) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
                <ActivityIndicator size="large" color="#fff" />
            </View>
        );
    }

    // No session at all - go to login
    if (!session && !hasManualSession) {
        return <Redirect href="/(auth)/login" />;
    }

    return null;
}
