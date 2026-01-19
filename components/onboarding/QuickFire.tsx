import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    FadeIn,
    FadeInDown,
    SlideInRight,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
    Ruler,
    CalendarBlank,
    Wine,
    Cigarette,
    Cross,
    CheckCircle,
    Lightning,
} from 'phosphor-react-native';
import { HEIGHT_OPTIONS } from '@/constants/profile-options';

interface QuickFireProps {
    data: {
        height?: string;
        course?: string;
        yearOfStudy?: number;
        drinkingPreference?: string;
        smoking?: string;
        religion?: string;
        education?: string;
    };
    onUpdate: (data: Partial<QuickFireProps['data']>) => void;
    onComplete: () => void;
}

interface QuestionConfig {
    id: string;
    key: keyof QuickFireProps['data'];
    icon: any;
    title: string;
    subtitle: string;
    options: { value: string | number; label: string; emoji?: string }[];
    isRequired?: boolean;
}

const QUICK_FIRE_QUESTIONS: QuestionConfig[] = [
    {
        id: 'height',
        key: 'height',
        icon: Ruler,
        title: "How tall are you?",
        subtitle: "In feet & inches",
        isRequired: false,
        options: HEIGHT_OPTIONS.slice(0, 8).map((h) => ({
            value: h,
            label: h,
            emoji: h.includes("5'") ? '📏' : h.includes("6'") ? '📐' : '📏',
        })),
    },
    {
        id: 'yearOfStudy',
        key: 'yearOfStudy',
        icon: CalendarBlank,
        title: "What year are you in?",
        subtitle: "Your academic year",
        isRequired: true,
        options: [
            { value: 1, label: '1st Year', emoji: '🌱' },
            { value: 2, label: '2nd Year', emoji: '🌿' },
            { value: 3, label: '3rd Year', emoji: '🌳' },
            { value: 4, label: '4th Year', emoji: '🎓' },
            { value: 5, label: 'Postgrad', emoji: '🎯' },
        ],
    },
    {
        id: 'drinking',
        key: 'drinkingPreference',
        icon: Wine,
        title: "Do you drink?",
        subtitle: "Social habits",
        isRequired: false,
        options: [
            { value: 'Never', label: 'Never', emoji: '🚫' },
            { value: 'Socially', label: 'Socially', emoji: '🍻' },
            { value: 'Often', label: 'Often', emoji: '🍷' },
            { value: 'Prefer not to say', label: 'Skip', emoji: '🤐' },
        ],
    },
    {
        id: 'smoking',
        key: 'smoking',
        icon: Cigarette,
        title: "Do you smoke?",
        subtitle: "Just being honest",
        isRequired: false,
        options: [
            { value: 'Never', label: 'Never', emoji: '🚭' },
            { value: 'Sometimes', label: 'Sometimes', emoji: '💨' },
            { value: 'Often', label: 'Often', emoji: '🚬' },
            { value: 'Prefer not to say', label: 'Skip', emoji: '🤐' },
        ],
    },
    {
        id: 'religion',
        key: 'religion',
        icon: Cross,
        title: "Your faith?",
        subtitle: "Optional - helps with compatibility",
        isRequired: false,
        options: [
            { value: 'Christian', label: 'Christian', emoji: '✝️' },
            { value: 'Muslim', label: 'Muslim', emoji: '☪️' },
            { value: 'Hindu', label: 'Hindu', emoji: '🕉️' },
            { value: 'Atheist', label: 'Atheist', emoji: '🔬' },
            { value: 'Spiritual', label: 'Spiritual', emoji: '✨' },
            { value: 'Other', label: 'Other', emoji: '🌍' },
            { value: 'Prefer not to say', label: 'Skip', emoji: '🤐' },
        ],
    },
];

const QuickOption = ({
    option,
    isSelected,
    onSelect,
    index,
}: {
    option: { value: string | number; label: string; emoji?: string };
    isSelected: boolean;
    onSelect: () => void;
    index: number;
}) => {
    return (
        <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
            <TouchableOpacity
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onSelect();
                }}
                activeOpacity={0.7}
            >
                <View style={[styles.optionChip, isSelected && styles.optionChipSelected]}>
                    {option.emoji && <Text style={styles.optionEmoji}>{option.emoji}</Text>}
                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                        {option.label}
                    </Text>
                    {isSelected && <CheckCircle size={18} color="#fff" weight="fill" />}
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

export function QuickFire({ data, onUpdate, onComplete }: QuickFireProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, any>>(data);

    const currentQuestion = QUICK_FIRE_QUESTIONS[currentIndex];
    const isLastQuestion = currentIndex === QUICK_FIRE_QUESTIONS.length - 1;

    const progressWidth = useSharedValue(0);

    useEffect(() => {
        progressWidth.value = withSpring(
            ((currentIndex + 1) / QUICK_FIRE_QUESTIONS.length) * 100,
            { damping: 15 }
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentIndex]);

    const progressStyle = useAnimatedStyle(() => ({
        width: `${progressWidth.value}%`,
    }));

    const handleSelect = (value: string | number) => {
        const key = currentQuestion.key;
        const newAnswers = { ...answers, [key]: value };
        setAnswers(newAnswers);
        onUpdate({ [key]: value });

        // Auto-advance after selection
        setTimeout(() => {
            if (isLastQuestion) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                onComplete();
            } else {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setCurrentIndex((prev) => prev + 1);
            }
        }, 300);
    };

    const handleSkip = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (isLastQuestion) {
            onComplete();
        } else {
            setCurrentIndex((prev) => prev + 1);
        }
    };

    const Icon = currentQuestion.icon;
    const selectedValue = answers[currentQuestion.key];

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#0f0d23', '#1a0d2e', '#0f0d23']}
                style={StyleSheet.absoluteFill}
            />

            {/* Progress */}
            <View style={styles.progressContainer}>
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
                    <Lightning size={16} color="#f59e0b" weight="fill" />
                    <Text style={styles.progressText}>Quick Fire Round</Text>
                    <Text style={styles.progressCount}>
                        {currentIndex + 1}/{QUICK_FIRE_QUESTIONS.length}
                    </Text>
                </View>
            </View>

            {/* Question */}
            <ScrollView 
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <Animated.View
                    key={currentQuestion.id}
                    entering={SlideInRight.springify()}
                    style={styles.questionContainer}
                >
                    <View style={styles.iconContainer}>
                        <Icon size={32} color="#ec4899" weight="fill" />
                    </View>
                    <Text style={styles.title}>{currentQuestion.title}</Text>
                    <Text style={styles.subtitle}>{currentQuestion.subtitle}</Text>

                    {/* Options */}
                    <View style={styles.optionsContainer}>
                        {currentQuestion.options.map((option, index) => (
                            <QuickOption
                                key={option.value.toString()}
                                option={option}
                                isSelected={selectedValue === option.value}
                                onSelect={() => handleSelect(option.value)}
                                index={index}
                            />
                        ))}
                    </View>
                </Animated.View>
            </ScrollView>

            {/* Skip button */}
            {!currentQuestion.isRequired && (
                <Animated.View entering={FadeIn.delay(500)} style={styles.skipContainer}>
                    <TouchableOpacity onPress={handleSkip}>
                        <Text style={styles.skipText}>Skip this question</Text>
                    </TouchableOpacity>
                </Animated.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    progressContainer: {
        paddingTop: 60,
        paddingHorizontal: 24,
        paddingBottom: 8,
    },
    progressBarBg: {
        height: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
    questionContainer: {
        paddingHorizontal: 24,
        paddingTop: 32,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: 'rgba(236, 72, 153, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#94a3b8',
        marginBottom: 32,
    },
    optionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    optionChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 50,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    optionChipSelected: {
        backgroundColor: 'rgba(236, 72, 153, 0.2)',
        borderColor: '#ec4899',
    },
    optionEmoji: {
        fontSize: 18,
    },
    optionText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#94a3b8',
    },
    optionTextSelected: {
        color: '#fff',
    },
    skipContainer: {
        paddingHorizontal: 24,
        paddingBottom: 40,
        alignItems: 'center',
    },
    skipText: {
        fontSize: 16,
        color: '#64748b',
        textDecorationLine: 'underline',
    },
});
