import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, StatusBar, Image, ScrollView } from 'react-native';
import { signUp, signIn } from '../../lib/auth-client';
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, TextField, toast } from 'heroui-native';
import { Text } from '@/components/ui/text';

export default function RegisterScreen() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleRegister = async () => {
        if (!name || !email || !password || !confirmPassword) {
            toast('Please fill in all fields', { variant: 'error' });
            return;
        }

        if (password !== confirmPassword) {
            toast('Passwords do not match', { variant: 'error' });
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await signUp.email({
                email,
                password,
                name,
            });

            if (error) {
                toast(error.message || 'An error occurred', { variant: 'error' });
            } else {
                toast('Account created successfully!', { variant: 'success' });
                router.replace('/');
            }
        } catch (err) {
            toast('Something went wrong', { variant: 'error' });
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignUp = async () => {
        try {
            const result = await signIn.social({
                provider: "google",
                callbackURL: "/",
            });

            if (result.data) {
                toast('Signed up successfully!', { variant: 'success' });
                router.replace('/');
            }
        } catch (error) {
            console.error("Sign up error:", error);
            toast('Google sign-up failed', { variant: 'error' });
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
                    Join the{'\n'}Strathspace Crew!
                </Text>

                <Button
                    onPress={handleGoogleSignUp}
                    size="lg"
                    className="mb-6 rounded-full bg-[#e91e8c]"
                >
                    <View style={styles.googleIconContainer}>
                        <Ionicons name="logo-google" size={20} color="#e91e8c" />
                    </View>
                    <Text className="text-white text-base font-semibold">Sign Up with Google</Text>
                </Button>

                <View style={styles.dividerContainer}>
                    <View style={styles.dividerLine} />
                    <Text className="text-white px-4 text-sm font-semibold">OR</Text>
                    <View style={styles.dividerLine} />
                </View>

                <View style={styles.form}>
                    <TextField
                        placeholder="Full Name"
                        value={name}
                        onChangeText={setName}
                        className="mb-4"
                        startContent={
                            <Ionicons name="person-outline" size={20} color="#e91e8c" />
                        }
                    />

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

                    <TextField
                        placeholder="Confirm Password"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                        className="mb-4"
                        startContent={
                            <Ionicons name="lock-closed-outline" size={20} color="#e91e8c" />
                        }
                    />

                    <Button
                        onPress={handleRegister}
                        loading={loading}
                        size="lg"
                        className="mt-2 rounded-full bg-[#e91e8c]"
                    >
                        <Text className="text-white font-bold text-lg">
                            {loading ? 'Creating Account...' : 'Create Account'}
                        </Text>
                    </Button>
                </View>

                <View style={styles.footer}>
                    <Link href="/(auth)/login" asChild>
                        <TouchableOpacity>
                            <Text className="text-gray-300 text-sm">
                                Already have an account? <Text className="text-white font-bold">Log In</Text>
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
        marginBottom: 30,
        marginTop: 40,
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
        marginBottom: 20,
    },
});
