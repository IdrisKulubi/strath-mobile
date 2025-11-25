import { Redirect, useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useSession } from '../lib/auth-client';
import { useEffect, useState } from 'react';

export default function Index() {
    const { data: session, isPending } = useSession();
    const [isCheckingProfile, setIsCheckingProfile] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (session) {
            checkProfile();
        }
    }, [session]);

    const checkProfile = async () => {
        setIsCheckingProfile(true);
        try {
            // @ts-ignore
            const token = session?.session?.token;

            const headers: any = { 'Content-Type': 'application/json' };
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
    };

    if (isPending || (session && isCheckingProfile)) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
                <ActivityIndicator size="large" color="#fff" />
            </View>
        );
    }

    if (!session) {
        return <Redirect href="/(auth)/login" />;
    }

    return null;
}
