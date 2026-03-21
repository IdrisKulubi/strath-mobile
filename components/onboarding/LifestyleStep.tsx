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
import { HeartStraight, CalendarBlank, Leaf } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
    icon: React.ComponentType<{ size: number; color: string; weight?: 'fill' }>;
    options: { value: string; label: string; emoji: string }[];
}

const QUESTIONS: Question[] = [
    {
        id: 'relationshipGoal',
        title: 'What are you looking for?',
        subtitle: 'Be honest - it helps us match better',
        icon: HeartStraight,
        options: [
            { value: 'serious', label: 'Something serious', emoji: '💍' },
            { value: 'casual', label: 'Casual and see where it goes', emoji: '🌊' },
            { value: 'open', label: 'Open to anything', emoji: '✨' },
        ],
    },
    {
        id: 'outingFrequency',
        title: 'How often do you go out?',
        subtitle: 'Your average week',
        icon: CalendarBlank,
        options: [
            { value: 'rarely', label: 'Rarely - homebody', emoji: '🏠' },
            { value: '1_2_week', label: '1-2 times a week', emoji: '🚶' },
            { value: '3_plus_week', label: '3+ times a week', emoji: '🎉' },
        ],
    },
];

const TOTAL = QUESTIONS.length;

function LifestyleOption({
    option,
    isSelected,
    onPress,
    index,
}: {
    option: Question['options'][number];
    isSelected: boolean;
    onPress: () => void;
    index: number;
}) {
    return (
        <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onPress();
                }}
            >
                <View style={[styles.optionCard, isSelected && styles.optionCardSelected]}>
                    <Text style={styles.optionEmoji}>{option.emoji}</Text>
                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{option.label}</Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={22} color="#fff" />}
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

export function LifestyleStep({ data, onComplete, onBack }: LifestyleStepProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<LifestyleAnswers>(data ?? {});
    const progressWidth = useSharedValue(0);
    const insets = useSafeAreaInsets();

    const currentQuestion = QUESTIONS[currentIndex];
    const selectedValue = answers[currentQuestion.id];
    const Icon = currentQuestion.icon;

    useEffect(() => {
        progressWidth.value = withSpring(((currentIndex + 1) / TOTAL) * 100, { damping: 15 });
    }, [currentIndex, progressWidth]);

    const progressStyle = useAnimatedStyle(() => ({
        width: `${progressWidth.value}%`,
    }));

    const handleSelect = useCallback((value: string) => {
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
    }, [answers, currentIndex, currentQuestion.id, onComplete]);

    const handleBack = useCallback(() => {
        if (currentIndex > 0) {
            setCurrentIndex((prev) => prev - 1);
        } else {
            onBack();
        }
    }, [currentIndex, onBack]);

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
                    <Leaf size={16} color="#f59e0b" weight="fill" />
                    <Text style={styles.progressText}>Lifestyle</Text>
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

                    <View style={styles.optionsContainer}>
                        {currentQuestion.options.map((option, index) => (
                            <LifestyleOption
                                key={option.value}
                                option={option}
                                isSelected={selectedValue === option.value}
                                onPress={() => handleSelect(option.value)}
                                index={index}
                            />
                        ))}
                    </View>
                </Animated.View>
            </ScrollView>

            <Animated.Text entering={FadeIn.delay(250)} style={styles.helperText}>
                Tap an answer to continue
            </Animated.Text>
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
    optionCardSelected: {
        backgroundColor: 'rgba(236,72,153,0.18)',
        borderColor: '#ec4899',
    },
    optionEmoji: {
        fontSize: 22,
    },
    optionText: {
        flex: 1,
        fontSize: 18,
        fontWeight: '700',
        color: '#E2D8EC',
        letterSpacing: -0.2,
    },
    optionTextSelected: {
        color: '#fff',
    },
    helperText: {
        paddingBottom: 34,
        textAlign: 'center',
        fontSize: 13,
        color: '#64748b',
    },
});
