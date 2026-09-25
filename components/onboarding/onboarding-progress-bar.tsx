import React from 'react';
import { View, StyleSheet } from 'react-native';

import { ONBOARDING_PHASE_COUNT, getOnboardingPhase, useOnboardingTheme } from '@/lib/onboarding-theme';
import { RADIUS, SPACING } from '@/lib/design-tokens';
import { useTheme } from '@/hooks/use-theme';

interface OnboardingProgressBarProps {
    stepIndex: number;
    appearance?: 'standard' | 'rising';
    phaseIndex?: number;
    phaseCount?: number;
    progressLabel?: string;
}

export function OnboardingProgressBar({ stepIndex, appearance = 'standard', phaseIndex, phaseCount, progressLabel }: OnboardingProgressBarProps) {
    const theme = useOnboardingTheme();
    const { colors } = useTheme();
    const activePhase = phaseIndex ?? getOnboardingPhase(stepIndex);
    const count = phaseCount ?? ONBOARDING_PHASE_COUNT;
    const rising = appearance === 'rising';

    return (
        <View style={styles.row} accessibilityRole="progressbar" accessibilityLabel={progressLabel} accessibilityValue={{ min: 0, max: count, now: Math.min(count, activePhase + 1) }}>
            {Array.from({ length: count }, (_, index) => (
                <View
                    key={index}
                    style={[
                        styles.segment,
                        {
                            backgroundColor: index <= activePhase ? rising ? colors.primary : theme.primary : rising ? colors.controlBorder : theme.track,
                        },
                    ]}
                />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        gap: SPACING.tight,
        width: '100%',
    },
    segment: {
        flex: 1,
        height: 4,
        borderRadius: RADIUS.full,
    },
});
