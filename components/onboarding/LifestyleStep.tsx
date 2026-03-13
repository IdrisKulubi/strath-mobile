import React, { useCallback, useState } from 'react';
import {
    View,
    StyleSheet,
    Pressable,
    ScrollView,
} from 'react-native';
import Animated, {
    FadeInDown,
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import type { OnboardingData } from '@/components/digital-dna/types';

type LifestyleAnswers = OnboardingData['lifestyleAnswers'];

interface LifestyleStepProps {
    data: LifestyleAnswers;
    onComplete: (answers: LifestyleAnswers) => void;
    onBack: () => void;
}

interface Question {
    id: keyof LifestyleAnswers;
    title: string;
    subtitle: string;
    emoji: string;
    options: { value: string; label: string; emoji: string }[];
}

const QUESTIONS: Question[] = [
    {
        id: 'relationshipGoal',
        title: 'What are you looking for?',
        subtitle: 'Be honest — it helps us match better',
        emoji: '💜',
        options: [
            { value: 'serious', label: 'Something serious', emoji: '💍' },
            { value: 'casual', label: 'Casual & see where it goes', emoji: '🌊' },
            { value: 'open', label: 'Open to anything', emoji: '✨' },
        ],
    },
    {
        id: 'outingFrequency',
        title: 'How often do you go out?',
        subtitle: 'Per week on average',
        emoji: '📅',
        options: [
            { value: 'rarely', label: 'Rarely — homebody', emoji: '🏠' },
            { value: '1_2_week', label: '1–2 times a week', emoji: '🚶' },
            { value: '3_plus_week', label: '3+ times a week', emoji: '🎉' },
        ],
    },
    {
        id: 'drinks',
        title: 'Do you drink?',
        subtitle: 'No judgment here',
        emoji: '🥂',
        options: [
            { value: 'yes', label: 'Yes', emoji: '🍻' },
            { value: 'sometimes', label: 'Sometimes', emoji: '🤷' },
            { value: 'no', label: 'No', emoji: '🚫' },
        ],
    },
    {
        id: 'smokes',
        title: 'Do you smoke?',
        subtitle: 'Still no judgment',
        emoji: '💨',
        options: [
            { value: 'yes', label: 'Yes', emoji: '🚬' },
            { value: 'sometimes', label: 'Sometimes', emoji: '🤷' },
            { value: 'no', label: 'No', emoji: '🚫' },
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
                style={[styles.option, selected && styles.optionSelected]}
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

export function LifestyleStep({ data, onComplete, onBack }: LifestyleStepProps) {
    const [qIndex, setQIndex] = useState(0);
    const [answers, setAnswers] = useState<LifestyleAnswers>(data ?? {});

    const current = QUESTIONS[qIndex];
    const isAnswered = Boolean(answers[current?.id]);

    const handleSelect = useCallback((value: string) => {
        if (!current) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setAnswers((prev) => ({ ...prev, [current.id]: value }));
    }, [current]);

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

            {/* Step label */}
            <View style={styles.stepLabelWrap}>
                <View style={styles.stepLabel}>
                    <Ionicons name="leaf-outline" size={12} color="#e91e8c" />
                    <Text style={styles.stepLabelText}>Lifestyle</Text>
                </View>
            </View>

            {/* Question */}
            <Animated.View
                key={qIndex}
                entering={FadeInDown.springify().damping(16)}
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
                    {current.options.map((opt) => (
                        <OptionButton
                            key={opt.value}
                            option={opt}
                            selected={answers[current.id] === opt.value}
                            onPress={() => handleSelect(opt.value)}
                        />
                    ))}
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
                            {qIndex < TOTAL - 1 ? 'Next' : 'Continue'}
                        </Text>
                        <Ionicons
                            name={qIndex < TOTAL - 1 ? 'arrow-forward' : 'checkmark'}
                            size={20}
                            color={isAnswered ? '#fff' : 'rgba(255,255,255,0.4)'}
                        />
                    </LinearGradient>
                </Pressable>

                <Text style={styles.counter}>{qIndex + 1} of {TOTAL}</Text>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
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
    stepLabelWrap: {
        paddingHorizontal: 28,
        paddingTop: 12,
    },
    stepLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(233,30,140,0.12)',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    stepLabelText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#e91e8c',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    questionBlock: {
        paddingHorizontal: 28,
        paddingTop: 16,
        paddingBottom: 20,
        gap: 6,
    },
    questionEmoji: { fontSize: 40, marginBottom: 4 },
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
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 16 },
    optionsGrid: { gap: 10 },
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
    optionEmoji: { fontSize: 24 },
    optionLabel: {
        flex: 1,
        fontSize: 16,
        color: 'rgba(255,255,255,0.85)',
        fontWeight: '500',
    },
    optionLabelSelected: { color: '#fff', fontWeight: '700' },
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
    nextBtn: { width: '100%', borderRadius: 18, overflow: 'hidden' },
    nextBtnDisabled: { opacity: 0.6 },
    nextBtnInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
    },
    nextBtnText: { fontSize: 17, fontWeight: '800', color: '#fff' },
    nextBtnTextDisabled: { color: 'rgba(255,255,255,0.4)' },
    counter: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.35)',
        fontWeight: '500',
    },
});
