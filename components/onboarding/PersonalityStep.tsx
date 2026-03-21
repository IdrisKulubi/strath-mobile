import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, {
    FadeIn,
    FadeInDown,
    SlideInRight,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import {
    BatteryHigh,
    Brain,
    ChatCircleText,
    ClockCountdown,
    MusicNotes,
    Moon,
    Sparkle,
} from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import type { OnboardingData } from '@/components/digital-dna/types';

type PersonalityAnswers = OnboardingData['personalityAnswers'];

interface PersonalityStepProps {
    data: PersonalityAnswers;
    onComplete: (answers: PersonalityAnswers) => void;
    onBack: () => void;
}

interface Question {
    id: keyof PersonalityAnswers;
    title: string;
    subtitle: string;
    icon: React.ComponentType<{ size: number; color: string; weight?: 'fill' }>;
    options: { value: string; label: string; emoji: string }[];
    multi?: boolean;
}

const QUESTIONS: Question[] = [
    {
        id: 'sleepSchedule',
        title: 'When do you come alive?',
        subtitle: 'Your natural rhythm',
        icon: Moon,
        options: [
            { value: 'night_owl', label: 'Night owl', emoji: '🦉' },
            { value: 'early_bird', label: 'Early bird', emoji: '🐦' },
            { value: 'depends', label: 'Depends on the day', emoji: '☁️' },
        ],
    },
    {
        id: 'socialVibe',
        title: 'Friday night energy?',
        subtitle: 'How you love to unwind',
        icon: Sparkle,
        options: [
            { value: 'party', label: 'Out with people', emoji: '🪩' },
            { value: 'chill_in', label: 'Chill night in', emoji: '🛋️' },
            { value: 'both', label: 'Honestly, both', emoji: '✌️' },
        ],
    },
    {
        id: 'driveStyle',
        title: 'How do you move through life?',
        subtitle: 'Your general approach',
        icon: Brain,
        options: [
            { value: 'career_focused', label: 'Career-focused', emoji: '🚀' },
            { value: 'spontaneous', label: 'Spontaneous', emoji: '🎲' },
            { value: 'balanced', label: 'Balanced', emoji: '⚖️' },
        ],
    },
    {
        id: 'convoStyle',
        title: 'Your ideal conversation?',
        subtitle: 'When you really vibe with someone',
        icon: ChatCircleText,
        options: [
            { value: 'deep_talks', label: 'Deep talks', emoji: '🌊' },
            { value: 'light_banter', label: 'Light banter', emoji: '😂' },
            { value: 'both', label: 'Mix of both', emoji: '🎭' },
        ],
    },
    {
        id: 'socialBattery',
        title: 'How do you recharge?',
        subtitle: 'Your social energy style',
        icon: BatteryHigh,
        options: [
            { value: 'introvert', label: 'Solo time', emoji: '🧘' },
            { value: 'ambivert', label: 'Mix it up', emoji: '🌗' },
            { value: 'extrovert', label: 'People energy', emoji: '🌟' },
        ],
    },
    {
        id: 'idealDateVibe',
        title: 'Dream first date?',
        subtitle: 'Helps us set you up right',
        icon: ClockCountdown,
        options: [
            { value: 'coffee', label: 'Coffee chat', emoji: '☕' },
            { value: 'walk', label: 'Walk and talk', emoji: '🚶' },
            { value: 'dinner', label: 'Dinner out', emoji: '🍽️' },
            { value: 'casual_hangout', label: 'Casual hangout', emoji: '🎮' },
        ],
    },
    {
        id: 'musicGenres',
        title: 'What is on your playlist?',
        subtitle: 'Pick every genre that fits',
        icon: MusicNotes,
        multi: true,
        options: [
            { value: 'afrobeats', label: 'Afrobeats', emoji: '🥁' },
            { value: 'hiphop', label: 'Hip-Hop', emoji: '🎤' },
            { value: 'rnb', label: 'R&B', emoji: '🎶' },
            { value: 'pop', label: 'Pop', emoji: '🎧' },
            { value: 'indie', label: 'Indie', emoji: '🎸' },
            { value: 'electronic', label: 'Electronic', emoji: '🎛️' },
            { value: 'classical', label: 'Classical', emoji: '🎻' },
            { value: 'gospel', label: 'Gospel', emoji: '🙏' },
        ],
    },
];

const TOTAL = QUESTIONS.length;

function PersonalityOption({
    option,
    isSelected,
    onPress,
    index,
    multi = false,
}: {
    option: Question['options'][number];
    isSelected: boolean;
    onPress: () => void;
    index: number;
    multi?: boolean;
}) {
    return (
        <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onPress();
                }}
            >
                <View style={[multi ? styles.optionChip : styles.optionCard, isSelected && styles.optionSelected]}>
                    <Text style={styles.optionEmoji}>{option.emoji}</Text>
                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{option.label}</Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color="#fff" />}
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

export function PersonalityStep({ data, onComplete, onBack }: PersonalityStepProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<PersonalityAnswers>(data ?? {});
    const progressWidth = useSharedValue(0);
    const insets = useSafeAreaInsets();

    const currentQuestion = QUESTIONS[currentIndex];
    const isMulti = currentQuestion.multi === true;
    const Icon = currentQuestion.icon;
    const currentValue = answers[currentQuestion.id];
    const selectedValues = Array.isArray(currentValue) ? currentValue : [];
    const canContinue = isMulti ? selectedValues.length > 0 : Boolean(currentValue);

    useEffect(() => {
        progressWidth.value = withSpring(((currentIndex + 1) / TOTAL) * 100, { damping: 15 });
    }, [currentIndex, progressWidth]);

    const progressStyle = useAnimatedStyle(() => ({
        width: `${progressWidth.value}%`,
    }));

    const handleSelect = useCallback((value: string) => {
        if (isMulti) {
            setAnswers((prev) => {
                const existing = (prev.musicGenres ?? []) as string[];
                const nextGenres = existing.includes(value)
                    ? existing.filter((item) => item !== value)
                    : [...existing, value];

                return { ...prev, musicGenres: nextGenres };
            });
            return;
        }

        const nextAnswers = { ...answers, [currentQuestion.id]: value };
        setAnswers(nextAnswers);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        setTimeout(() => {
            if (currentIndex === TOTAL - 1) {
                onComplete(nextAnswers);
            } else {
                setCurrentIndex((prev) => prev + 1);
            }
        }, 220);
    }, [answers, currentIndex, currentQuestion.id, isMulti, onComplete]);

    const handleBack = useCallback(() => {
        if (currentIndex > 0) {
            setCurrentIndex((prev) => prev - 1);
        } else {
            onBack();
        }
    }, [currentIndex, onBack]);

    const handleMultiContinue = useCallback(() => {
        if (!canContinue) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (currentIndex === TOTAL - 1) {
            onComplete(answers);
        } else {
            setCurrentIndex((prev) => prev + 1);
        }
    }, [answers, canContinue, currentIndex, onComplete]);

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0f0d23', '#1a0d2e', '#0f0d23']} style={StyleSheet.absoluteFill} />

            <View style={[styles.progressContainer, { paddingTop: Math.max(insets.top + 12, 60) }]}>
                <TouchableOpacity onPress={handleBack} activeOpacity={0.7} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.85)" />
                </TouchableOpacity>

                <View style={styles.progressBarBg}>
                    <Animated.View style={[styles.progressBarFill, progressStyle]}>
                        <LinearGradient
                            colors={['#ec4899', '#f43f5e']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={StyleSheet.absoluteFill}
                        />
                    </Animated.View>
                </View>

                <View style={styles.progressInfo}>
                    <Sparkle size={16} color="#f59e0b" weight="fill" />
                    <Text style={styles.progressText}>Personality</Text>
                    <Text style={styles.progressCount}>{currentIndex + 1}/{TOTAL}</Text>
                </View>
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Animated.View key={currentQuestion.id} entering={SlideInRight.springify()} style={styles.content}>
                    <View style={styles.iconContainer}>
                        <Icon size={32} color="#ec4899" weight="fill" />
                    </View>

                    <Text style={styles.title}>{currentQuestion.title}</Text>
                    <Text style={styles.subtitle}>{currentQuestion.subtitle}</Text>

                    <View style={[styles.optionsContainer, isMulti && styles.optionsWrap]}>
                        {currentQuestion.options.map((option, index) => {
                            const selected = isMulti
                                ? selectedValues.includes(option.value)
                                : currentValue === option.value;

                            return (
                                <PersonalityOption
                                    key={option.value}
                                    option={option}
                                    isSelected={selected}
                                    onPress={() => handleSelect(option.value)}
                                    index={index}
                                    multi={isMulti}
                                />
                            );
                        })}
                    </View>
                </Animated.View>
            </ScrollView>

            {isMulti ? (
                <View style={styles.footer}>
                    <TouchableOpacity onPress={handleMultiContinue} activeOpacity={0.8} disabled={!canContinue}>
                        <LinearGradient
                            colors={canContinue ? ['#ec4899', '#f43f5e'] : ['#374151', '#374151']}
                            style={styles.continueButton}
                        >
                            <Text style={[styles.continueButtonText, !canContinue && styles.disabledText]}>
                                {currentIndex === TOTAL - 1 ? 'Done' : 'Continue'}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                    <Text style={styles.helperText}>Pick at least one to continue</Text>
                </View>
            ) : (
                <Animated.Text entering={FadeIn.delay(250)} style={styles.helperTextStandalone}>
                    Tap an answer to continue
                </Animated.Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    progressContainer: {
        paddingHorizontal: 24,
        paddingBottom: 16,
    },
    backButton: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        marginBottom: 14,
    },
    progressBarBg: {
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 12,
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    progressInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    progressText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#f59e0b',
    },
    progressCount: {
        fontSize: 14,
        color: '#64748b',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 24,
    },
    content: {
        paddingHorizontal: 24,
        paddingTop: 22,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: 'rgba(236,72,153,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 8,
        lineHeight: 36,
        paddingTop: 2,
    },
    subtitle: {
        fontSize: 16,
        color: '#94a3b8',
        marginBottom: 28,
        lineHeight: 24,
    },
    optionsContainer: {
        gap: 12,
    },
    optionsWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 22,
        paddingVertical: 18,
        paddingHorizontal: 18,
    },
    optionChip: {
        minWidth: '47%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 20,
        paddingVertical: 16,
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    optionSelected: {
        backgroundColor: 'rgba(236,72,153,0.18)',
        borderColor: '#ec4899',
    },
    optionEmoji: {
        fontSize: 22,
    },
    optionText: {
        flex: 1,
        fontSize: 17,
        fontWeight: '700',
        color: '#E2D8EC',
        letterSpacing: -0.2,
    },
    optionTextSelected: {
        color: '#fff',
    },
    footer: {
        paddingHorizontal: 24,
        paddingBottom: 32,
    },
    continueButton: {
        paddingVertical: 18,
        borderRadius: 30,
        alignItems: 'center',
    },
    continueButtonText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
    },
    disabledText: {
        color: '#6b7280',
    },
    helperText: {
        marginTop: 10,
        textAlign: 'center',
        fontSize: 13,
        color: '#64748b',
    },
    helperTextStandalone: {
        paddingBottom: 34,
        textAlign: 'center',
        fontSize: 13,
        color: '#64748b',
    },
});
