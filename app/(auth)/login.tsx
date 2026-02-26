import React, { useState, useEffect } from 'react';
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
import * as AppleAuthentication from 'expo-apple-authentication';

// Demo account credentials for Apple Review
const DEMO_EMAIL = "demo@strathspace.com";
const DEMO_PASSWORD = "AppleReview2026!";

export default function LoginScreen() {
    const [loading, setLoading] = useState(false);
    const [appleLoading, setAppleLoading] = useState(false);
    const [demoLoading, setDemoLoading] = useState(false);
    const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);
    const router = useRouter();
    const toast = useToast();

    // Check if Apple Authentication is available on this device
    useEffect(() => {
        const checkAppleAuth = async () => {
            if (Platform.OS === 'ios') {
                try {
                    const isAvailable = await AppleAuthentication.isAvailableAsync();
                    console.log("[Apple Auth] Available:", isAvailable);
                    setAppleAuthAvailable(isAvailable);
                } catch (error) {
                    console.log("[Apple Auth] Check failed:", error);
                    setAppleAuthAvailable(false);
                }
            }
        };
        checkAppleAuth();
    }, []);

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
            const apiUrl = process.env.EXPO_PUBLIC_API_URL || "https://www.strathspace.com";
            console.log("[Demo Login] Starting demo login flow at:", apiUrl);
            
            // Step 1: Seed the demo account (creates or recreates with correct password)
            console.log("[Demo Login] Seeding demo account...");
            const seedResponse = await fetch(`${apiUrl}/api/seed-demo`, { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            
            const seedData = await seedResponse.json().catch(() => ({ error: 'Failed to parse response' }));
            console.log("[Demo Login] Seed response:", JSON.stringify(seedData));
            
            if (!seedResponse.ok) {
                console.error("[Demo Login] Seed failed:", seedData);
                // Continue anyway - the account might already exist and be valid
            }
            
            // Step 2: Wait a moment for the database to settle
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Step 3: Attempt login with email/password
            console.log("[Demo Login] Attempting signIn.email with:", DEMO_EMAIL);
            const result = await signIn.email({
                email: DEMO_EMAIL,
                password: DEMO_PASSWORD,
            });

            console.log("[Demo Login] SignIn result:", JSON.stringify(result));

            if (result.data) {
                toast.show({
                    message: 'Welcome, Demo User!',
                    variant: 'success'
                });
                router.replace('/');
                return;
            }
            
            // If first attempt failed, try seeding again and retry
            if (result.error) {
                console.log("[Demo Login] First attempt failed, retrying with fresh seed...");
                
                // Re-seed the account
                await fetch(`${apiUrl}/api/seed-demo`, { 
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                });
                
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Retry login
                const retryResult = await signIn.email({
                    email: DEMO_EMAIL,
                    password: DEMO_PASSWORD,
                });
                
                console.log("[Demo Login] Retry result:", JSON.stringify(retryResult));
                
                if (retryResult.data) {
                    toast.show({
                        message: 'Welcome, Demo User!',
                        variant: 'success'
                    });
                    router.replace('/');
                    return;
                }
                
                // Show specific error message
                const errorMsg = retryResult.error?.message || result.error?.message || 'Unknown error';
                console.error("[Demo Login] Final error:", errorMsg);
                toast.show({
                    message: `Demo login failed: ${errorMsg}. Please try again.`,
                    variant: 'danger'
                });
            }
        } catch (error: any) {
            console.error("[Demo Login] Exception:", error);
            toast.show({ 
                message: `Demo login error: ${error.message || 'Network error'}. Please check your connection and try again.`, 
                variant: 'danger' 
            });
        } finally {
            setDemoLoading(false);
        }
    };

    // Sign in with Apple
    const handleAppleAuth = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setAppleLoading(true);

        try {
            const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
            });

            console.log("[Apple Auth] Got credential, user:", credential.user);

            // Send the credential to our backend for verification and user creation/login
            const apiUrl = process.env.EXPO_PUBLIC_API_URL || "https://www.strathspace.com";
            const response = await fetch(`${apiUrl}/api/auth/apple`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    identityToken: credential.identityToken,
                    authorizationCode: credential.authorizationCode,
                    fullName: credential.fullName,
                    email: credential.email,
                    user: credential.user,
                }),
            });

            const data = await response.json();
            console.log("[Apple Auth] Backend response:", data);

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Apple sign in failed');
            }

            // Store the session token in SecureStore with Better Auth's expected format
            // Better Auth expo client uses prefix "strathspace" and stores session data
            const SecureStore = await import('expo-secure-store');
            
            if (data.data?.token && data.data?.user) {
                // Store session in Better Auth's expected format
                const sessionData = {
                    session: {
                        token: data.data.token,
                        userId: data.data.user.id,
                        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    },
                    user: data.data.user,
                };
                
                await SecureStore.setItemAsync('strathspace_session', JSON.stringify(sessionData));
                console.log("[Apple Auth] Session stored in SecureStore");
                
                // Also store just the token for API calls
                await SecureStore.setItemAsync('strathspace_session_token', data.data.token);
            }

            toast.show({
                message: 'Welcome to Strathspace!',
                variant: 'success'
            });
            
            // Always route through index so it can check profile existence
            // index.tsx handles: 404 → onboarding, complete profile → tabs, incomplete → onboarding
            console.log("[Apple Auth] Routing through index for profile check (isNewUser:", data.data?.isNewUser, ")");
            router.replace('/');
        } catch (error: any) {
            if (error.code === 'ERR_REQUEST_CANCELED' || error.code === 'ERR_CANCELED') {
                // User canceled the sign-in flow - show helpful message about alternatives
                console.log("[Apple Auth] User canceled sign-in");
                toast.show({ 
                    message: 'Sign in canceled. You can try Google or Demo login below.'
                });
                return;
            }
            console.error("Apple auth error:", error);
            toast.show({ 
                message: error.message || 'Apple sign in failed. Please try again.', 
                variant: 'danger' 
            });
        } finally {
            setAppleLoading(false);
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
                        {/* Sign in with Apple - FIRST for iOS (Apple Guidelines 4.8) */}
                        {/* Must be shown as equivalent option to other login methods */}
                        {appleAuthAvailable && (
                            <View style={styles.appleButtonContainer}>
                                <AppleAuthentication.AppleAuthenticationButton
                                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                                    buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                                    cornerRadius={28}
                                    style={styles.appleButton}
                                    onPress={handleAppleAuth}
                                />
                                {appleLoading && (
                                    <View style={styles.appleLoadingOverlay}>
                                        <ActivityIndicator color="#FFFFFF" size="small" />
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Google Sign In Button */}
                        <Button
                            onPress={handleGoogleAuth}
                            disabled={loading || demoLoading}
                            variant="secondary"
                            size="lg"
                            className="w-full h-14 rounded-full bg-white border-0 shadow-lg shadow-black/20"
                            style={{ marginTop: appleAuthAvailable ? 12 : 0 }}
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

                        {/* Demo Login Section - For Apple Review */}
                        <View style={styles.demoContainer}>
                            <Text style={styles.demoLabel}>For Apple Reviewers:</Text>
                            <Pressable
                                onPress={handleDemoLogin}
                                disabled={loading || demoLoading || appleLoading}
                                style={({ pressed }) => [
                                    styles.demoButton,
                                    pressed && styles.demoButtonPressed,
                                    (loading || demoLoading || appleLoading) && styles.demoButtonDisabled,
                                ]}
                            >
                                {demoLoading ? (
                                    <ActivityIndicator color="#6B7280" size="small" />
                                ) : (
                                    <Text style={styles.demoButtonText}>Demo Login</Text>
                                )}
                            </Pressable>
                            <Text style={styles.demoCredentials}>
                                Email: demo@strathspace.com{"\n"}
                                Password: AppleReview2026!
                            </Text>
                        </View>

                        {/* Terms Text - Below Button */}
                        <Text style={styles.termsText}>
                            By continuing, you agree to our{' '}
                            <Text 
                                style={styles.termsLink}
                                onPress={() => router.push('/legal?section=terms')}
                            >
                                Terms of Service
                            </Text>
                            {' '}and{' '}
                            <Text 
                                style={styles.termsLink}
                                onPress={() => router.push('/legal?section=privacy')}
                            >
                                Privacy Policy
                            </Text>
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
        width: '100%',
        maxWidth: 400, // Limit width on iPad for better UX
        alignSelf: 'center',
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

    // Demo Login Section
    demoContainer: {
        marginTop: 24,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#E5E5E5',
        alignItems: 'center',
        width: '100%',
    },
    demoLabel: {
        fontSize: 13,
        color: '#6B7280',
        marginBottom: 12,
        fontWeight: '600',
    },
    demoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 25,
        backgroundColor: '#F0F0F0',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    demoButtonPressed: {
        opacity: 0.7,
        backgroundColor: '#E5E5E5',
    },
    demoButtonDisabled: {
        opacity: 0.5,
    },
    demoButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#6B7280',
    },
    demoCredentials: {
        fontSize: 12,
        color: '#9CA3AF',
        textAlign: 'center',
        marginTop: 12,
        lineHeight: 18,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },

    // Apple Sign In Button
    appleButtonContainer: {
        width: '100%',
        marginTop: 12,
        position: 'relative',
    },
    appleButton: {
        width: '100%',
        height: 56,
    },
    appleLoadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 28,
    },
});

