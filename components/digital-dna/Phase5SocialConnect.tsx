import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Platform, ScrollView, Linking } from 'react-native';
import { PhaseProps } from './types';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, SlideInRight, BounceIn } from 'react-native-reanimated';
import { Colors } from '../../constants/theme';

export default function Phase5SocialConnect({ data, updateData, onNext, onBack }: PhaseProps) {
    const handleNext = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        // All fields are optional, user can skip
        onNext();
    };

    const handleSkip = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onNext();
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <Animated.View entering={FadeIn.duration(800)} style={styles.header}>
                <Text style={styles.title}>Social Connect</Text>
                <Text style={styles.subtitle}>Link your socials (optional)</Text>
            </Animated.View>

            {/* Instagram */}
            <Animated.View entering={SlideInRight.delay(100).duration(600)} style={styles.socialCard}>
                <View style={[styles.iconContainer, { backgroundColor: '#E1306C' + '20' }]}>
                    <Text style={styles.socialIcon}>📷</Text>
                </View>
                <View style={styles.inputContainer}>
                    <Text style={styles.socialLabel}>Instagram</Text>
                    <View style={styles.inputWrapper}>
                        <Text style={styles.prefix}>@</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="username"
                            placeholderTextColor="#666"
                            value={data.instagram}
                            onChangeText={(text) => updateData('instagram', text.replace('@', ''))}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>
                </View>
            </Animated.View>

            {/* Spotify */}
            <Animated.View entering={SlideInRight.delay(200).duration(600)} style={styles.socialCard}>
                <View style={[styles.iconContainer, { backgroundColor: '#1DB954' + '20' }]}>
                    <Text style={styles.socialIcon}>🎵</Text>
                </View>
                <View style={styles.inputContainer}>
                    <Text style={styles.socialLabel}>Spotify</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Profile link or username"
                        placeholderTextColor="#666"
                        value={data.spotify}
                        onChangeText={(text) => updateData('spotify', text)}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                </View>
            </Animated.View>

            {/* Snapchat */}
            <Animated.View entering={SlideInRight.delay(300).duration(600)} style={styles.socialCard}>
                <View style={[styles.iconContainer, { backgroundColor: '#FFFC00' + '20' }]}>
                    <Text style={styles.socialIcon}>👻</Text>
                </View>
                <View style={styles.inputContainer}>
                    <Text style={styles.socialLabel}>Snapchat</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="username"
                        placeholderTextColor="#666"
                        value={data.snapchat}
                        onChangeText={(text) => updateData('snapchat', text)}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                </View>
            </Animated.View>

            {/* Info Card */}
            <Animated.View entering={BounceIn.delay(400)} style={styles.infoCard}>
                <Text style={styles.infoText}>
                    💡 Adding your socials helps others connect with you beyond the app!
                </Text>
            </Animated.View>

            {/* Skip Link */}
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                <Text style={styles.skipText}>I'll add these later →</Text>
            </TouchableOpacity>

            {/* Navigation Buttons */}
            <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.backButton} onPress={onBack}>
                    <Text style={styles.backButtonText}>← BACK</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                    <Text style={styles.nextButtonText}>NEXT →</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    header: {
        marginBottom: 40,
        marginTop: 30,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#888',
    },
    socialCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#111',
        borderWidth: 1,
        borderColor: '#222',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
    },
    iconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    socialIcon: {
        fontSize: 28,
    },
    inputContainer: {
        flex: 1,
    },
    socialLabel: {
        color: Colors.dark.primary,
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    prefix: {
        color: '#666',
        fontSize: 16,
        marginRight: 4,
        fontWeight: 'bold',
    },
    input: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        padding: 0,
    },
    infoCard: {
        backgroundColor: Colors.dark.primary + '15',
        borderWidth: 1,
        borderColor: Colors.dark.primary + '40',
        borderRadius: 12,
        padding: 16,
        marginTop: 8,
        marginBottom: 20,
    },
    infoText: {
        color: '#fff',
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
    },
    skipButton: {
        alignItems: 'center',
        marginBottom: 20,
        padding: 10,
    },
    skipText: {
        color: '#888',
        fontSize: 14,
        fontStyle: 'italic',
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 10,
        marginBottom: 40,
    },
    backButton: {
        flex: 1,
        backgroundColor: '#111',
        borderWidth: 1,
        borderColor: '#333',
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
    },
    backButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    nextButton: {
        flex: 1,
        backgroundColor: Colors.dark.primary,
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
    },
    nextButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
