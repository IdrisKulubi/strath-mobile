import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp, useReducedMotion } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { useOnboardingTheme } from '@/lib/onboarding-theme';
import { MOTION, RADIUS, SPACING } from '@/lib/design-tokens';

import { OnboardingHeader } from './onboarding-header';
import { OnboardingPrimaryButton } from './onboarding-primary-button';
import { OnboardingProgressBar } from './onboarding-progress-bar';
import { OnboardingScreenBackdrop } from './onboarding-screen-backdrop';
import { OnboardingSurfaceCard } from './onboarding-surface-card';

interface WelcomeSplashProps {
    onStart: () => void;
    onBackToLogin?: () => void;
}

export function WelcomeSplash({ onStart, onBackToLogin }: WelcomeSplashProps) {
    const theme = useOnboardingTheme();
    const reducedMotion = useReducedMotion();
    const insets = useSafeAreaInsets();

    const containerStyle = useMemo(
        () => ({
            paddingTop: insets.top + SPACING.compact,
            paddingBottom: Math.max(insets.bottom, SPACING.base),
        }),
        [insets.bottom, insets.top],
    );

    const handleStart = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onStart();
    };

    const topEntering = reducedMotion ? undefined : FadeInDown.delay(60).duration(MOTION.short);
    const mainEntering = reducedMotion ? undefined : FadeInUp.delay(100).duration(MOTION.short);
    const footerEntering = reducedMotion ? undefined : FadeInUp.delay(160).duration(MOTION.short);

    return (
        <View style={[styles.container, containerStyle]}>
            <OnboardingScreenBackdrop />

            <View style={styles.body}>
                <Animated.View entering={topEntering} style={styles.topSection}>
                    <OnboardingProgressBar stepIndex={0} />
                    <OnboardingHeader stepIndex={0} onBack={onBackToLogin} />
                </Animated.View>

                <Animated.View entering={mainEntering} style={styles.main}>
                    <View style={[styles.iconContainer, { backgroundColor: theme.primarySoft }]}>
                        <Ionicons name="person-circle-outline" size={32} color={theme.primary} />
                    </View>

                    <Text style={[styles.title, { color: theme.foreground }]}>
                        Let's build your profile
                    </Text>

                    <Text style={[styles.subtitle, { color: theme.mutedForeground }]}>
                        A few quick steps so your matches feel aligned.
                    </Text>

                    <OnboardingSurfaceCard>
                        <Text style={[styles.previewLine, { color: theme.mutedForeground }]}>
                            Essentials · Photos · Your vibe
                        </Text>
                    </OnboardingSurfaceCard>
                </Animated.View>

                <Animated.View entering={footerEntering} style={styles.footer}>
                    <OnboardingPrimaryButton
                        label="Let's Go"
                        onPress={handleStart}
                        icon="sparkles"
                    />
                    <Text style={[styles.footerHint, { color: theme.mutedForeground }]}>
                        About 2-3 minutes
                    </Text>
                </Animated.View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: SPACING.screenX,
    },
    body: {
        flex: 1,
        justifyContent: 'space-between',
    },
    topSection: {
        gap: SPACING.base,
    },
    main: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.base,
        width: '100%',
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: RADIUS.full,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        lineHeight: 30,
        fontWeight: '700',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
        paddingHorizontal: SPACING.tight,
    },
    previewLine: {
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '500',
        textAlign: 'center',
    },
    footer: {
        width: '100%',
        gap: SPACING.compact,
    },
    footerHint: {
        fontSize: 12,
        lineHeight: 16,
        textAlign: 'center',
    },
});
