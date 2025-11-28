import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, StatusBar, Image, ScrollView } from 'react-native';
import { signIn } from '../../lib/auth-client';
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, TextField, toast } from 'heroui-native';
import { Text } from '@/components/ui/text';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async () => {
        if (!email || !password) {
            toast('Please fill in all fields', { variant: 'error' });
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await signIn.email({
                email,
                password,
            });

            if (error) {
                toast(error.message || 'An error occurred', { variant: 'error' });
            } else {
                toast('Welcome back!', { variant: 'success' });
                router.replace('/');
            }
        } catch (err) {
            toast('Something went wrong', { variant: 'error' });
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
                toast('Signed in successfully!', { variant: 'success' });
                router.replace('/');
            }
        } catch (error) {
            console.error("Sign in error details:", error);
            toast('Google sign-in failed', { variant: 'error' });
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
                    <Text className="text-xl font-bold text-[#e91e8c]">Strathspace</Text>
                </View>

                <Text className="text-[32px] font-bold text-white mb-8 text-center leading-10">
                    Welcome Back to{'\n'}Campus,😉
                </Text>

                <Button
                    onPress={handleGoogleSignIn}
                    size="lg"
                    className="mb-6 rounded-full bg-[#e91e8c]"
                >
                    <View style={styles.googleIconContainer}>
                        <Ionicons name="logo-google" size={20} color="#e91e8c" />
                    </View>
                    <Text className="text-white text-base font-semibold">Continue with Google</Text>
                </Button>

                <View style={styles.dividerContainer}>
                    <View style={styles.dividerLine} />
                    <Text className="text-white px-4 text-sm font-semibold">OR</Text>
                    <View style={styles.dividerLine} />
                </View>

                <View style={styles.form}>
                    <TextField
                        placeholder="Uni Email"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        className="mb-4"
                        startContent={
                            <Ionicons name="mail-outline" size={20} color="#e91e8c" />
                        }
                    />

                    <TextField
                        placeholder="Password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        className="mb-4"
                        startContent={
                            <Ionicons name="lock-closed-outline" size={20} color="#e91e8c" />
                        }
                    />

                    <Button
                        onPress={handleLogin}
                        loading={loading}
                        size="lg"
                        className="mt-2 rounded-full bg-[#e91e8c]"
                    >
                        <Text className="text-white font-bold text-lg">
                            {loading ? 'Loading...' : 'Log In'}
                        </Text>
                    </Button>
                </View>

                <View style={styles.footer}>
                    <TouchableOpacity onPress={() => toast('Reset password flow coming soon!', { variant: 'info' })}>
                        <Text className="text-white text-sm mb-4">Forgot Password?</Text>
                    </TouchableOpacity>

                    <Link href="/(auth)/register" asChild>
                        <TouchableOpacity style={styles.signupLink}>
                            <Text className="text-gray-300 text-sm">
                                Don't have an account? <Text className="text-white font-bold">Sign Up</Text>
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
    googleIconContainer: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
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
    form: {
        marginBottom: 20,
    },
    footer: {
        alignItems: 'center',
        marginTop: 10,
    },
    signupLink: {
        marginTop: 8,
    },
});
