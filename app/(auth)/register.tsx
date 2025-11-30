import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, StatusBar, Image, ScrollView } from 'react-native';
import { signUp, signIn } from '../../lib/auth-client';
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { Text } from '@/components/ui/text';

export default function RegisterScreen() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const toast = useToast();
    const router = useRouter();

    const handleRegister = async () => {
        if (!name || !email || !password || !confirmPassword) {
            toast.show({
                message: 'Please fill in all fields',
                variant: 'danger',
                dismissKeyboard: true,
            });
            return;
        }

        if (password !== confirmPassword) {
            toast.show({
                message: 'Passwords do not match',
                variant: 'danger',
                dismissKeyboard: true,
            });
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
                toast.show({
                    message: error.message || 'An error occurred',
                    variant: 'danger',
                });
            } else {
                toast.show({
                    message: '🎉 Account created successfully!',
                    variant: 'success',
                    size: 'large',
                });
                router.replace('/');
            }
        } catch (err) {
            toast.show({
                message: 'Something went wrong',
                variant: 'danger',
            });
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
                toast.show({
                    message: '🎉 Signed up successfully!',
                    variant: 'success',
                    size: 'large',
                });
                router.replace('/');
            }
        } catch (error) {
            console.error("Sign up error:", error);
            toast.show({
                message: 'Google sign-up failed',
                variant: 'danger',
            });
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
                    variant="default"
                    className="mb-6 rounded-full bg-[#e91e8c] flex-row items-center justify-center"
                >
                    <View style={styles.googleIconContainer}>
                        <Ionicons name="logo-google" size={20} color="#e91e8c" />
                    </View>
                    <Text className="text-white text-base font-semibold ml-2">Sign Up with Google</Text>
                </Button>

                <View style={styles.dividerContainer}>
                    <View style={styles.dividerLine} />
                    <Text className="text-white px-4 text-sm font-semibold">OR</Text>
                    <View style={styles.dividerLine} />
                </View>

                <View style={styles.form}>
                    <View className="mb-4">
                        <Input
                            placeholder="Full Name"
                            value={name}
                            onChangeText={setName}
                            className="bg-[#3d2459] border-[#482961] text-white rounded-lg h-14 px-4"
                            placeholderTextColor="#9ca3af"
                        />
                    </View>

                    <View className="mb-4">
                        <Input
                            placeholder="Uni Email"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            className="bg-[#3d2459] border-[#482961] text-white rounded-lg h-14 px-4"
                            placeholderTextColor="#9ca3af"
                        />
                    </View>

                    <View className="mb-4">
                        <Input
                            placeholder="Password"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            className="bg-[#3d2459] border-[#482961] text-white rounded-lg h-14 px-4"
                            placeholderTextColor="#9ca3af"
                        />
                    </View>

                    <View className="mb-4">
                        <Input
                            placeholder="Confirm Password"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry
                            className="bg-[#3d2459] border-[#482961] text-white rounded-lg h-14 px-4"
                            placeholderTextColor="#9ca3af"
                        />
                    </View>

                    <Button
                        onPress={handleRegister}
                        disabled={loading}
                        size="lg"
                        className="mt-2 rounded-full bg-[#e91e8c] h-14"
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
