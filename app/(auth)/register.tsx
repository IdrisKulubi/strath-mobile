import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, StatusBar, ScrollView } from 'react-native';
import { signUp, signIn } from '../../lib/auth-client';
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { NeonInput } from '@/components/ui/neon-input';
import { GradientButton } from '@/components/ui/gradient-button';
import { FloatingEmojis } from '@/components/ui/floating-emojis';

export default function RegisterScreen() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleRegister = async () => {
        if (!name || !email || !password || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
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
                Alert.alert('Registration Failed', error.message || 'An error occurred');
            } else {
                Alert.alert('Success', 'Account created successfully', [
                    { text: 'OK', onPress: () => router.replace('/(tabs)') }
                ]);
            }
        } catch (err) {
            Alert.alert('Error', 'Something went wrong');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignUp = async () => {
        try {
            const result = await signIn.social({
                provider: "google",
                callbackURL: "/(tabs)",
            });

            if (result.data) {
                router.replace('/(tabs)');
            }
        } catch (error) {
            console.error("Sign up error:", error);
            Alert.alert('Error', 'Google sign-up failed');
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <FloatingEmojis />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Text style={styles.title}>Strathspace</Text>
                    <Text style={styles.subtitle}>Join the{'\n'}Campus Crew!</Text>
                </View>

                <View style={styles.form}>
                    <NeonInput
                        placeholder="Full Name"
                        value={name}
                        onChangeText={setName}
                        borderColor="#FF00FF" // Neon Pink
                        glowColor="#FF00FF"
                    />

                    <NeonInput
                        placeholder="University Email"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        borderColor="#00FFFF" // Neon Cyan
                        glowColor="#00FFFF"
                    />

                    <NeonInput
                        placeholder="Create Password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        borderColor="#FF00FF" // Neon Pink
                        glowColor="#FF00FF"
                    />

                    <NeonInput
                        placeholder="Confirm Password"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                        borderColor="#00FFFF" // Neon Cyan
                        glowColor="#00FFFF"
                    />

                    <GradientButton
                        title="Sign Up"
                        onPress={handleRegister}
                        loading={loading}
                        style={styles.signupButton}
                    />
                </View>

                <View style={styles.socialSection}>
                    <Text style={styles.socialText}>Or vibe with:</Text>
                    <TouchableOpacity
                        style={styles.googleButton}
                        onPress={handleGoogleSignUp}
                    >
                        <Ionicons name="logo-google" size={24} color="#FFF" style={styles.googleIcon} />
                        <Text style={styles.googleButtonText}>Continue with Google</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Link href="/(auth)/login" asChild>
                        <TouchableOpacity>
                            <Text style={styles.footerText}>
                                Already have an account? <Text style={styles.linkText}>Login</Text>
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
        backgroundColor: '#1a0d2e', // Deep Purple Solid Background
    },
    scrollContent: {
        flexGrow: 1,
        padding: 24,
        justifyContent: 'center',
        zIndex: 1,
    },
    header: {
        alignItems: 'center',
        marginBottom: 30,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 10,
        letterSpacing: 1,
        textShadowColor: '#FF3399',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    subtitle: {
        fontSize: 36,
        fontWeight: '800',
        color: '#FFF',
        textAlign: 'center',
        lineHeight: 42,
        textShadowColor: '#00FFFF',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 5,
    },
    form: {
        marginBottom: 30,
    },
    signupButton: {
        marginTop: 10,
    },
    socialSection: {
        alignItems: 'center',
        marginBottom: 30,
    },
    socialText: {
        color: '#CCC',
        marginBottom: 15,
        fontSize: 14,
    },
    googleButton: {
        width: '100%',
        height: 56,
        borderRadius: 28,
        borderWidth: 2,
        borderColor: '#00FFFF',
        backgroundColor: 'rgba(0,0,0,0.5)',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#00FFFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    googleIcon: {
        marginRight: 12,
    },
    googleButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    footer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    footerText: {
        color: '#CCC',
        fontSize: 14,
    },
    linkText: {
        color: '#FF3399',
        fontWeight: 'bold',
    },
});
