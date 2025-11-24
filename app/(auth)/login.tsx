import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, StatusBar, Image, ScrollView } from 'react-native';
import { signIn } from '../../lib/auth-client';
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { NeonInput } from '@/components/ui/neon-input';
import { GradientButton } from '@/components/ui/gradient-button';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await signIn.email({
                email,
                password,
            });

            if (error) {
                Alert.alert('Login Failed', error.message || 'An error occurred');
            } else {
                router.replace('/(tabs)');
            }
        } catch (err) {
            Alert.alert('Error', 'Something went wrong');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        console.log("Google Sign-In button pressed");
        try {
            console.log("Starting signIn.social...");
            console.log("API URL:", process.env.EXPO_PUBLIC_API_URL);
            const result = await signIn.social({
                provider: "google",
                callbackURL: "/(tabs)",
            });
            console.log("signIn.social result:", result);

            if (result.data) {
                console.log("Sign-in successful, redirecting...");
                router.replace('/(tabs)');
            }
        } catch (error) {
            console.error("Sign in error details:", error);
            Alert.alert('Error', 'Google sign-in failed');
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.logoContainer}>
                    <Image
                        source={require('@/assets/images/logos/LOGO.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <Text style={styles.appName}>Strathspace</Text>
                </View>

                <Text style={styles.title}>Welcome Back to{'\n'}Campus,😉</Text>

                <TouchableOpacity
                    style={styles.googleButton}
                    onPress={handleGoogleSignIn}
                >
                    <View style={styles.googleIconContainer}>
                        <Ionicons name="logo-google" size={20} color="#e91e8c" />
                    </View>
                    <Text style={styles.googleButtonText}>Continue with Google</Text>
                </TouchableOpacity>

                <View style={styles.dividerContainer}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>OR</Text>
                    <View style={styles.dividerLine} />
                </View>

                <View style={styles.form}>
                    <NeonInput
                        placeholder="Uni Email"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        borderColor="#e91e8c"
                        glowColor="#e91e8c"
                        icon="mail-outline"
                    />

                    <NeonInput
                        placeholder="Password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        borderColor="#e91e8c"
                        glowColor="#e91e8c"
                        icon="lock-closed-outline"
                    />

                    <GradientButton
                        title="Log In"
                        onPress={handleLogin}
                        loading={loading}
                        style={styles.loginButton}
                    />
                </View>

                <View style={styles.footer}>
                    <TouchableOpacity onPress={() => Alert.alert('Info', 'Reset password flow coming soon!')}>
                        <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                    </TouchableOpacity>

                    <Link href="/(auth)/register" asChild>
                        <TouchableOpacity style={styles.signupLink}>
                            <Text style={styles.footerText}>
                                Don't have an account? <Text style={styles.linkText}>Sign Up</Text>
                            </Text>
                        </TouchableOpacity>
                    </Link>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a0d2e', // Deep Purple Background
    },
    scrollContent: {
        flexGrow: 1,
        padding: 24,
        justifyContent: 'center',
    },
    logoContainer: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 40,
        marginTop: 60, // Moved down a bit as requested
    },
    logo: {
        width: 40,
        height: 40,
        marginRight: 10,
    },
    appName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#e91e8c', // Pink
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 30,
        textAlign: 'center',
        lineHeight: 40,
    },
    googleButton: {
        width: '100%',
        height: 56,
        borderRadius: 28,
        backgroundColor: '#e91e8c', // Pink background
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: '#e91e8c',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    googleIconContainer: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    googleButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#666',
    },
    dividerText: {
        color: '#FFF',
        paddingHorizontal: 16,
        fontSize: 14,
        fontWeight: '600',
    },
    form: {
        marginBottom: 20,
    },
    loginButton: {
        marginTop: 10,
        backgroundColor: '#e91e8c', // Ensure it matches the theme if GradientButton supports style override or we might need to update GradientButton too if it forces gradient
    },
    footer: {
        alignItems: 'center',
        marginTop: 10,
    },
    forgotPasswordText: {
        color: '#FFF',
        fontSize: 14,
        marginBottom: 16,
    },
    signupLink: {
        marginTop: 8,
    },
    footerText: {
        color: '#CCC',
        fontSize: 14,
    },
    linkText: {
        color: '#FFF',
        fontWeight: 'bold',
    },
});
