import React from 'react';
import { Pressable, StyleSheet, Text as RNText, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/ui/text';
import { useOnboardingTheme, withOnboardingAlpha } from '@/lib/onboarding-theme';
import { Palette, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { useTheme } from '@/hooks/use-theme';

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
    appearance?: 'standard' | 'rising';
    selectionMode?: 'single' | 'multiple';
}

export function OnboardingChoiceRow({
    option,
    selected,
    onPress,
    disabled = false,
    hasError = false,
    showRadio = true,
    appearance = 'standard',
    selectionMode = 'single',
}: OnboardingChoiceRowProps) {
    const theme = useOnboardingTheme();
    const { colors } = useTheme();
    const rising = appearance === 'rising';
    const accent = rising ? colors.primary : theme.primary;
    const foreground = rising ? colors.foreground : theme.foreground;
    const muted = rising ? colors.mutedForeground : theme.mutedForeground;
    const surface = rising ? colors.control : theme.surface;
    const border = rising ? colors.controlBorder : theme.border;
    const errorColor = theme.isDark ? Palette.dark.destructive : Palette.light.destructive;

    const handlePress = () => {
        if (disabled) {
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress(option.value);
    };

    const borderColor = hasError ? errorColor : selected ? accent : border;
    const backgroundColor = selected
        ? rising ? colors.sheet : withOnboardingAlpha(theme.primary, theme.isDark ? 0.18 : 0.07)
        : rising ? colors.controlActive : surface;

    return (
        <Pressable
            onPress={handlePress}
            disabled={disabled}
            accessibilityRole={selectionMode === 'multiple' ? 'checkbox' : showRadio ? 'radio' : 'button'}
            accessibilityState={selectionMode === 'multiple' ? { checked: selected, disabled } : { selected, disabled }}
            accessibilityLabel={option.description ? `${option.label}. ${option.description}` : option.label}
            style={[
                styles.row,
                rising && styles.risingRow,
                {
                    backgroundColor,
                    borderColor,
                    borderWidth: rising ? 1 : selected ? 2 : StyleSheet.hairlineWidth,
                    opacity: disabled && !(rising && selected) ? 0.55 : 1,
                },
            ]}
        >
            <View style={[styles.rowInner, rising && styles.risingRowInner]}>
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
                    <Text style={[styles.label, { color: foreground }]}>{option.label}</Text>
                    {option.description ? (
                        <Text style={[styles.description, { color: muted }]}>
                            {option.description}
                        </Text>
                    ) : null}
                </View>

                {showRadio ? (
                    <View
                        style={[
                            styles.radio,
                            {
                                borderColor: selected ? accent : muted,
                                backgroundColor: selected && selectionMode === 'multiple' ? accent : rising && !selected ? border : 'transparent',
                            },
                        ]}
                    >
                        {selected ? (
                            selectionMode === 'multiple'
                                ? <Ionicons name="checkmark" size={14} color={rising ? colors.primaryForeground : theme.primaryForeground} />
                                : rising ? <View style={[styles.radioDot, { backgroundColor: accent }]} /> : <Ionicons name="checkmark" size={14} color={theme.primaryForeground} />
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
    risingRow: { minHeight: 56, paddingVertical: SPACING.micro },
    risingRowInner: { minHeight: 48 },
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
    radioDot: { width: 8, height: 8, borderRadius: RADIUS.full },
});
