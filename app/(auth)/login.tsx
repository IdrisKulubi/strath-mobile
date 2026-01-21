import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    StatusBar,
    Image,
    Pressable,
    ActivityIndicator,
    Platform,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signIn } from '@/lib/auth-client';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { GoogleLogo } from '@/components/icons/google-logo';

// Demo account credentials for Apple Review
const DEMO_EMAIL = "demo@strathspace.com";
const DEMO_PASSWORD = "AppleReview2026!";

export default function LoginScreen() {
    const [loading, setLoading] = useState(false);
    const [demoLoading, setDemoLoading] = useState(false);
    const router = useRouter();
    const toast = useToast();

    const handleGoogleAuth = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setLoading(true);

        try {
            const result = await signIn.social({
                provider: "google",
                callbackURL: "/",
            });

            if (result.data) {
                toast.show({
                    message: 'Welcome to Strathspace',
                    variant: 'success'
                });
                router.replace('/');
            }
        } catch (error) {
            console.error("Auth error:", error);
            toast.show({ message: 'Authentication failed. Please try again.', variant: 'danger' });
        } finally {
            setLoading(false);
        }
    };

    // Demo login for Apple reviewers
    const handleDemoLogin = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setDemoLoading(true);

        try {
            // First, try to seed the demo account (in case it doesn't exist or needs recreation)
            const apiUrl = process.env.EXPO_PUBLIC_API_URL || "https://www.strathspace.com";
            console.log("[Demo Login] Seeding demo account at:", apiUrl);
            
            const seedResponse = await fetch(`${apiUrl}/api/seed-demo`, { method: 'POST' });
            const seedData = await seedResponse.json().catch(() => ({}));
            console.log("[Demo Login] Seed response:", seedData);
            
            // Now attempt login with email/password
            console.log("[Demo Login] Attempting signIn.email with:", DEMO_EMAIL);
            const result = await signIn.email({
                email: DEMO_EMAIL,
                password: DEMO_PASSWORD,
            });

            console.log("[Demo Login] SignIn result:", result);

            if (result.data) {
                toast.show({
                    message: 'Welcome, Demo User!',
                    variant: 'success'
                });
                router.replace('/');
            } else if (result.error) {
                console.error("Demo login error:", result.error);
                toast.show({
                    message: `Demo login failed: ${result.error.message || 'Unknown error'}`,
                    variant: 'danger'
                });
            }
        } catch (error) {
            console.error("Demo auth error:", error);
            toast.show({ message: 'Demo login failed. Please try again.', variant: 'danger' });
        } finally {
            setDemoLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />

            <SafeAreaView style={styles.safeArea}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                    {/* Logo Section */}
                    <Animated.View
                        entering={FadeInDown.delay(100).springify()}
                        style={styles.logoSection}
                    >
                        <Image
                            source={require('@/assets/images/logos/LOGO.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                        <Text style={styles.brandName}>Strathspace</Text>
                    </Animated.View>

                    {/* Headline Section */}
                    <Animated.View
                        entering={FadeInDown.delay(200).springify()}
                        style={styles.headlineSection}
                    >
                        <Text style={styles.headline}>
                            <Text style={styles.headlineLight}>Join Your </Text>
                            <Text style={styles.headlineBold}>Campus{`\n`}Community</Text>
                        </Text>
                        <Text style={styles.subheadline}>Connect, Discover, Vibe – simplified.</Text>
                    </Animated.View>

                    {/* Feature Cards */}
                    <View style={styles.featuresSection}>
                        {/* Connect Card */}
                        <Animated.View entering={FadeInUp.delay(300).springify()}>
                            <Pressable style={styles.connectCard}>
                                <View style={styles.iconCircle}>
                                    <Ionicons name="people-outline" size={22} color="#E91E8C" />
                                </View>
                                <View style={styles.cardTextWrap}>
                                    <Text style={[styles.cardTitle, { color: '#E91E8C' }]}>Connect</Text>
                                    <Text style={styles.cardSubtitle}>Meet classmates with ease</Text>
                                </View>
                                <View style={[styles.arrowCircle, { backgroundColor: '#E91E8C' }]}>
                                    <Ionicons name="chevron-forward" size={18} color="#FFF" />
                                </View>
                            </Pressable>
                        </Animated.View>

                        {/* Discover Card */}
                        <Animated.View entering={FadeInUp.delay(400).springify()}>
                            <Pressable style={styles.discoverCard}>
                                <View style={styles.iconCircle}>
                                    <Ionicons name="sparkles-outline" size={22} color="#FF9800" />
                                </View>
                                <View style={styles.cardTextWrap}>
                                    <Text style={[styles.cardTitle, { color: '#FF9800' }]}>Discover</Text>
                                    <Text style={styles.cardSubtitle}>Uncover shared interests</Text>
                                </View>
                                <View style={[styles.arrowCircle, { backgroundColor: '#FF9800' }]}>
                                    <Ionicons name="chevron-forward" size={18} color="#FFF" />
                                </View>
                            </Pressable>
                        </Animated.View>

                        {/* Vibe Card */}
                        <Animated.View entering={FadeInUp.delay(500).springify()}>
                            <Pressable style={styles.vibeCard}>
                                <View style={styles.iconCircle}>
                                    <Ionicons name="pulse-outline" size={22} color="#00BFA5" />
                                </View>
                                <View style={styles.cardTextWrap}>
                                    <Text style={[styles.cardTitle, { color: '#00BFA5' }]}>Vibe</Text>
                                    <Text style={styles.cardSubtitle}>Find people on your level</Text>
                                </View>
                                <View style={[styles.arrowCircle, { backgroundColor: '#00BFA5' }]}>
                                    <Ionicons name="chevron-forward" size={18} color="#FFF" />
                                </View>
                            </Pressable>
                        </Animated.View>
                    </View>

                    {/* Bottom Auth Section */}
                    <Animated.View
                        entering={FadeInUp.delay(600).springify()}
                        style={styles.authSection}
                    >
                        {/* Google Sign In Button */}
                        <Button
                            onPress={handleGoogleAuth}
                            disabled={loading || demoLoading}
                            variant="secondary"
                            size="lg"
                            className="w-full h-14 rounded-full bg-white border-0 shadow-lg shadow-black/20"
                        >
                            {loading ? (
                                <ActivityIndicator color="#4285F4" size="small" />
                            ) : (
                                <>
                                    <GoogleLogo size={22} />
                                    <Text className="text-lg font-semibold text-gray-900">Continue with Google</Text>
                                </>
                            )}
                        </Button>

                        {/* Demo Login Button - For Apple Review */}
                        <Pressable
                            onPress={handleDemoLogin}
                            disabled={loading || demoLoading}
                            style={({ pressed }) => [
                                styles.demoButton,
                                pressed && styles.demoButtonPressed,
                                (loading || demoLoading) && styles.demoButtonDisabled,
                            ]}
                        >
                            {demoLoading ? (
                                <ActivityIndicator color="#6B7280" size="small" />
                            ) : (
                                <>
                                    <Text style={styles.demoButtonText}>Demo Login (For Review)</Text>
                                </>
                            )}
                        </Pressable>

                        {/* Terms Text - Below Button */}
                        <Text style={styles.termsText}>
                            By continuing, you agree to our{' '}
                            <Text style={styles.termsLink}>Terms</Text>
                        </Text>

                        {/* Sign In Link - Separate Section */}
                        <View style={styles.signInSection}>
                            <Pressable
                                onPress={handleGoogleAuth}
                                style={({ pressed }) => [
                                    styles.signInButton,
                                    pressed && styles.signInButtonPressed,
                                ]}
                            >
                                <Text style={styles.signInText}>
                                    Already have an account?{' '}
                                    <Text style={styles.signInLink}>Sign In</Text>
                                </Text>
                            </Pressable>
                        </View>
                    </Animated.View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    safeArea: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingBottom: Platform.OS === 'ios' ? 20 : 34,
    },

    // Logo
    logoSection: {
        alignItems: 'center',
        marginTop: 16,
    },
    logo: {
        width: 52,
        height: 52,
    },
    brandName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1a1a1a',
        marginTop: 4,
        letterSpacing: 0.2,
    },

    // Headline
    headlineSection: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 20,
    },
    headline: {
        fontSize: 32,
        color: '#1a1a1a',
        textAlign: 'center',
        lineHeight: 40,
    },
    headlineLight: {
        fontWeight: '500',
    },
    headlineBold: {
        fontWeight: '800',
    },
    subheadline: {
        fontSize: 15,
        fontWeight: '500',
        color: '#666',
        marginTop: 10,
    },

    // Features
    featuresSection: {
        marginBottom: 20,
    },

    // Card styles - with equal vertical padding for perfect centering
    connectCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFCFE3',
        borderRadius: 40,
        paddingVertical: 14,
        paddingHorizontal: 14,
        marginBottom: 12,
    },
    discoverCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFE3B6',
        borderRadius: 40,
        paddingVertical: 14,
        paddingHorizontal: 14,
        marginBottom: 12,
    },
    vibeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#C7F4EC',
        borderRadius: 40,
        paddingVertical: 14,
        paddingHorizontal: 14,
        marginBottom: 12,
    },

    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardTextWrap: {
        flex: 1,
        marginLeft: 12,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    cardSubtitle: {
        fontSize: 12,
        color: '#555',
        marginTop: 2,
    },
    arrowCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Auth Section
    authSection: {
        marginTop: 50,
        alignItems: 'center',
        paddingBottom: Platform.OS === 'ios' ? 20 : 30,
    },
    termsText: {
        fontSize: 12,
        color: '#999',
        textAlign: 'center',
        marginTop: 16,
        marginBottom: 40,
    },
    termsLink: {
        color: '#00BFA5',
        fontWeight: '600',
    },
    signInSection: {
        width: '100%',
        alignItems: 'center',
        marginTop: 10,
    },
    signInButton: {
        paddingVertical: 14,
        paddingHorizontal: 20,
    },
    signInButtonPressed: {
        opacity: 0.7,
    },
    signInText: {
        fontSize: 15,
        color: '#555',
        fontWeight: '400',
    },
    signInLink: {
        color: '#E91E8C',
        fontWeight: '700',
    },

    // Demo Login Button
    demoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 25,
        backgroundColor: '#F0F0F0',
        gap: 8,
    },
    demoButtonPressed: {
        opacity: 0.7,
        backgroundColor: '#E5E5E5',
    },
    demoButtonDisabled: {
        opacity: 0.5,
    },
    demoButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6B7280',
    },
});

