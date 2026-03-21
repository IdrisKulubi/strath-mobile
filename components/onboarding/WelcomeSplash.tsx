import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, {
    FadeIn,
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, ClockCountdown, ShootingStar, Sparkle } from 'phosphor-react-native';

import { Text } from '@/components/ui/text';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface WelcomeSplashProps {
    onStart: () => void;
    onBackToLogin?: () => void;
}

const PREVIEW_POINTS = ['Your essentials', 'Best photos', 'Your vibe'];

export function WelcomeSplash({ onStart, onBackToLogin }: WelcomeSplashProps) {
    const ctaScale = useSharedValue(1);
    const haloScale = useSharedValue(0.92);
    const haloOpacity = useSharedValue(0.7);
    const orbitShift = useSharedValue(0);

    useEffect(() => {
        haloScale.value = withRepeat(
            withSequence(
                withTiming(1.04, { duration: 2400 }),
                withTiming(0.92, { duration: 2400 })
            ),
            -1,
            true
        );
        haloOpacity.value = withRepeat(
            withSequence(
                withTiming(0.95, { duration: 2200 }),
                withTiming(0.58, { duration: 2200 })
            ),
            -1,
            true
        );
        orbitShift.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 3200 }),
                withTiming(-1, { duration: 3200 })
            ),
            -1,
            true
        );
    }, [haloOpacity, haloScale, orbitShift]);

    const handleStart = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        ctaScale.value = withSequence(
            withTiming(0.97, { duration: 90 }),
            withSpring(1.02, { damping: 10, stiffness: 220 }),
            withTiming(1, { duration: 120 })
        );
        setTimeout(onStart, 180);
    };

    const haloStyle = useAnimatedStyle(() => ({
        transform: [{ scale: haloScale.value }],
        opacity: haloOpacity.value,
    }));

    const orbitStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: orbitShift.value * 8 },
            { translateY: orbitShift.value * -5 },
        ],
    }));

    const ctaStyle = useAnimatedStyle(() => ({
        transform: [{ scale: ctaScale.value }],
    }));

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#0e0a1c', '#171028', '#26113a']}
                locations={[0, 0.45, 1]}
                style={StyleSheet.absoluteFill}
            />

            <View style={styles.backgroundLayer} pointerEvents="none">
                <LinearGradient
                    colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0)', 'transparent']}
                    start={{ x: 0.15, y: 0.05 }}
                    end={{ x: 0.8, y: 0.95 }}
                    style={styles.mistGlow}
                />
                <LinearGradient
                    colors={['rgba(236,72,153,0.24)', 'rgba(244,63,94,0.16)', 'rgba(236,72,153,0)']}
                    start={{ x: 0.3, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.topGlow}
                />
                <LinearGradient
                    colors={['rgba(168,85,247,0.18)', 'rgba(236,72,153,0.1)', 'rgba(168,85,247,0)']}
                    start={{ x: 0.2, y: 0.1 }}
                    end={{ x: 0.9, y: 1 }}
                    style={styles.bottomGlow}
                />
            </View>

            <View style={styles.content}>
                <Animated.View entering={FadeIn.delay(80).duration(400)} style={styles.topRow}>
                    {onBackToLogin ? (
                        <TouchableOpacity activeOpacity={0.8} onPress={onBackToLogin} style={styles.backButton}>
                            <ArrowLeft size={20} color="#F8F4FF" weight="bold" />
                        </TouchableOpacity>
                    ) : (
                        <View />
                    )}

                    <View style={styles.stepPill}>
                        <Text style={styles.stepPillText}>Step 1 of 8</Text>
                    </View>
                </Animated.View>

                <View style={styles.centerBlock}>
                   

                    <Animated.View entering={FadeInDown.delay(240).duration(500)} style={styles.copyBlock}>
                        <View style={styles.eyebrow}>
                            <ShootingStar size={14} color="#FFB5DA" weight="fill" />
                            <Text style={styles.eyebrowText}>Profile setup, but make it smooth</Text>
                        </View>

                        <Text style={styles.title}>
                            Ready to meet{'\n'}someone worth it?
                        </Text>

                        <Text style={styles.subtitle}>
                            We&apos;ll shape your profile in a few playful taps so your matches actually feel aligned.
                        </Text>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(320).duration(520)} style={styles.previewCard}>
                        <View style={styles.previewHeader}>
                            <Text style={styles.previewTitle}>What we&apos;ll do</Text>
                            <View style={styles.previewTime}>
                                <ClockCountdown size={14} color="#FFD0EA" weight="bold" />
                                <Text style={styles.previewTimeText}>2-3 min</Text>
                            </View>
                        </View>

                        <View style={styles.previewPoints}>
                            {PREVIEW_POINTS.map((item) => (
                                <View key={item} style={styles.previewChip}>
                                    <Text style={styles.previewChipText}>{item}</Text>
                                </View>
                            ))}
                        </View>

                        <Text style={styles.previewFootnote}>
                            Quick, low-pressure, and designed to get you to the fun part fast.
                        </Text>
                    </Animated.View>
                </View>

                <Animated.View entering={FadeInDown.delay(420).duration(520)} style={styles.bottomBlock}>
                    <Animated.View style={ctaStyle}>
                        <TouchableOpacity activeOpacity={0.9} onPress={handleStart}>
                            <LinearGradient
                                colors={['#F255AE', '#EC4899', '#F43F5E']}
                                start={{ x: 0, y: 0.2 }}
                                end={{ x: 1, y: 0.9 }}
                                style={styles.ctaButton}
                            >
                                <Text style={styles.ctaText}>Let&apos;s Go</Text>
                                <Sparkle size={18} color="#FFFFFF" weight="fill" />
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>

                    <Text style={styles.bottomHint}>No boring forms. Just the good stuff.</Text>
                </Animated.View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backgroundLayer: {
        ...StyleSheet.absoluteFillObject,
    },
    mistGlow: {
        position: 'absolute',
        top: 60,
        left: -SCREEN_WIDTH * 0.18,
        width: SCREEN_WIDTH * 0.9,
        height: 260,
        borderRadius: 140,
    },
    topGlow: {
        position: 'absolute',
        top: 120,
        right: -SCREEN_WIDTH * 0.15,
        width: SCREEN_WIDTH * 0.72,
        height: 260,
        borderRadius: 140,
    },
    bottomGlow: {
        position: 'absolute',
        bottom: 120,
        left: -SCREEN_WIDTH * 0.12,
        width: SCREEN_WIDTH * 0.7,
        height: 220,
        borderRadius: 120,
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 18,
        paddingBottom: 28,
        justifyContent: 'space-between',
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    backButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    stepPill: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    stepPillText: {
        color: '#EEDBF9',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    centerBlock: {
        alignItems: 'center',
        gap: 24,
    },
    logoWrap: {
        width: 122,
        height: 122,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
    },
    logoHalo: {
        position: 'absolute',
        width: 122,
        height: 122,
        borderRadius: 61,
        backgroundColor: 'rgba(242,85,174,0.22)',
    },
    logoOrbit: {
        position: 'absolute',
        top: 12,
        right: 10,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    logoCore: {
        width: 92,
        height: 92,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#EC4899',
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.32,
        shadowRadius: 26,
        elevation: 12,
    },
    copyBlock: {
        alignItems: 'center',
        gap: 14,
    },
    eyebrow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    eyebrowText: {
        color: '#FAD8EC',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: -0.1,
    },
    title: {
        color: '#FFFFFF',
        fontSize: 42,
        fontWeight: '800',
        textAlign: 'center',
        lineHeight: 47,
        letterSpacing: -1.8,
    },
    subtitle: {
        color: '#B7AFC7',
        fontSize: 18,
        lineHeight: 27,
        fontWeight: '500',
        textAlign: 'center',
        maxWidth: 320,
    },
    previewCard: {
        width: '100%',
        borderRadius: 28,
        padding: 18,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        gap: 14,
    },
    previewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    previewTitle: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    previewTime: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: 'rgba(242,85,174,0.12)',
    },
    previewTimeText: {
        color: '#FFD0EA',
        fontSize: 12,
        fontWeight: '700',
    },
    previewPoints: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    previewChip: {
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    previewChipText: {
        color: '#F5EEFF',
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: -0.1,
    },
    previewFootnote: {
        color: '#A89DBA',
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '500',
    },
    bottomBlock: {
        alignItems: 'center',
        gap: 14,
    },
    ctaButton: {
        minWidth: 220,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingHorizontal: 30,
        paddingVertical: 18,
        borderRadius: 999,
        shadowColor: '#EC4899',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 24,
        elevation: 10,
    },
    ctaText: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    bottomHint: {
        color: '#9E94B1',
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: -0.1,
    },
});
