import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';

import { OnboardingPrimaryButton } from './onboarding-primary-button';
import { OnboardingScreenShell } from './onboarding-screen-shell';

interface WelcomeSplashProps {
    onStart: () => void;
    onBackToLogin?: () => void;
}

export function WelcomeSplash({ onStart, onBackToLogin }: WelcomeSplashProps) {
    const { colors } = useTheme();

    return (
        <OnboardingScreenShell
            presentation="rising"
            stepIndex={0}
            progressLabel="Getting started"
            progressIndex={0}
            progressCount={4}
            title="Let’s make this yours"
            subtitle="We’ll get to know you one step at a time, then help you find people who fit."
            onBack={onBackToLogin}
            footer={<OnboardingPrimaryButton appearance="rising" label="Get started" onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onStart(); }} />}
        >
            <View style={styles.content}>
                <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                    <Ionicons name="heart-outline" size={26} color={colors.primaryForeground} />
                </View>
                <Text style={[styles.detail, { color: colors.mutedForeground }]}>
                    First, the basics. Then your photos and what matters to you. You can go back as you go.
                </Text>
            </View>
        </OnboardingScreenShell>
    );
}

const styles = StyleSheet.create({
    content: { alignItems: 'center', gap: SPACING.section, paddingTop: SPACING.comfortable },
    badge: { width: 56, height: 56, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center' },
    detail: { ...TYPOGRAPHY.body, textAlign: 'center' },
});
