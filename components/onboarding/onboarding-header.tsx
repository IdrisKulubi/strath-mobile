import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/ui/text';
import { onboardingStepLabel } from '@/constants/onboarding';
import { useOnboardingTheme } from '@/lib/onboarding-theme';
import { RADIUS, SPACING } from '@/lib/design-tokens';

interface OnboardingHeaderProps {
    stepIndex: number;
    onBack?: () => void;
    stepLabel?: string;
}

export function OnboardingHeader({ stepIndex, onBack, stepLabel }: OnboardingHeaderProps) {
    const theme = useOnboardingTheme();
    const label = stepLabel ?? onboardingStepLabel(stepIndex);

    return (
        <View style={styles.row}>
            {onBack ? (
                <Pressable
                    onPress={onBack}
                    accessibilityRole="button"
                    accessibilityLabel="Back"
                    style={[
                        styles.iconButton,
                        {
                            backgroundColor: theme.surfaceMuted,
                            borderColor: theme.border,
                        },
                    ]}
                >
                    <Ionicons name="arrow-back" size={20} color={theme.foreground} />
                </Pressable>
            ) : (
                <View style={styles.iconPlaceholder} />
            )}

            <View
                style={[
                    styles.stepPill,
                    {
                        backgroundColor: theme.surfaceMuted,
                        borderColor: theme.border,
                    },
                ]}
            >
                <Text
                    style={[styles.stepText, { color: theme.mutedForeground }]}
                    accessibilityLabel={label}
                >
                    {label.toUpperCase()}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: RADIUS.full,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: StyleSheet.hairlineWidth,
    },
    iconPlaceholder: {
        width: 44,
        height: 44,
    },
    stepPill: {
        paddingHorizontal: SPACING.compact,
        paddingVertical: SPACING.tight,
        borderRadius: RADIUS.full,
        borderWidth: StyleSheet.hairlineWidth,
    },
    stepText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.6,
    },
});
