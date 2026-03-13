import React, { useCallback, useState } from 'react';
import {
    View,
    StyleSheet,
    Pressable,
    ScrollView,
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeOutUp,
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
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
    emoji: string;
    options: { value: string; label: string; emoji: string }[];
    multi?: boolean;
}

const QUESTIONS: Question[] = [
    {
        id: 'sleepSchedule',
        title: 'When do you come alive?',
        subtitle: 'Your natural rhythm',
        emoji: '🌙',
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
        emoji: '🎉',
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
        emoji: '🧭',
        options: [
            { value: 'career_focused', label: 'Career-focused', emoji: '🚀' },
            { value: 'spontaneous', label: 'Spontaneous', emoji: '🎲' },
            { value: 'balanced', label: 'Balanced', emoji: '⚖️' },
        ],
    },
    {
        id: 'convoStyle',
        title: 'Your ideal conversation?',
        subtitle: 'When you vibe with someone',
        emoji: '💬',
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
        emoji: '🔋',
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
        emoji: '💜',
        options: [
            { value: 'coffee', label: 'Coffee chat', emoji: '☕' },
            { value: 'walk', label: 'Walk & talk', emoji: '🚶' },
            { value: 'dinner', label: 'Dinner out', emoji: '🍽️' },
            { value: 'casual_hangout', label: 'Casual hangout', emoji: '🎮' },
        ],
    },
    {
        id: 'musicGenres',
        title: 'Your music?',
        subtitle: 'Pick everything that fits',
        emoji: '🎵',
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

function OptionButton({
    option,
    selected,
    onPress,
}: {
    option: Question['options'][number];
    selected: boolean;
    onPress: () => void;
}) {
    const scale = useSharedValue(1);
    const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

    const handlePress = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        scale.value = withSpring(0.94, { damping: 10, stiffness: 300 }, () => {
            scale.value = withSpring(1);
        });
        onPress();
    }, [onPress, scale]);

    return (
        <Animated.View style={animStyle}>
            <Pressable
                onPress={handlePress}
                style={[
                    styles.option,
                    selected && styles.optionSelected,
                ]}
            >
                <Text style={styles.optionEmoji}>{option.emoji}</Text>
                <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                    {option.label}
                </Text>
                {selected && (
                    <View style={styles.checkMark}>
                        <Ionicons name="checkmark" size={14} color="#fff" />
                    </View>
                )}
            </Pressable>
        </Animated.View>
    );
}

export function PersonalityStep({ data, onComplete, onBack }: PersonalityStepProps) {
    const [qIndex, setQIndex] = useState(0);
    const [answers, setAnswers] = useState<PersonalityAnswers>(data ?? {});

    const current = QUESTIONS[qIndex];
    const isMulti = current?.multi === true;

    const currentAnswer = answers[current?.id as keyof PersonalityAnswers];
    const isMultiAnswer = Array.isArray(currentAnswer);

    const isAnswered = isMulti
        ? isMultiAnswer && (currentAnswer as string[]).length > 0
        : Boolean(currentAnswer);

    const handleSelect = useCallback((value: string) => {
        if (!current) return;
        if (isMulti) {
            setAnswers((prev) => {
                const existing = (prev.musicGenres ?? []) as string[];
                const next = existing.includes(value)
                    ? existing.filter((v) => v !== value)
                    : [...existing, value];
                return { ...prev, musicGenres: next };
            });
        } else {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setAnswers((prev) => ({ ...prev, [current.id]: value }));
        }
    }, [current, isMulti]);

    const handleNext = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (qIndex < TOTAL - 1) {
            setQIndex((i) => i + 1);
        } else {
            onComplete(answers);
        }
    }, [qIndex, answers, onComplete]);

    const handleBack = useCallback(() => {
        if (qIndex > 0) {
            setQIndex((i) => i - 1);
        } else {
            onBack();
        }
    }, [qIndex, onBack]);

    if (!current) return null;

    const multiSelected = (answers.musicGenres ?? []) as string[];

    return (
        <LinearGradient
            colors={['#2d1b47', '#1a0d2e']}
            style={styles.container}
        >
            {/* Top bar */}
            <View style={styles.topBar}>
                <Pressable onPress={handleBack} style={styles.backBtn} hitSlop={10}>
                    <Ionicons name="chevron-back" size={26} color="rgba(255,255,255,0.8)" />
                </Pressable>

                {/* Progress dots */}
                <View style={styles.dots}>
                    {QUESTIONS.map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.dot,
                                i === qIndex && styles.dotActive,
                                i < qIndex && styles.dotDone,
                            ]}
                        />
                    ))}
                </View>

                <View style={{ width: 40 }} />
            </View>

            {/* Question */}
            <Animated.View
                key={qIndex}
                entering={FadeInDown.springify().damping(16)}
                exiting={FadeOutUp.duration(150)}
                style={styles.questionBlock}
            >
                <Text style={styles.questionEmoji}>{current.emoji}</Text>
                <Text style={styles.questionTitle}>{current.title}</Text>
                <Text style={styles.questionSub}>{current.subtitle}</Text>
            </Animated.View>

            {/* Options */}
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <Animated.View
                    key={`opts-${qIndex}`}
                    entering={FadeInDown.delay(80).springify().damping(16)}
                    style={styles.optionsGrid}
                >
                    {current.options.map((opt) => {
                        const selected = isMulti
                            ? multiSelected.includes(opt.value)
                            : currentAnswer === opt.value;
                        return (
                            <OptionButton
                                key={opt.value}
                                option={opt}
                                selected={selected}
                                onPress={() => handleSelect(opt.value)}
                            />
                        );
                    })}
                </Animated.View>
            </ScrollView>

            {/* Next button */}
            <View style={styles.footer}>
                <Pressable
                    onPress={handleNext}
                    disabled={!isAnswered}
                    style={[styles.nextBtn, !isAnswered && styles.nextBtnDisabled]}
                >
                    <LinearGradient
                        colors={isAnswered ? ['#e91e8c', '#d946a6'] : ['#3d2459', '#3d2459']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.nextBtnInner}
                    >
                        <Text style={[styles.nextBtnText, !isAnswered && styles.nextBtnTextDisabled]}>
                            {qIndex < TOTAL - 1 ? 'Next' : 'Done'}
                        </Text>
                        <Ionicons
                            name={qIndex < TOTAL - 1 ? 'arrow-forward' : 'checkmark'}
                            size={20}
                            color={isAnswered ? '#fff' : 'rgba(255,255,255,0.4)'}
                        />
                    </LinearGradient>
                </Pressable>

                <Text style={styles.counter}>
                    {qIndex + 1} of {TOTAL}
                </Text>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
    },
    backBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dots: {
        flexDirection: 'row',
        gap: 6,
        alignItems: 'center',
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    dotActive: {
        width: 18,
        backgroundColor: '#e91e8c',
    },
    dotDone: {
        backgroundColor: 'rgba(233,30,140,0.5)',
    },
    questionBlock: {
        paddingHorizontal: 28,
        paddingTop: 28,
        paddingBottom: 20,
        gap: 6,
    },
    questionEmoji: {
        fontSize: 40,
        marginBottom: 4,
    },
    questionTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: -0.3,
        lineHeight: 32,
    },
    questionSub: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.55)',
        marginTop: 2,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    optionsGrid: {
        gap: 10,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        borderRadius: 18,
        paddingVertical: 16,
        paddingHorizontal: 18,
    },
    optionSelected: {
        backgroundColor: 'rgba(233,30,140,0.15)',
        borderColor: '#e91e8c',
    },
    optionEmoji: {
        fontSize: 24,
    },
    optionLabel: {
        flex: 1,
        fontSize: 16,
        color: 'rgba(255,255,255,0.85)',
        fontWeight: '500',
    },
    optionLabelSelected: {
        color: '#fff',
        fontWeight: '700',
    },
    checkMark: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#e91e8c',
        alignItems: 'center',
        justifyContent: 'center',
    },
    footer: {
        paddingHorizontal: 20,
        paddingBottom: 32,
        paddingTop: 12,
        gap: 10,
        alignItems: 'center',
    },
    nextBtn: {
        width: '100%',
        borderRadius: 18,
        overflow: 'hidden',
    },
    nextBtnDisabled: {
        opacity: 0.6,
    },
    nextBtnInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
    },
    nextBtnText: {
        fontSize: 17,
        fontWeight: '800',
        color: '#fff',
    },
    nextBtnTextDisabled: {
        color: 'rgba(255,255,255,0.4)',
    },
    counter: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.35)',
        fontWeight: '500',
    },
});
