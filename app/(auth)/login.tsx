import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Image, ScrollView } from 'react-native';
import { signIn } from '../../lib/auth-client';
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { error: toastError, success: toastSuccess, info: toastInfo } = useToast();

    const handleLogin = async () => {
        if (!email || !password) {
            toastError('Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await signIn.email({
                email,
                password,
            });

            if (error) {
                toastError(error.message || 'An error occurred');
            } else {
                toastSuccess('Welcome back!');
                router.replace('/');
            }
        } catch (err) {
            toastError('Something went wrong');
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
                callbackURL: "/",
            });
            console.log("signIn.social result:", result);

            if (result.data) {
                console.log("Sign-in successful, redirecting...");
                toastSuccess('Signed in successfully!');
                router.replace('/');
            }
        } catch (error) {
            console.error("Sign in error details:", error);
            toastError('Google sign-in failed');
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

                <Button
                    onPress={handleGoogleSignIn}
                    variant="default"
                    size="lg"
                    className="mb-6 rounded-full bg-[#e91e8c]"
                >
                    <View style={styles.googleIconContainer}>
                        <Ionicons name="logo-google" size={20} color="#e91e8c" />
                    </View>
                    <Text style={styles.googleButtonText}>Continue with Google</Text>
                </Button>

                <View style={styles.dividerContainer}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>OR</Text>
                    <View style={styles.dividerLine} />
                </View>

                <View style={styles.form}>
                    <Input
                        placeholder="Uni Email"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        className="mb-4 bg-white/5 border-[#e91e8c]/50 text-white placeholder:text-gray-400"
                        startContent={
                            <Ionicons name="mail-outline" size={20} color="#e91e8c" />
                        }
                    />

                    <Input
                        placeholder="Password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        className="mb-4 bg-white/5 border-[#e91e8c]/50 text-white placeholder:text-gray-400"
                        startContent={
                            <Ionicons name="lock-closed-outline" size={20} color="#e91e8c" />
                        }
                    />

                    <Button
                        onPress={handleLogin}
                        disabled={loading}
                        size="lg"
                        className="mt-2 rounded-full bg-[#e91e8c]"
                    >
                        {loading ? <Text className="text-white font-bold">Loading...</Text> : <Text className="text-white font-bold text-lg">Log In</Text>}
                    </Button>
                </View>

                <View style={styles.footer}>
                    <TouchableOpacity onPress={() => toastInfo('Reset password flow coming soon!')}>
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
        marginTop: 60,
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
