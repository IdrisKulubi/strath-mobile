import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { PhaseProps, OnboardingData } from './types';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/theme';

const ITEM_HEIGHT = 45;
const VISIBLE_ITEMS = 3;

const ZODIAC_SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const PERSONALITY_TYPES = ["INTJ", "INTP", "ENTJ", "ENTP", "INFJ", "INFP", "ENFJ", "ENFP", "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP"];
const LOVE_LANGUAGES = ["Words of Affirmation", "Acts of Service", "Receiving Gifts", "Quality Time", "Physical Touch"];
const SLEEPING_HABITS = ["Early Bird", "Night Owl", "Flexible", "Irregular"];
const DRINKING_PREFERENCES = ["Never", "Socially", "Occasionally", "Regularly"];
const WORKOUT_FREQUENCY = ["Never", "Rarely", "Sometimes", "Often", "Daily"];
const SOCIAL_MEDIA_USAGE = ["Minimal", "Moderate", "Active", "Very Active"];
const COMMUNICATION_STYLE = ["Texting", "Calling", "Video", "In-Person"];

interface WheelPickerProps {
    items: string[];
    selectedValue: string;
    onValueChange: (value: string) => void;
    label: string;
}

const WheelPicker = ({ items, selectedValue, onValueChange, label }: WheelPickerProps) => {
    const scrollViewRef = useRef<ScrollView>(null);

    useEffect(() => {
        // Scroll to initial value
        if (scrollViewRef.current) {
            const index = items.indexOf(selectedValue);
            if (index >= 0) {
                // Use a small timeout to ensure layout is ready
                setTimeout(() => {
                    scrollViewRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: false });
                }, 100);
            }
        }
    }, []);

    const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        const index = Math.round(offsetY / ITEM_HEIGHT);
        if (index >= 0 && index < items.length) {
            if (items[index] !== selectedValue) {
                Haptics.selectionAsync();
                onValueChange(items[index]);
            }
        }
    };

    return (
        <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>{label}</Text>
            <View style={styles.pickerWrapper}>
                <LinearGradient colors={['#000', 'transparent']} style={styles.gradientTop} pointerEvents="none" />
                <ScrollView
                    ref={scrollViewRef}
                    snapToInterval={ITEM_HEIGHT}
                    decelerationRate="fast"
                    showsVerticalScrollIndicator={false}
                    onMomentumScrollEnd={onScroll}
                    onScrollEndDrag={onScroll}
                    style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS }}
                    contentContainerStyle={{ paddingVertical: 0 }}
                >
                    {/* Top Padding */}
                    <View style={{ height: ITEM_HEIGHT }} />

                    {items.map((item, index) => (
                        <View key={index} style={styles.pickerItem}>
                            <Text style={[styles.pickerItemText, item === selectedValue && styles.selectedItemText]}>
                                {item}
                            </Text>
                        </View>
                    ))}

                    {/* Bottom Padding */}
                    <View style={{ height: ITEM_HEIGHT }} />
                </ScrollView>
                <LinearGradient colors={['transparent', '#000']} style={styles.gradientBottom} pointerEvents="none" />
                <View style={styles.selectionHighlight} pointerEvents="none" />
            </View>
        </View>
    );
};

export default function Phase3DeepDive({ data, updateData, onNext, onBack }: PhaseProps) {
    const [currentPage, setCurrentPage] = React.useState(0);

    const pages = [
        // Page 1: Personality
        [
            { items: ZODIAC_SIGNS, value: data.zodiacSign, key: 'zodiacSign', label: 'ZODIAC SIGN' },
            { items: PERSONALITY_TYPES, value: data.personalityType, key: 'personalityType', label: 'MBTI TYPE' },
            { items: LOVE_LANGUAGES, value: data.loveLanguage, key: 'loveLanguage', label: 'LOVE LANGUAGE' },
        ],
        // Page 2: Lifestyle
        [
            { items: SLEEPING_HABITS, value: data.sleepingHabits, key: 'sleepingHabits', label: 'SLEEPING HABITS' },
            { items: DRINKING_PREFERENCES, value: data.drinkingPreference, key: 'drinkingPreference', label: 'DRINKING' },
            { items: WORKOUT_FREQUENCY, value: data.workoutFrequency, key: 'workoutFrequency', label: 'WORKOUT' },
        ],
        // Page 3: Social
        [
            { items: SOCIAL_MEDIA_USAGE, value: data.socialMediaUsage, key: 'socialMediaUsage', label: 'SOCIAL MEDIA' },
            { items: COMMUNICATION_STYLE, value: data.communicationStyle, key: 'communicationStyle', label: 'COMMUNICATION' },
        ],
    ];

    const handleNext = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (currentPage < pages.length - 1) {
            // Navigate to next page
            setCurrentPage(currentPage + 1);
        } else {
            // On last page, proceed to next phase
            onNext();
        }
    };

    const handleBack = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (currentPage > 0) {
            // Navigate to previous page
            setCurrentPage(currentPage - 1);
        } else {
            // On first page, go back to previous phase
            onBack();
        }
    };

    return (
        <View style={styles.container}>
            <Animated.View entering={FadeIn.duration(800)} style={styles.header}>
                <Text style={styles.title}>Deep Dive</Text>
                <Text style={styles.subtitle}>
                    {currentPage === 0 && 'Personality Traits'}
                    {currentPage === 1 && 'Lifestyle Habits'}
                    {currentPage === 2 && 'Social Preferences'}
                </Text>

                {/* Page Indicator Dots - Moved to Header */}
                <View style={styles.pageIndicator}>
                    {pages.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.pageDot,
                                currentPage === index && styles.pageDotActive
                            ]}
                        />
                    ))}
                </View>
            </Animated.View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <Animated.View entering={SlideInRight.delay(200)} style={styles.pickersContainer}>
                    {pages[currentPage].map((picker) => (
                        <WheelPicker
                            key={picker.key}
                            items={picker.items}
                            selectedValue={picker.value || picker.items[0]}
                            onValueChange={(val) => updateData(picker.key as keyof OnboardingData, val)}
                            label={picker.label}
                        />
                    ))}
                </Animated.View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                    <Text style={styles.backButtonText}>
                        {currentPage === 0 ? '← BACK' : '← PREV'}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                    <Text style={styles.nextButtonText}>
                        {currentPage === pages.length - 1 ? 'NEXT →' : 'NEXT PAGE →'}
                    </Text>
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
        marginTop: 20,
        marginBottom: 10,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
    },
    subtitle: {
        fontSize: 16,
        color: '#888',
        marginTop: 5,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 100, // Add padding for footer
    },
    pickersContainer: {
        flex: 1,
        justifyContent: 'flex-start',
    },
    pageIndicator: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        marginTop: 15,
        gap: 6,
    },
    pageDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#333',
    },
    pageDotActive: {
        backgroundColor: Colors.dark.primary,
        width: 24,
    },
    pickerContainer: {
        marginBottom: 15,
        alignItems: 'center',
        width: '100%',
    },
    pickerLabel: {
        color: Colors.dark.primary,
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 1,
        marginBottom: 12,
        textTransform: 'uppercase',
    },
    pickerWrapper: {
        height: ITEM_HEIGHT * VISIBLE_ITEMS,
        width: '100%',
        position: 'relative',
        backgroundColor: '#111',
        borderRadius: 16,
        overflow: 'hidden',
    },
    pickerItem: {
        height: ITEM_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pickerItemText: {
        color: '#555',
        fontSize: 18,
        fontWeight: '500',
    },
    selectedItemText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 20,
    },
    gradientTop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: ITEM_HEIGHT,
        zIndex: 1,
    },
    gradientBottom: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: ITEM_HEIGHT,
        zIndex: 1,
    },
    selectionHighlight: {
        position: 'absolute',
        top: ITEM_HEIGHT,
        left: 0,
        right: 0,
        height: ITEM_HEIGHT,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#333',
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    footer: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        backgroundColor: 'rgba(0,0,0,0.8)', // Add background to ensure visibility
        paddingTop: 10,
        paddingHorizontal: 10,
        borderRadius: 12,
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
