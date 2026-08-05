import React from 'react';
import { Pressable, StyleSheet, Text as RNText, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/ui/text';
import { useOnboardingTheme, withOnboardingAlpha } from '@/lib/onboarding-theme';
import { Palette, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';

export interface OnboardingChoiceOption {
    value: string;
    label: string;
    description?: string;
    emoji?: string;
}

interface OnboardingChoiceRowProps {
    option: OnboardingChoiceOption;
    selected: boolean;
    onPress: (value: string) => void;
    disabled?: boolean;
    hasError?: boolean;
    showRadio?: boolean;
}

export function OnboardingChoiceRow({
    option,
    selected,
    onPress,
    disabled = false,
    hasError = false,
    showRadio = true,
}: OnboardingChoiceRowProps) {
    const theme = useOnboardingTheme();
    const errorColor = theme.isDark ? Palette.dark.destructive : Palette.light.destructive;

    const handlePress = () => {
        if (disabled) {
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress(option.value);
    };

    const borderColor = hasError ? errorColor : selected ? theme.primary : theme.border;
    const backgroundColor = selected
        ? withOnboardingAlpha(theme.primary, theme.isDark ? 0.18 : 0.07)
        : theme.surface;

    return (
        <Pressable
            onPress={handlePress}
            disabled={disabled}
            accessibilityRole={showRadio ? 'radio' : 'button'}
            accessibilityState={{ selected, disabled }}
            accessibilityLabel={option.description ? `${option.label}. ${option.description}` : option.label}
            style={({ pressed }) => [
                styles.row,
                {
                    backgroundColor,
                    borderColor,
                    borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
                    opacity: disabled ? 0.55 : pressed ? 0.94 : 1,
                },
            ]}
        >
            <View style={styles.rowInner}>
                {option.emoji ? (
                    <View
                        style={[
                            styles.emojiBadge,
                            {
                                backgroundColor: withOnboardingAlpha(
                                    theme.primary,
                                    theme.isDark ? 0.22 : 0.1,
                                ),
                            },
                        ]}
                    >
                        <RNText style={styles.emoji}>{option.emoji}</RNText>
                    </View>
                ) : null}

                <View style={styles.copy}>
                    <Text style={[styles.label, { color: theme.foreground }]}>{option.label}</Text>
                    {option.description ? (
                        <Text style={[styles.description, { color: theme.mutedForeground }]}>
                            {option.description}
                        </Text>
                    ) : null}
                </View>

                {showRadio ? (
                    <View
                        style={[
                            styles.radio,
                            {
                                borderColor: selected
                                    ? theme.primary
                                    : withOnboardingAlpha(theme.mutedForeground, 0.5),
                                backgroundColor: selected ? theme.primary : 'transparent',
                            },
                        ]}
                    >
                        {selected ? (
                            <Ionicons name="checkmark" size={14} color={theme.primaryForeground} />
                        ) : null}
                    </View>
                ) : null}
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    row: {
        width: '100%',
        borderRadius: RADIUS.lg,
        paddingHorizontal: SPACING.base,
        paddingVertical: SPACING.compact,
    },
    rowInner: {
        width: '100%',
        minHeight: 56,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.compact,
    },
    emojiBadge: {
        width: 48,
        height: 48,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    emoji: {
        fontSize: 24,
        lineHeight: 28,
        textAlign: 'center',
    },
    copy: {
        flex: 1,
        flexShrink: 1,
        gap: 2,
        paddingRight: SPACING.tight,
    },
    label: {
        ...TYPOGRAPHY.headline,
    },
    description: {
        ...TYPOGRAPHY.caption,
    },
    radio: {
        width: 26,
        height: 26,
        borderRadius: RADIUS.full,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
});
