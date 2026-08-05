import React from 'react';
import { View, StyleSheet } from 'react-native';

import { ONBOARDING_PHASE_COUNT, getOnboardingPhase, useOnboardingTheme } from '@/lib/onboarding-theme';
import { RADIUS, SPACING } from '@/lib/design-tokens';

interface OnboardingProgressBarProps {
    stepIndex: number;
}

export function OnboardingProgressBar({ stepIndex }: OnboardingProgressBarProps) {
    const theme = useOnboardingTheme();
    const activePhase = getOnboardingPhase(stepIndex);

    return (
        <View style={styles.row} accessibilityRole="progressbar">
            {Array.from({ length: ONBOARDING_PHASE_COUNT }, (_, index) => (
                <View
                    key={index}
                    style={[
                        styles.segment,
                        {
                            backgroundColor: index <= activePhase ? theme.primary : theme.track,
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
