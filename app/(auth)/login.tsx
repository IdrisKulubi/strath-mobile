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

export default function LoginScreen() {
    const [loading, setLoading] = useState(false);
    const [appleLoading, setAppleLoading] = useState(false);
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
                    message: 'Sign in canceled. You can try Google below.'
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
                            <Text style={styles.headlineLight}>Real connections,{`\n`}</Text>
                            <Text style={styles.headlineBold}>no swiping.</Text>
                        </Text>
                        <Text style={styles.subheadline}>Find people at your university who actually get you.</Text>
                    </Animated.View>

                    {/* Feature Pills */}
                    <Animated.View entering={FadeInUp.delay(300).springify()} style={styles.featuresSection}>
                        <View style={styles.pillRow}>
                            <View style={[styles.pill, { backgroundColor: '#FFCFE3' }]}>
                                <Ionicons name="heart-outline" size={15} color="#E91E8C" />
                                <Text style={[styles.pillText, { color: '#C2185B' }]}>Meaningful matches</Text>
                            </View>
                            <View style={[styles.pill, { backgroundColor: '#FFE3B6' }]}>
                                <Ionicons name="school-outline" size={15} color="#E65100" />
                                <Text style={[styles.pillText, { color: '#E65100' }]}>Campus verified</Text>
                            </View>
                        </View>
                        <View style={styles.pillRow}>
                            <View style={[styles.pill, { backgroundColor: '#C7F4EC' }]}>
                                <Ionicons name="gift-outline" size={15} color="#00796B" />
                                <Text style={[styles.pillText, { color: '#00796B' }]}>Weekly drops</Text>
                            </View>
                            <View style={[styles.pill, { backgroundColor: '#E8E0FF' }]}>
                                <Ionicons name="chatbubble-ellipses-outline" size={15} color="#5E35B1" />
                                <Text style={[styles.pillText, { color: '#5E35B1' }]}>Real conversations</Text>
                            </View>
                        </View>
                    </Animated.View>

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
                            disabled={loading || appleLoading}
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

    // Feature Pills
    featuresSection: {
        marginBottom: 20,
        gap: 10,
    },
    pillRow: {
        flexDirection: 'row',
        gap: 10,
    },
    pill: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 20,
    },
    pillText: {
        fontSize: 13,
        fontWeight: '600',
        flexShrink: 1,
    },

    // Auth Section
    authSection: {
        marginTop: 32,
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

