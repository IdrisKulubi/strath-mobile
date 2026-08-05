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
    useReducedMotion,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ArrowClockwise, CheckCircle, Rocket } from 'phosphor-react-native';

import { Palette, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { useOnboardingTheme, withOnboardingAlpha } from '@/lib/onboarding-theme';

import { OnboardingScreenBackdrop } from './onboarding-screen-backdrop';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const LOADING_STAGES = [
    {
        title: 'Shaping your profile vibe',
        detail: 'Turning your answers and photos into a polished profile.',
    },
    {
        title: 'Polishing your first impression',
        detail: 'Lining up the details that make people want to know more.',
    },
    {
        title: 'Getting discovery ready',
        detail: 'Warming up your feed for more relevant first connections.',
    },
];

interface LaunchCelebrationProps {
    userName: string;
    mainPhoto?: string;
    onComplete: () => void;
    onRetry?: () => void;
    isLoading?: boolean;
    hasError?: boolean;
    errorMessage?: string;
}

function ProfileAvatar({
    uri,
    userName,
    borderColor,
    placeholderColors,
    placeholderTextColor,
}: {
    uri?: string;
    userName: string;
    borderColor: string;
    placeholderColors: [string, string];
    placeholderTextColor: string;
}) {
    const [isLoadingImage, setIsLoadingImage] = useState(Boolean(uri));
    const [hasImageError, setHasImageError] = useState(false);
    const showImage = Boolean(uri) && !hasImageError;

    return (
        <View style={[styles.avatarFrame, { borderColor }]}>
            {showImage ? (
                <>
                    <Image
                        source={{ uri }}
                        style={styles.avatar}
                        resizeMode="cover"
                        onLoadStart={() => setIsLoadingImage(true)}
                        onLoadEnd={() => setIsLoadingImage(false)}
                        onError={() => {
                            setHasImageError(true);
                            setIsLoadingImage(false);
                        }}
                        accessibilityIgnoresInvertColors
                    />
                    {isLoadingImage ? (
                        <View style={styles.avatarLoading}>
                            <ActivityIndicator color={borderColor} />
                        </View>
                    ) : null}
                </>
            ) : (
                <LinearGradient colors={placeholderColors} style={styles.avatarPlaceholder}>
                    <Text style={[styles.avatarInitial, { color: placeholderTextColor }]}>
                        {userName.charAt(0).toUpperCase() || 'S'}
                    </Text>
                </LinearGradient>
            )}
        </View>
    );
}

export function LaunchCelebration({
    userName,
    mainPhoto,
    onComplete,
    onRetry,
    isLoading,
    hasError,
    errorMessage,
}: LaunchCelebrationProps) {
    const theme = useOnboardingTheme();
    const reducedMotion = useReducedMotion();
    const mainScale = useSharedValue(0);
    const mainOpacity = useSharedValue(0);
    const textScale = useSharedValue(0.8);
    const buttonOpacity = useSharedValue(0);
    const pulseScale = useSharedValue(1);
    const loadingHaloScale = useSharedValue(1);
    const loadingHaloOpacity = useSharedValue(0.35);
    const orbitRotation = useSharedValue(0);
    const [loadingStage, setLoadingStage] = useState(0);

    const successColor = theme.isDark ? Palette.dark.success : Palette.light.success;
    const destructiveColor = theme.isDark ? Palette.dark.destructive : Palette.light.destructive;

    useEffect(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 200);

        mainScale.value = withDelay(200, withSpring(1, { damping: 12, stiffness: 100 }));
        mainOpacity.value = withDelay(200, withTiming(1, { duration: 400 }));
        textScale.value = withDelay(400, withSpring(1, { damping: 10 }));
        buttonOpacity.value = withDelay(1800, withTiming(1, { duration: 400 }));

        if (!reducedMotion) {
            pulseScale.value = withDelay(
                800,
                withRepeat(
                    withSequence(withTiming(1.04, { duration: 1000 }), withTiming(1, { duration: 1000 })),
                    -1,
                    true,
                ),
            );
        }

        const timer = setTimeout(() => {
            if (!hasError) {
                onComplete();
            }
        }, 5000);

        return () => clearTimeout(timer);
    }, [
        buttonOpacity,
        hasError,
        mainOpacity,
        mainScale,
        onComplete,
        pulseScale,
        reducedMotion,
        textScale,
    ]);

    useEffect(() => {
        if (!isLoading) {
            loadingHaloScale.value = 1;
            loadingHaloOpacity.value = 0.35;
            orbitRotation.value = 0;
            setLoadingStage(0);
            return;
        }

        if (!reducedMotion) {
            loadingHaloScale.value = withRepeat(
                withSequence(withTiming(1.1, { duration: 1200 }), withTiming(1, { duration: 1200 })),
                -1,
                true,
            );
            loadingHaloOpacity.value = withRepeat(
                withSequence(withTiming(0.7, { duration: 1200 }), withTiming(0.25, { duration: 1200 })),
                -1,
                true,
            );
            orbitRotation.value = withRepeat(
                withTiming(360, { duration: 4200, easing: Easing.linear }),
                -1,
                false,
            );
        }

        const stageTimer = setInterval(() => {
            setLoadingStage((prev) => (prev + 1) % LOADING_STAGES.length);
        }, 1600);

        return () => clearInterval(stageTimer);
    }, [isLoading, loadingHaloOpacity, loadingHaloScale, orbitRotation, reducedMotion]);

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
        [loadingStage],
    );

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
            <OnboardingScreenBackdrop />

            <View style={styles.content}>
                <Animated.View style={mainStyle}>
                    <Animated.View style={[styles.avatarContainer, pulseStyle]}>
                        {isLoading && !hasError ? (
                            <>
                                <Animated.View
                                    style={[
                                        styles.loadingHalo,
                                        loadingHaloStyle,
                                        {
                                            backgroundColor: withOnboardingAlpha(
                                                theme.primary,
                                                theme.isDark ? 0.24 : 0.12,
                                            ),
                                        },
                                    ]}
                                />
                                <Animated.View style={[styles.loadingOrbit, orbitStyle]}>
                                    <View
                                        style={[
                                            styles.orbitDotPrimary,
                                            { backgroundColor: theme.primary },
                                        ]}
                                    />
                                </Animated.View>
                            </>
                        ) : null}

                        <ProfileAvatar
                            uri={mainPhoto}
                            userName={userName}
                            borderColor={theme.primary}
                            placeholderColors={[theme.primary, theme.primaryHover]}
                            placeholderTextColor={theme.primaryForeground}
                        />

                        <View
                            style={[
                                styles.checkBadge,
                                {
                                    backgroundColor: theme.surface,
                                    borderColor: theme.border,
                                },
                            ]}
                        >
                            <CheckCircle size={22} color={successColor} weight="fill" />
                        </View>
                    </Animated.View>
                </Animated.View>

                <Animated.View style={[styles.textContainer, textStyle]}>
                    <Animated.View entering={FadeInUp.delay(400)}>
                        <Text style={[styles.title, { color: theme.foreground }]}>{titleText}</Text>
                    </Animated.View>
                    <Animated.View entering={FadeInUp.delay(520)}>
                        <Text style={[styles.subtitle, { color: theme.mutedForeground }]}>
                            {subtitleText}
                        </Text>
                    </Animated.View>
                </Animated.View>

                {isLoading && !hasError ? (
                    <Animated.View
                        entering={ZoomIn.delay(700)}
                        style={[
                            styles.loadingCard,
                            {
                                backgroundColor: theme.surface,
                                borderColor: theme.border,
                            },
                        ]}
                    >
                        {theme.isDark ? (
                            <View
                                style={[
                                    styles.statusBadge,
                                    styles.statusBadgeDark,
                                    {
                                        backgroundColor: theme.surfaceMuted,
                                        borderColor: theme.border,
                                    },
                                ]}
                            >
                                <View
                                    style={[
                                        styles.statusBadgeIcon,
                                        { backgroundColor: theme.primary },
                                    ]}
                                >
                                    <Rocket size={16} color={theme.primaryForeground} weight="fill" />
                                </View>
                                <Text style={[styles.statusBadgeText, { color: theme.foreground }]}>
                                    Creating your first impression
                                </Text>
                            </View>
                        ) : (
                            <LinearGradient
                                colors={[theme.primary, theme.primaryHover]}
                                start={{ x: 0, y: 0.5 }}
                                end={{ x: 1, y: 0.5 }}
                                style={styles.statusBadge}
                            >
                                <Rocket size={16} color={theme.primaryForeground} weight="fill" />
                                <Text
                                    style={[
                                        styles.statusBadgeText,
                                        { color: theme.primaryForeground },
                                    ]}
                                >
                                    Creating your first impression
                                </Text>
                            </LinearGradient>
                        )}

                        <Text style={[styles.loadingStageTitle, { color: theme.foreground }]}>
                            {currentLoadingStage.title}
                        </Text>

                        <View style={styles.loadingSteps}>
                            {LOADING_STAGES.map((stage, index) => {
                                const isComplete = index < loadingStage;
                                const isActive = index === loadingStage;

                                return (
                                    <View key={stage.title} style={styles.loadingStepRow}>
                                        <View
                                            style={[
                                                styles.loadingStepMarker,
                                                {
                                                    borderColor: theme.border,
                                                    backgroundColor: theme.surfaceMuted,
                                                },
                                                isComplete && {
                                                    backgroundColor: successColor,
                                                    borderColor: successColor,
                                                },
                                                isActive && {
                                                    backgroundColor: theme.primary,
                                                    borderColor: theme.primary,
                                                },
                                            ]}
                                        >
                                            {isComplete ? (
                                                <CheckCircle
                                                    size={12}
                                                    color={theme.primaryForeground}
                                                    weight="fill"
                                                />
                                            ) : isActive ? (
                                                <ActivityIndicator
                                                    color={theme.primaryForeground}
                                                    size="small"
                                                />
                                            ) : null}
                                        </View>
                                        <Text
                                            style={[
                                                styles.loadingStepText,
                                                {
                                                    color: isActive
                                                        ? theme.foreground
                                                        : theme.mutedForeground,
                                                    fontWeight: isActive ? '700' : '600',
                                                },
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
                    <Animated.View
                        entering={ZoomIn.delay(700)}
                        style={[
                            styles.statsContainer,
                            {
                                backgroundColor: theme.surface,
                                borderColor: theme.border,
                            },
                        ]}
                    >
                        <View style={styles.statItem}>
                            <Rocket size={20} color={theme.primary} weight="fill" />
                            <Text style={[styles.statText, { color: theme.foreground }]}>
                                {hasError ? 'Profile not saved yet' : 'Profile is live!'}
                            </Text>
                        </View>
                    </Animated.View>
                )}

                {hasError ? (
                    <Animated.View style={[styles.errorContainer, buttonStyle]}>
                        <Text style={[styles.errorText, { color: destructiveColor }]}>
                            {errorMessage || 'Something went wrong. Please try again.'}
                        </Text>
                        <Pressable
                            style={[styles.retryButton, { backgroundColor: theme.primary }]}
                            onPress={onRetry}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color={theme.primaryForeground} size="small" />
                            ) : (
                                <>
                                    <ArrowClockwise
                                        size={18}
                                        color={theme.primaryForeground}
                                        weight="bold"
                                    />
                                    <Text
                                        style={[
                                            styles.retryButtonText,
                                            { color: theme.primaryForeground },
                                        ]}
                                    >
                                        Retry
                                    </Text>
                                </>
                            )}
                        </Pressable>
                    </Animated.View>
                ) : (
                    <Animated.View style={buttonStyle}>
                        <Text style={[styles.ctaHint, { color: theme.mutedForeground }]}>
                            {isLoading
                                ? 'This usually takes just a moment.'
                                : 'Taking you to discover...'}
                        </Text>
                    </Animated.View>
                )}
            </View>
        </View>
    );
}

const AVATAR_SIZE = 96;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: SPACING.section,
        gap: SPACING.compact,
    },
    avatarContainer: {
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.tight,
    },
    loadingHalo: {
        position: 'absolute',
        width: AVATAR_SIZE + 28,
        height: AVATAR_SIZE + 28,
        borderRadius: (AVATAR_SIZE + 28) / 2,
    },
    loadingOrbit: {
        position: 'absolute',
        width: AVATAR_SIZE + 36,
        height: AVATAR_SIZE + 36,
        borderRadius: (AVATAR_SIZE + 36) / 2,
    },
    orbitDotPrimary: {
        position: 'absolute',
        top: -2,
        left: '50%',
        marginLeft: -5,
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    avatarFrame: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        borderRadius: AVATAR_SIZE / 2,
        borderWidth: 3,
        overflow: 'hidden',
        backgroundColor: '#EDEBF0',
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    avatarLoading: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.35)',
    },
    avatarPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitial: {
        fontSize: 36,
        fontWeight: '800',
    },
    checkBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        borderRadius: RADIUS.full,
        padding: 2,
        borderWidth: StyleSheet.hairlineWidth,
    },
    textContainer: {
        alignItems: 'center',
        gap: SPACING.micro,
        marginBottom: SPACING.tight,
    },
    title: {
        ...TYPOGRAPHY.display,
        fontSize: 22,
        lineHeight: 28,
        textAlign: 'center',
        maxWidth: SCREEN_WIDTH - 64,
    },
    subtitle: {
        ...TYPOGRAPHY.callout,
        textAlign: 'center',
        maxWidth: 300,
    },
    statusBadge: {
        width: '100%',
        minHeight: 48,
        borderRadius: RADIUS.full,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.tight,
        paddingHorizontal: SPACING.base,
        marginBottom: SPACING.compact,
    },
    statusBadgeDark: {
        borderWidth: StyleSheet.hairlineWidth,
        justifyContent: 'flex-start',
    },
    statusBadgeIcon: {
        width: 32,
        height: 32,
        borderRadius: RADIUS.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusBadgeText: {
        ...TYPOGRAPHY.callout,
        fontWeight: '700',
        flexShrink: 1,
    },
    statsContainer: {
        borderRadius: RADIUS.lg,
        padding: SPACING.compact,
        borderWidth: StyleSheet.hairlineWidth,
        width: '100%',
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.compact,
    },
    statText: {
        ...TYPOGRAPHY.headline,
    },
    loadingCard: {
        width: '100%',
        borderRadius: RADIUS.lg,
        padding: SPACING.compact,
        borderWidth: StyleSheet.hairlineWidth,
    },
    loadingStageTitle: {
        ...TYPOGRAPHY.headline,
        marginBottom: SPACING.compact,
    },
    loadingSteps: {
        gap: SPACING.tight,
    },
    loadingStepRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.compact,
        minHeight: 28,
    },
    loadingStepMarker: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingStepText: {
        flex: 1,
        ...TYPOGRAPHY.caption,
    },
    ctaHint: {
        ...TYPOGRAPHY.caption,
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: SPACING.tight,
    },
    errorContainer: {
        alignItems: 'center',
        gap: SPACING.compact,
        width: '100%',
    },
    errorText: {
        ...TYPOGRAPHY.caption,
        fontWeight: '600',
        textAlign: 'center',
        maxWidth: 280,
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.tight,
        paddingHorizontal: SPACING.section,
        paddingVertical: SPACING.compact,
        borderRadius: RADIUS.full,
        minHeight: 48,
    },
    retryButtonText: {
        ...TYPOGRAPHY.headline,
    },
});
