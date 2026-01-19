import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withSequence,
    FadeIn,
    FadeOut,
    SlideInLeft,
    SlideInRight,
    SlideOutLeft,
    SlideOutRight,
    ZoomIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
    SunHorizon,
    Moon,
    Bed,
    Barbell,
    Coffee,
    Wine,
    DeviceMobile,
    Heart,
    ChatCircle,
    Fire,
    Brain,
    Eye,
    Lightning,
    Sparkle,
} from 'phosphor-react-native';

interface VibeCheckGameProps {
    onComplete: (results: VibeResults) => void;
}

interface VibeResults {
    personalityType: string;
    communicationStyle: string;
    sleepingHabits: string;
    workoutFrequency: string;
    socialMediaUsage: string;
    drinkingPreference: string;
    loveLanguage: string;
}

interface Question {
    id: string;
    category: keyof VibeResults;
    optionA: { emoji: string; text: string; icon?: any; value: string };
    optionB: { emoji: string; text: string; icon?: any; value: string };
}

const QUESTIONS: Question[] = [
    {
        id: '1',
        category: 'sleepingHabits',
        optionA: { emoji: '🌅', text: 'Early Bird', icon: SunHorizon, value: 'Early Bird' },
        optionB: { emoji: '🦉', text: 'Night Owl', icon: Moon, value: 'Night Owl' },
    },
    {
        id: '2',
        category: 'workoutFrequency',
        optionA: { emoji: '💪', text: 'Gym Regular', icon: Barbell, value: 'Daily' },
        optionB: { emoji: '🛋️', text: 'Rest Day Everyday', icon: Bed, value: 'Never' },
    },
    {
        id: '3',
        category: 'socialMediaUsage',
        optionA: { emoji: '📱', text: 'Always Online', icon: DeviceMobile, value: 'Heavy' },
        optionB: { emoji: '🌿', text: 'Digital Detox', icon: Eye, value: 'Minimal' },
    },
    {
        id: '4',
        category: 'drinkingPreference',
        optionA: { emoji: '🍷', text: 'Social Drinks', icon: Wine, value: 'Socially' },
        optionB: { emoji: '☕', text: 'Caffeine Only', icon: Coffee, value: 'Never' },
    },
    {
        id: '5',
        category: 'communicationStyle',
        optionA: { emoji: '💬', text: 'Texter', icon: ChatCircle, value: 'Texter' },
        optionB: { emoji: '📞', text: 'Caller', icon: DeviceMobile, value: 'Phone Calls' },
    },
    {
        id: '6',
        category: 'loveLanguage',
        optionA: { emoji: '🫂', text: 'Quality Time', icon: Heart, value: 'Quality Time' },
        optionB: { emoji: '🎁', text: 'Gifts & Acts', icon: Sparkle, value: 'Gifts' },
    },
    {
        id: '7',
        category: 'personalityType',
        optionA: { emoji: '🎉', text: 'Life of the Party', icon: Fire, value: 'ENFP' },
        optionB: { emoji: '📚', text: 'Deep Thinker', icon: Brain, value: 'INFJ' },
    },
];

const ThisOrThatCard = ({
    option,
    side,
    onSelect,
    isSelected,
    disabled,
}: {
    option: { emoji: string; text: string; icon?: any; value: string };
    side: 'left' | 'right';
    onSelect: () => void;
    isSelected: boolean | null;
    disabled: boolean;
}) => {
    const scale = useSharedValue(1);
    const bgOpacity = useSharedValue(0);
    const Icon = option.icon;

    useEffect(() => {
        if (isSelected === true) {
            scale.value = withSequence(
                withTiming(1.05, { duration: 100 }),
                withSpring(1, { damping: 10 })
            );
            bgOpacity.value = withTiming(1, { duration: 200 });
        } else if (isSelected === false) {
            scale.value = withTiming(0.9, { duration: 200 });
            bgOpacity.value = withTiming(0.3, { duration: 200 });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSelected]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const bgStyle = useAnimatedStyle(() => ({
        opacity: bgOpacity.value,
    }));

    return (
        <TouchableOpacity
            onPress={() => {
                if (!disabled) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    onSelect();
                }
            }}
            activeOpacity={0.8}
            disabled={disabled}
            style={{ flex: 1 }}
        >
            <Animated.View style={[styles.optionCard, animatedStyle]}>
                {/* Selected background */}
                <Animated.View style={[styles.selectedBg, bgStyle]}>
                    <LinearGradient
                        colors={side === 'left' ? ['#ec4899', '#f43f5e'] : ['#8b5cf6', '#6366f1']}
                        style={StyleSheet.absoluteFill}
                    />
                </Animated.View>

                {/* Icon */}
                {Icon && (
                    <View style={styles.optionIconContainer}>
                        <Icon 
                            size={32} 
                            color={isSelected ? '#fff' : side === 'left' ? '#ec4899' : '#8b5cf6'} 
                            weight="fill" 
                        />
                    </View>
                )}

                {/* Emoji */}
                <Text style={styles.optionEmoji}>{option.emoji}</Text>

                {/* Text */}
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                    {option.text}
                </Text>
            </Animated.View>
        </TouchableOpacity>
    );
};

const ProgressBar = ({ current, total }: { current: number; total: number }) => {
    const progress = useSharedValue(0);

    useEffect(() => {
        progress.value = withSpring((current / total) * 100, { damping: 15 });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [current, total]);

    const progressStyle = useAnimatedStyle(() => ({
        width: `${progress.value}%`,
    }));

    return (
        <View style={styles.progressBar}>
            <Animated.View style={[styles.progressFill, progressStyle]}>
                <LinearGradient
                    colors={['#ec4899', '#8b5cf6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                />
            </Animated.View>
        </View>
    );
};

export function VibeCheckGame({ onComplete }: VibeCheckGameProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [selectedSide, setSelectedSide] = useState<'left' | 'right' | null>(null);
    const [showQuestion, setShowQuestion] = useState(true);

    const currentQuestion = QUESTIONS[currentIndex];
    const isLastQuestion = currentIndex === QUESTIONS.length - 1;

    const handleSelect = useCallback((side: 'left' | 'right') => {
        if (selectedSide !== null) return;
        
        setSelectedSide(side);
        const value = side === 'left' 
            ? currentQuestion.optionA.value 
            : currentQuestion.optionB.value;
        
        setAnswers((prev) => ({
            ...prev,
            [currentQuestion.category]: value,
        }));

        // Transition to next question
        setTimeout(() => {
            setShowQuestion(false);
            
            setTimeout(() => {
                if (isLastQuestion) {
                    // Complete the game
                    const results: VibeResults = {
                        personalityType: answers.personalityType || 'ENFP',
                        communicationStyle: answers.communicationStyle || 'Texter',
                        sleepingHabits: answers.sleepingHabits || 'Night Owl',
                        workoutFrequency: answers.workoutFrequency || 'Sometimes',
                        socialMediaUsage: answers.socialMediaUsage || 'Moderate',
                        drinkingPreference: answers.drinkingPreference || 'Socially',
                        loveLanguage: answers.loveLanguage || 'Quality Time',
                        ...answers,
                        [currentQuestion.category]: value,
                    };
                    onComplete(results);
                } else {
                    setCurrentIndex((prev) => prev + 1);
                    setSelectedSide(null);
                    setShowQuestion(true);
                }
            }, 300);
        }, 500);
    }, [selectedSide, currentQuestion, isLastQuestion, answers, onComplete]);

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#0f0d23', '#1a0d2e', '#0f0d23']}
                style={StyleSheet.absoluteFill}
            />

            {/* Header */}
            <View style={styles.header}>
                <ProgressBar current={currentIndex + 1} total={QUESTIONS.length} />
                <Text style={styles.headerTitle}>Vibe Check ⚡</Text>
                <Text style={styles.headerSubtitle}>
                    {currentIndex + 1} of {QUESTIONS.length}
                </Text>
            </View>

            {/* Question */}
            <View style={styles.questionContainer}>
                {showQuestion && (
                    <Animated.View
                        entering={ZoomIn.springify()}
                        exiting={FadeOut.duration(200)}
                        style={styles.vsContainer}
                    >
                        <Text style={styles.questionText}>Which one is more you?</Text>
                        
                        <View style={styles.vsIndicator}>
                            <Lightning size={40} color="#f59e0b" weight="fill" />
                            <Text style={styles.vsText}>VS</Text>
                        </View>
                    </Animated.View>
                )}
            </View>

            {/* Options */}
            <View style={styles.optionsContainer}>
                {showQuestion && (
                    <>
                        <Animated.View 
                            entering={SlideInLeft.springify().delay(100)}
                            exiting={SlideOutLeft.duration(200)}
                            style={{ flex: 1 }}
                        >
                            <ThisOrThatCard
                                option={currentQuestion.optionA}
                                side="left"
                                onSelect={() => handleSelect('left')}
                                isSelected={selectedSide === null ? null : selectedSide === 'left'}
                                disabled={selectedSide !== null}
                            />
                        </Animated.View>

                        <Animated.View 
                            entering={SlideInRight.springify().delay(100)}
                            exiting={SlideOutRight.duration(200)}
                            style={{ flex: 1 }}
                        >
                            <ThisOrThatCard
                                option={currentQuestion.optionB}
                                side="right"
                                onSelect={() => handleSelect('right')}
                                isSelected={selectedSide === null ? null : selectedSide === 'right'}
                                disabled={selectedSide !== null}
                            />
                        </Animated.View>
                    </>
                )}
            </View>

            {/* Skip hint */}
            <Animated.Text 
                entering={FadeIn.delay(500)} 
                style={styles.skipHint}
            >
                Tap to choose • No wrong answers! 🎯
            </Animated.Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 24,
        paddingBottom: 24,
    },
    progressBar: {
        height: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 20,
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#64748b',
        textAlign: 'center',
    },
    questionContainer: {
        paddingHorizontal: 24,
        alignItems: 'center',
        marginBottom: 24,
    },
    vsContainer: {
        alignItems: 'center',
    },
    questionText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 16,
    },
    vsIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    vsText: {
        fontSize: 28,
        fontWeight: '900',
        color: '#f59e0b',
    },
    optionsContainer: {
        flex: 1,
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 12,
    },
    optionCard: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderRadius: 24,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        overflow: 'hidden',
    },
    selectedBg: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0,
    },
    optionIconContainer: {
        marginBottom: 16,
    },
    optionEmoji: {
        fontSize: 48,
        marginBottom: 12,
    },
    optionText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#94a3b8',
        textAlign: 'center',
    },
    optionTextSelected: {
        color: '#fff',
    },
    skipHint: {
        fontSize: 14,
        color: '#64748b',
        textAlign: 'center',
        paddingVertical: 32,
    },
});
