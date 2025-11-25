import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Image } from 'react-native';
import { PhaseProps } from './types';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, ZoomIn, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;

const INTERESTS_LIST = [
    "Coding", "Gym", "Anime", "Music", "Gaming", "Travel",
    "Foodie", "Art", "Photography", "Reading", "Hiking",
    "Movies", "Fashion", "Tech", "Startups", "Crypto"
];

export default function Phase2VibeCheck({ data, updateData, onNext, onBack }: PhaseProps) {
    const [selectedInterests, setSelectedInterests] = useState<string[]>(data.interests || []);

    const toggleInterest = (interest: string) => {
        Haptics.selectionAsync();
        let newInterests;
        if (selectedInterests.includes(interest)) {
            newInterests = selectedInterests.filter(i => i !== interest);
        } else {
            if (selectedInterests.length >= 5) return; // Max 5
            newInterests = [...selectedInterests, interest];
        }
        setSelectedInterests(newInterests);
        updateData('interests', newInterests);
    };

    const handleNext = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onNext();
    };

    return (
        <View style={styles.container}>
            <Animated.View entering={FadeIn.duration(800)} style={styles.header}>
                <Text style={styles.title}>Vibe Check</Text>
                <Text style={styles.subtitle}>Pick your top interests (up to 5)</Text>
            </Animated.View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Interests Bubbles Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>INTERESTS ({selectedInterests.length}/5)</Text>
                    <View style={styles.bubblesContainer}>
                        {INTERESTS_LIST.map((interest, index) => {
                            const isSelected = selectedInterests.includes(interest);
                            return (
                                <TouchableOpacity
                                    key={interest}
                                    onPress={() => toggleInterest(interest)}
                                    activeOpacity={0.8}
                                >
                                    <Animated.View
                                        entering={ZoomIn.delay(index * 50)}
                                        style={[
                                            styles.bubble,
                                            isSelected && styles.bubbleSelected
                                        ]}
                                    >
                                        <Text style={[styles.bubbleText, isSelected && styles.bubbleTextSelected]}>
                                            {interest}
                                        </Text>
                                    </Animated.View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.backButton} onPress={onBack}>
                    <Text style={styles.backButtonText}>← BACK</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.nextButton, selectedInterests.length === 0 && styles.disabledButton]}
                    onPress={handleNext}
                    disabled={selectedInterests.length === 0}
                >
                    <Text style={styles.nextButtonText}>NEXT →</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    header: {
        marginTop: 30,
        marginBottom: 30,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
    },
    subtitle: {
        fontSize: 16,
        color: '#888',
        marginTop: 8,
    },
    content: {
        flex: 1,
    },
    section: {
        marginBottom: 30,
    },
    sectionTitle: {
        color: Colors.dark.primary,
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 1,
        marginBottom: 20,
        textTransform: 'uppercase',
    },
    bubblesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    bubble: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
        backgroundColor: '#111',
        margin: 6,
        borderWidth: 1,
        borderColor: '#333',
    },
    bubbleSelected: {
        backgroundColor: Colors.dark.primary + '20',
        borderColor: Colors.dark.primary,
        borderWidth: 2,
        transform: [{ scale: 1.05 }],
    },
    bubbleText: {
        color: '#888',
        fontSize: 14,
        fontWeight: '500',
    },
    bubbleTextSelected: {
        color: Colors.dark.primary,
        fontWeight: 'bold',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 20,
        gap: 12,
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
    disabledButton: {
        backgroundColor: '#333',
        opacity: 0.5,
    },
    nextButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
