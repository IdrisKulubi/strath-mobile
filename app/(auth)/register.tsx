import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, StatusBar, Image, ScrollView } from 'react-native';
import { signUp, signIn } from '../../lib/auth-client';
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { NeonInput } from '@/components/ui/neon-input';
import { GradientButton } from '@/components/ui/gradient-button';

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
                    { text: 'OK', onPress: () => router.replace('/') }
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
                callbackURL: "/",
            });

            if (result.data) {
                router.replace('/');
            }
        } catch (error) {
            console.error("Sign up error:", error);
            Alert.alert('Error', 'Google sign-up failed');
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

                <Text style={styles.title}>Join the{'\n'}Strathspace Crew!</Text>

                <TouchableOpacity
                    style={styles.googleButton}
                    onPress={handleGoogleSignUp}
                >
                    <View style={styles.googleIconContainer}>
                        <Ionicons name="logo-google" size={20} color="#e91e8c" />
                    </View>
                    <Text style={styles.googleButtonText}>Sign Up with Google</Text>
                </TouchableOpacity>

                <View style={styles.dividerContainer}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>OR</Text>
                    <View style={styles.dividerLine} />
                </View>

                <View style={styles.form}>
                    <NeonInput
                        placeholder="Full Name"
                        value={name}
                        onChangeText={setName}
                        borderColor="#e91e8c"
                        glowColor="#e91e8c"
                        icon="person-outline"
                    />

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

                    <NeonInput
                        placeholder="Confirm Password"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                        borderColor="#e91e8c"
                        glowColor="#e91e8c"
                        icon="lock-closed-outline"
                    />

                    <GradientButton
                        title="Create Account"
                        onPress={handleRegister}
                        loading={loading}
                        style={styles.signupButton}
                    />
                </View>

                <View style={styles.footer}>
                    <Link href="/(auth)/login" asChild>
                        <TouchableOpacity>
                            <Text style={styles.footerText}>
                                Already have an account? <Text style={styles.linkText}>Log In</Text>
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
    signupButton: {
        marginTop: 10,
        backgroundColor: '#e91e8c',
    },
    footer: {
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 20,
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
