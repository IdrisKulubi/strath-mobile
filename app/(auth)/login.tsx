import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, StatusBar } from 'react-native';
import { signIn } from '../../lib/auth-client';
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { NeonInput } from '@/components/ui/neon-input';
import { GradientButton } from '@/components/ui/gradient-button';
import { FloatingEmojis } from '@/components/ui/floating-emojis';

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
        try {
            const result = await signIn.social({
                provider: "google",
                callbackURL: "/(tabs)",
            });

            if (result.data) {
                router.replace('/(tabs)');
            }
        } catch (error) {
            console.error("Sign in error:", error);
            Alert.alert('Error', 'Google sign-in failed');
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <FloatingEmojis />

            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.title}>Strathspace</Text>
                    <Text style={styles.subtitle}>Back to{'\n'}Campus Love?</Text>
                </View>

                <View style={styles.form}>
                    <NeonInput
                        placeholder="Email"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        borderColor="#FF00FF" // Neon Pink
                        glowColor="#FF00FF"
                    />

                    <NeonInput
                        placeholder="Password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        borderColor="#00FFFF" // Neon Cyan
                        glowColor="#00FFFF"
                    />

                    <GradientButton
                        title="Login"
                        onPress={handleLogin}
                        loading={loading}
                        style={styles.loginButton}
                    />
                </View>

                <View style={styles.socialSection}>
                    <Text style={styles.socialText}>Or vibe with:</Text>
                    <TouchableOpacity
                        style={styles.googleButton}
                        onPress={handleGoogleSignIn}
                    >
                        <Ionicons name="logo-google" size={24} color="#FFF" style={styles.googleIcon} />
                        <Text style={styles.googleButtonText}>Continue with Google</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Link href="/(auth)/register" asChild>
                        <TouchableOpacity>
                            <Text style={styles.footerText}>
                                Don't have an account? <Text style={styles.linkText}>Sign Up</Text>
                            </Text>
                        </TouchableOpacity>
                    </Link>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a0d2e', // Deep Purple Solid Background
    },
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
        zIndex: 1,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
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
    loginButton: {
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
