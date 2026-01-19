import React, { useState, useEffect, useCallback } from 'react';
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
    withTiming,
    withDelay,
    withRepeat,
    withSequence,
    FadeIn,
    FadeInDown,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Sparkle, Check } from 'phosphor-react-native';

interface BubblePickerProps {
    interests: string[];
    onComplete: (selected: string[]) => void;
    minSelection?: number;
    maxSelection?: number;
}

interface Interest {
    id: string;
    label: string;
    emoji: string;
}

const INTERESTS_DATA: Interest[] = [
    { id: '1', label: 'Music', emoji: '🎵' },
    { id: '2', label: 'Gaming', emoji: '🎮' },
    { id: '3', label: 'Anime', emoji: '✨' },
    { id: '4', label: 'Gym', emoji: '💪' },
    { id: '5', label: 'Travel', emoji: '✈️' },
    { id: '6', label: 'Foodie', emoji: '🍕' },
    { id: '7', label: 'Photography', emoji: '📸' },
    { id: '8', label: 'Art', emoji: '🎨' },
    { id: '9', label: 'Reading', emoji: '📚' },
    { id: '10', label: 'Movies', emoji: '🎬' },
    { id: '11', label: 'Coding', emoji: '💻' },
    { id: '12', label: 'Fashion', emoji: '👗' },
    { id: '13', label: 'Sports', emoji: '⚽' },
    { id: '14', label: 'Cooking', emoji: '👨‍🍳' },
    { id: '15', label: 'Dancing', emoji: '💃' },
    { id: '16', label: 'Hiking', emoji: '🥾' },
    { id: '17', label: 'Pets', emoji: '🐕' },
    { id: '18', label: 'Yoga', emoji: '🧘' },
    { id: '19', label: 'Startups', emoji: '🚀' },
    { id: '20', label: 'Crypto', emoji: '₿' },
    { id: '21', label: 'Tech', emoji: '📱' },
    { id: '22', label: 'Netflix', emoji: '📺' },
    { id: '23', label: 'Coffee', emoji: '☕' },
    { id: '24', label: 'Astrology', emoji: '🔮' },
];

interface BubbleProps {
    interest: Interest;
    isSelected: boolean;
    onToggle: () => void;
    index: number;
    disabled: boolean;
}

const Bubble = ({ interest, isSelected, onToggle, index, disabled }: BubbleProps) => {
    const scale = useSharedValue(0);
    const floatY = useSharedValue(0);
    const rotation = useSharedValue(0);
    const selectionScale = useSharedValue(1);

    useEffect(() => {
        // Entrance animation
        scale.value = withDelay(
            index * 30,
            withSpring(1, { damping: 12, stiffness: 150 })
        );
        
        // Floating animation
        floatY.value = withDelay(
            index * 50,
            withRepeat(
                withSequence(
                    withTiming(-8, { duration: 1500 + Math.random() * 1000 }),
                    withTiming(8, { duration: 1500 + Math.random() * 1000 })
                ),
                -1,
                true
            )
        );

        // Subtle rotation
        rotation.value = withDelay(
            index * 30,
            withRepeat(
                withSequence(
                    withTiming(-3, { duration: 2000 }),
                    withTiming(3, { duration: 2000 })
                ),
                -1,
                true
            )
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (isSelected) {
            selectionScale.value = withSequence(
                withSpring(1.15, { damping: 8 }),
                withSpring(1.05, { damping: 12 })
            );
        } else {
            selectionScale.value = withSpring(1, { damping: 12 });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSelected]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value * selectionScale.value },
            { translateY: floatY.value },
            { rotate: `${rotation.value}deg` },
        ],
    }));

    const handlePress = () => {
        if (disabled && !isSelected) return;
        Haptics.impactAsync(isSelected ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);
        onToggle();
    };

    return (
        <Animated.View style={[styles.bubbleWrapper, animatedStyle]}>
            <TouchableOpacity
                onPress={handlePress}
                activeOpacity={0.8}
                disabled={disabled && !isSelected}
            >
                <View
                    style={[
                        styles.bubble,
                        isSelected && styles.bubbleSelected,
                        disabled && !isSelected && styles.bubbleDisabled,
                    ]}
                >
                    {isSelected && (
                        <LinearGradient
                            colors={['#ec4899', '#f43f5e']}
                            style={StyleSheet.absoluteFill}
                        />
                    )}
                    <Text style={styles.bubbleEmoji}>{interest.emoji}</Text>
                    <Text style={[styles.bubbleText, isSelected && styles.bubbleTextSelected]}>
                        {interest.label}
                    </Text>
                    {isSelected && (
                        <View style={styles.checkBadge}>
                            <Check size={10} color="#fff" weight="bold" />
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

export function BubblePicker({
    interests,
    onComplete,
    minSelection = 3,
    maxSelection = 10,
}: BubblePickerProps) {
    const [selected, setSelected] = useState<string[]>(interests);

    const toggleInterest = useCallback((label: string) => {
        setSelected((prev) => {
            if (prev.includes(label)) {
                return prev.filter((i) => i !== label);
            }
            if (prev.length >= maxSelection) {
                return prev;
            }
            return [...prev, label];
        });
    }, [maxSelection]);

    const isAtMax = selected.length >= maxSelection;
    const canContinue = selected.length >= minSelection;

    const handleContinue = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        onComplete(selected);
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#0f0d23', '#1a0d2e', '#0f0d23']}
                style={StyleSheet.absoluteFill}
            />

            {/* Header */}
            <View style={styles.header}>
                <Animated.View entering={FadeInDown.delay(100)} style={styles.iconContainer}>
                    <Sparkle size={32} color="#ec4899" weight="fill" />
                </Animated.View>
                <Animated.Text entering={FadeInDown.delay(200)} style={styles.title}>
                    Pick your vibes
                </Animated.Text>
                <Animated.Text entering={FadeInDown.delay(300)} style={styles.subtitle}>
                    Choose {minSelection}-{maxSelection} interests that define you
                </Animated.Text>

                {/* Counter */}
                <Animated.View entering={FadeIn.delay(400)} style={styles.counterContainer}>
                    <Text style={[styles.counter, canContinue && styles.counterValid]}>
                        {selected.length} / {maxSelection}
                    </Text>
                    {!canContinue && (
                        <Text style={styles.counterHint}>
                            Pick at least {minSelection - selected.length} more
                        </Text>
                    )}
                </Animated.View>
            </View>

            {/* Bubbles Grid */}
            <ScrollView 
                style={styles.bubblesContainer}
                contentContainerStyle={styles.bubblesScrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.bubblesGrid}>
                    {INTERESTS_DATA.map((interest, index) => (
                        <Bubble
                            key={interest.id}
                            interest={interest}
                            isSelected={selected.includes(interest.label)}
                            onToggle={() => toggleInterest(interest.label)}
                            index={index}
                            disabled={isAtMax}
                        />
                    ))}
                </View>
            </ScrollView>

            {/* Continue Button */}
            <View style={styles.footer}>
                <TouchableOpacity
                    onPress={handleContinue}
                    disabled={!canContinue}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={canContinue ? ['#ec4899', '#f43f5e'] : ['#374151', '#374151']}
                        style={styles.continueButton}
                    >
                        <Text style={[styles.continueButtonText, !canContinue && styles.disabledText]}>
                            Continue
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
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
        paddingBottom: 16,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: 'rgba(236, 72, 153, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
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
        marginBottom: 16,
    },
    counterContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    counter: {
        fontSize: 16,
        fontWeight: '700',
        color: '#64748b',
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    counterValid: {
        color: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
    },
    counterHint: {
        fontSize: 14,
        color: '#f59e0b',
    },
    bubblesContainer: {
        flex: 1,
        paddingHorizontal: 12,
    },
    bubblesScrollContent: {
        paddingBottom: 24,
    },
    bubblesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 10,
    },
    bubbleWrapper: {
        margin: 4,
    },
    bubble: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        overflow: 'hidden',
    },
    bubbleSelected: {
        borderColor: '#ec4899',
    },
    bubbleDisabled: {
        opacity: 0.4,
    },
    bubbleEmoji: {
        fontSize: 18,
    },
    bubbleText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#94a3b8',
    },
    bubbleTextSelected: {
        color: '#fff',
    },
    checkBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#10b981',
        justifyContent: 'center',
        alignItems: 'center',
    },
    footer: {
        paddingHorizontal: 24,
        paddingBottom: 40,
        paddingTop: 16,
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
});
