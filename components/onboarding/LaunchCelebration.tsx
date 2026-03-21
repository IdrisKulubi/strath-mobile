import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, {
    Easing,
    FadeInUp,
    ZoomIn,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ArrowClockwise, CheckCircle, Heart, Rocket, Sparkle, Star } from 'phosphor-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const LOADING_STAGES = [
    {
        title: 'Shaping your profile vibe',
        detail: 'Turning your answers and photos into a profile that feels polished and intentional.',
    },
    {
        title: 'Polishing your first impression',
        detail: 'Lining up the details that make people pause, read, and want to know more.',
    },
    {
        title: 'Getting discovery ready',
        detail: 'Warming up your feed so your first connections feel more relevant from the start.',
    },
];

const CONFETTI_COLORS = ['#ec4899', '#f43f5e', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#f472b6'];

const ConfettiPiece = ({ delay, startX, color }: { delay: number; startX: number; color: string }) => {
    const translateY = useSharedValue(-50);
    const translateX = useSharedValue(startX);
    const rotation = useSharedValue(0);
    const opacity = useSharedValue(1);
    const scale = useSharedValue(0);

    useEffect(() => {
        scale.value = withDelay(delay, withSpring(1, { damping: 8 }));
        translateY.value = withDelay(
            delay,
            withTiming(SCREEN_HEIGHT + 100, {
                duration: 3000 + Math.random() * 2000,
                easing: Easing.out(Easing.quad),
            })
        );
        translateX.value = withDelay(
            delay,
            withSequence(
                withTiming(startX + (Math.random() - 0.5) * 100, { duration: 1000 }),
                withTiming(startX + (Math.random() - 0.5) * 150, { duration: 1000 }),
                withTiming(startX + (Math.random() - 0.5) * 100, { duration: 1000 })
            )
        );
        rotation.value = withDelay(
            delay,
            withRepeat(withTiming(360, { duration: 1000 + Math.random() * 1000 }), -1, false)
        );
        opacity.value = withDelay(delay + 2500, withTiming(0, { duration: 500 }));
    }, [delay, opacity, rotation, scale, startX, translateX, translateY]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { rotate: `${rotation.value}deg` },
            { scale: scale.value },
        ] as any,
        opacity: opacity.value,
    }));

    const size = 8 + Math.random() * 8;
    const isCircle = Math.random() > 0.5;

    return (
        <Animated.View
            style={[
                styles.confettiPiece,
                animatedStyle,
                {
                    width: size,
                    height: isCircle ? size : size * 2,
                    backgroundColor: color,
                    borderRadius: isCircle ? size / 2 : 2,
                },
            ]}
        />
    );
};

const CustomConfetti = () => {
    const pieces = Array.from({ length: 50 }, (_, index) => ({
        id: index,
        delay: Math.random() * 500,
        startX: Math.random() * SCREEN_WIDTH,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    }));

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {pieces.map((piece) => (
                <ConfettiPiece key={piece.id} {...piece} />
            ))}
        </View>
    );
};

interface LaunchCelebrationProps {
    userName: string;
    mainPhoto?: string;
    onComplete: () => void;
    onRetry?: () => void;
    isLoading?: boolean;
    hasError?: boolean;
    errorMessage?: string;
}

const FloatingIcon = ({
    Icon,
    color,
    delay,
    x,
    size,
}: {
    Icon: any;
    color: string;
    delay: number;
    x: number;
    size: number;
}) => {
    const translateY = useSharedValue(SCREEN_HEIGHT);
    const scale = useSharedValue(0);
    const rotation = useSharedValue(0);
    const opacity = useSharedValue(0);

    useEffect(() => {
        translateY.value = withDelay(delay, withTiming(-100, { duration: 4000, easing: Easing.out(Easing.cubic) }));
        scale.value = withDelay(delay, withSpring(1, { damping: 8 }));
        opacity.value = withDelay(
            delay,
            withSequence(withTiming(1, { duration: 300 }), withDelay(3000, withTiming(0, { duration: 700 })))
        );
        rotation.value = withDelay(
            delay,
            withRepeat(withTiming(360, { duration: 3000, easing: Easing.linear }), -1, false)
        );
    }, [delay, opacity, rotation, scale, translateY]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: x },
            { translateY: translateY.value },
            { scale: scale.value },
            { rotate: `${rotation.value}deg` },
        ] as any,
        opacity: opacity.value,
    }));

    return (
        <Animated.View style={[styles.floatingIcon, animatedStyle]}>
            <Icon size={size} color={color} weight="fill" />
        </Animated.View>
    );
};

export function LaunchCelebration({
    userName,
    mainPhoto,
    onComplete,
    onRetry,
    isLoading,
    hasError,
    errorMessage,
}: LaunchCelebrationProps) {
    const mainScale = useSharedValue(0);
    const mainOpacity = useSharedValue(0);
    const textScale = useSharedValue(0.8);
    const buttonOpacity = useSharedValue(0);
    const pulseScale = useSharedValue(1);
    const loadingHaloScale = useSharedValue(1);
    const loadingHaloOpacity = useSharedValue(0.35);
    const orbitRotation = useSharedValue(0);
    const [loadingStage, setLoadingStage] = useState(0);

    useEffect(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 200);
        setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 400);

        mainScale.value = withDelay(300, withSpring(1, { damping: 12, stiffness: 100 }));
        mainOpacity.value = withDelay(300, withTiming(1, { duration: 500 }));
        textScale.value = withDelay(600, withSpring(1, { damping: 10 }));
        buttonOpacity.value = withDelay(2500, withTiming(1, { duration: 500 }));
        pulseScale.value = withDelay(
            1000,
            withRepeat(
                withSequence(withTiming(1.05, { duration: 1000 }), withTiming(1, { duration: 1000 })),
                -1,
                true
            )
        );

        const timer = setTimeout(() => {
            if (!hasError) {
                onComplete();
            }
        }, 5000);

        return () => clearTimeout(timer);
    }, [buttonOpacity, hasError, mainOpacity, mainScale, onComplete, pulseScale, textScale]);

    useEffect(() => {
        if (!isLoading) {
            loadingHaloScale.value = 1;
            loadingHaloOpacity.value = 0.35;
            orbitRotation.value = 0;
            setLoadingStage(0);
            return;
        }

        loadingHaloScale.value = withRepeat(
            withSequence(withTiming(1.14, { duration: 1300 }), withTiming(1, { duration: 1300 })),
            -1,
            true
        );
        loadingHaloOpacity.value = withRepeat(
            withSequence(withTiming(0.8, { duration: 1300 }), withTiming(0.28, { duration: 1300 })),
            -1,
            true
        );
        orbitRotation.value = withRepeat(
            withTiming(360, { duration: 4200, easing: Easing.linear }),
            -1,
            false
        );

        const stageTimer = setInterval(() => {
            setLoadingStage((prev) => (prev + 1) % LOADING_STAGES.length);
        }, 1700);

        return () => clearInterval(stageTimer);
    }, [isLoading, loadingHaloOpacity, loadingHaloScale, orbitRotation]);

    const mainStyle = useAnimatedStyle(() => ({
        transform: [{ scale: mainScale.value }],
        opacity: mainOpacity.value,
    }));

    const textStyle = useAnimatedStyle(() => ({
        transform: [{ scale: textScale.value }],
    }));

    const buttonStyle = useAnimatedStyle(() => ({
        opacity: buttonOpacity.value,
    }));

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseScale.value }],
    }));

    const loadingHaloStyle = useAnimatedStyle(() => ({
        transform: [{ scale: loadingHaloScale.value }],
        opacity: loadingHaloOpacity.value,
    }));

    const orbitStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${orbitRotation.value}deg` }],
    }));

    const currentLoadingStage = useMemo(
        () => LOADING_STAGES[Math.min(loadingStage, LOADING_STAGES.length - 1)],
        [loadingStage]
    );

    const floatingIcons = [
        { Icon: Heart, color: '#ec4899', delay: 0, x: SCREEN_WIDTH * 0.1, size: 24 },
        { Icon: Star, color: '#f59e0b', delay: 200, x: SCREEN_WIDTH * 0.3, size: 20 },
        { Icon: Sparkle, color: '#8b5cf6', delay: 400, x: SCREEN_WIDTH * 0.5, size: 28 },
        { Icon: Heart, color: '#f43f5e', delay: 600, x: SCREEN_WIDTH * 0.7, size: 22 },
        { Icon: Star, color: '#10b981', delay: 800, x: SCREEN_WIDTH * 0.9, size: 26 },
        { Icon: Heart, color: '#ec4899', delay: 1000, x: SCREEN_WIDTH * 0.2, size: 20 },
        { Icon: Sparkle, color: '#3b82f6', delay: 1200, x: SCREEN_WIDTH * 0.6, size: 24 },
        { Icon: Star, color: '#f472b6', delay: 1400, x: SCREEN_WIDTH * 0.8, size: 22 },
    ];

    const titleText = hasError
        ? `Almost there, ${userName}`
        : isLoading
        ? `Building your profile, ${userName}`
        : `You're all set, ${userName}!`;

    const subtitleText = hasError
        ? 'We hit a small snag while finishing your profile setup.'
        : isLoading
        ? currentLoadingStage.detail
        : 'Your profile is live and ready to make connections';

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0f0d23', '#1a0d2e', '#2d1347']} style={StyleSheet.absoluteFill} />

            <CustomConfetti />

            {floatingIcons.map((icon, index) => (
                <FloatingIcon key={index} {...icon} />
            ))}

            <View style={styles.content}>
                <Animated.View style={mainStyle}>
                    <Animated.View style={[styles.avatarContainer, pulseStyle]}>
                        {isLoading && !hasError ? (
                            <>
                                <Animated.View style={[styles.loadingHalo, loadingHaloStyle]} />
                                <Animated.View style={[styles.loadingOrbit, orbitStyle]}>
                                    <View style={styles.orbitDotPrimary} />
                                    <View style={styles.orbitDotSecondary} />
                                </Animated.View>
                            </>
                        ) : null}

                        {mainPhoto ? (
                            <Image source={{ uri: mainPhoto }} style={styles.avatar} />
                        ) : (
                            <LinearGradient colors={['#ec4899', '#f43f5e']} style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarInitial}>{userName.charAt(0).toUpperCase()}</Text>
                            </LinearGradient>
                        )}

                        <View style={styles.checkBadge}>
                            <CheckCircle size={32} color="#10b981" weight="fill" />
                        </View>
                    </Animated.View>
                </Animated.View>

                <Animated.View style={[styles.textContainer, textStyle]}>
                    <Animated.Text entering={FadeInUp.delay(800)} style={styles.title}>
                        {titleText}
                    </Animated.Text>
                    <Animated.Text entering={FadeInUp.delay(1000)} style={styles.subtitle}>
                        {subtitleText}
                    </Animated.Text>
                </Animated.View>

                {isLoading && !hasError ? (
                    <Animated.View entering={ZoomIn.delay(1500)} style={styles.loadingCard}>
                        <View style={styles.loadingBadge}>
                            <Rocket size={18} color="#ffb5da" weight="fill" />
                            <Text style={styles.loadingBadgeText}>Creating your first impression</Text>
                        </View>

                        <Text style={styles.loadingStageTitle}>{currentLoadingStage.title}</Text>

                        <View style={styles.loadingSteps}>
                            {LOADING_STAGES.map((stage, index) => {
                                const isComplete = index < loadingStage;
                                const isActive = index === loadingStage;

                                return (
                                    <View key={stage.title} style={styles.loadingStepRow}>
                                        <View
                                            style={[
                                                styles.loadingStepMarker,
                                                isComplete && styles.loadingStepMarkerComplete,
                                                isActive && styles.loadingStepMarkerActive,
                                            ]}
                                        >
                                            {isComplete ? (
                                                <CheckCircle size={16} color="#fff" weight="fill" />
                                            ) : isActive ? (
                                                <ActivityIndicator color="#fff" size="small" />
                                            ) : null}
                                        </View>
                                        <Text
                                            style={[
                                                styles.loadingStepText,
                                                isActive && styles.loadingStepTextActive,
                                                isComplete && styles.loadingStepTextComplete,
                                            ]}
                                        >
                                            {stage.title}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    </Animated.View>
                ) : (
                    <Animated.View entering={ZoomIn.delay(1500)} style={styles.statsContainer}>
                        <View style={styles.statItem}>
                            <Rocket size={24} color="#ec4899" weight="fill" />
                            <Text style={styles.statText}>Profile is live!</Text>
                        </View>
                    </Animated.View>
                )}

                {hasError ? (
                    <Animated.View style={[styles.errorContainer, buttonStyle]}>
                        <Text style={styles.errorText}>
                            {errorMessage || 'Something went wrong. Please try again.'}
                        </Text>
                        <Pressable style={styles.retryButton} onPress={onRetry} disabled={isLoading}>
                            {isLoading ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <>
                                    <ArrowClockwise size={20} color="#fff" weight="bold" />
                                    <Text style={styles.retryButtonText}>Retry</Text>
                                </>
                            )}
                        </Pressable>
                    </Animated.View>
                ) : (
                    <Animated.Text style={[styles.ctaHint, buttonStyle]}>
                        {isLoading
                            ? 'Good things are loading. This usually takes just a moment.'
                            : 'Taking you to discover...'}
                    </Animated.Text>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    confettiPiece: {
        position: 'absolute',
        top: -20,
    },
    floatingIcon: {
        position: 'absolute',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    avatarContainer: {
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
    },
    loadingHalo: {
        position: 'absolute',
        width: 176,
        height: 176,
        borderRadius: 88,
        backgroundColor: 'rgba(236, 72, 153, 0.22)',
    },
    loadingOrbit: {
        position: 'absolute',
        width: 188,
        height: 188,
        borderRadius: 94,
    },
    orbitDotPrimary: {
        position: 'absolute',
        top: -2,
        left: '50%',
        marginLeft: -8,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#f472b6',
        shadowColor: '#f472b6',
        shadowOpacity: 0.45,
        shadowRadius: 12,
    },
    orbitDotSecondary: {
        position: 'absolute',
        bottom: 16,
        right: 8,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#8b5cf6',
        shadowColor: '#8b5cf6',
        shadowOpacity: 0.35,
        shadowRadius: 10,
    },
    avatar: {
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 4,
        borderColor: '#ec4899',
    },
    avatarPlaceholder: {
        width: 140,
        height: 140,
        borderRadius: 70,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitial: {
        fontSize: 56,
        fontWeight: '800',
        color: '#fff',
    },
    checkBadge: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        backgroundColor: '#0f0d23',
        borderRadius: 20,
        padding: 4,
    },
    textContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        color: '#94a3b8',
        textAlign: 'center',
        lineHeight: 24,
    },
    statsContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        marginBottom: 40,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    statText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    loadingCard: {
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.07)',
        borderRadius: 24,
        padding: 22,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        marginBottom: 32,
    },
    loadingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: 'rgba(236, 72, 153, 0.14)',
        marginBottom: 16,
    },
    loadingBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#ffd0ea',
    },
    loadingStageTitle: {
        fontSize: 20,
        lineHeight: 28,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 18,
    },
    loadingSteps: {
        gap: 12,
    },
    loadingStepRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    loadingStepMarker: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.14)',
        backgroundColor: 'rgba(255,255,255,0.04)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingStepMarkerActive: {
        backgroundColor: '#ec4899',
        borderColor: '#ec4899',
    },
    loadingStepMarkerComplete: {
        backgroundColor: '#10b981',
        borderColor: '#10b981',
    },
    loadingStepText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 20,
        color: '#94a3b8',
        fontWeight: '600',
    },
    loadingStepTextActive: {
        color: '#fff',
    },
    loadingStepTextComplete: {
        color: '#cbd5e1',
    },
    ctaHint: {
        fontSize: 16,
        color: '#64748b',
        fontStyle: 'italic',
        textAlign: 'center',
    },
    errorContainer: {
        alignItems: 'center',
        gap: 16,
    },
    errorText: {
        fontSize: 14,
        color: '#f87171',
        textAlign: 'center',
        maxWidth: 280,
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#ec4899',
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 30,
    },
    retryButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
});
