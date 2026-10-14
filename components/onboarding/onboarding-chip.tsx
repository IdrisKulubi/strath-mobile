import React from 'react';
import { Pressable, StyleSheet, Text as RNText, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/ui/text';
import { useOnboardingTheme, withOnboardingAlpha } from '@/lib/onboarding-theme';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';

interface OnboardingChipProps {
    label: string;
    emoji?: string;
    selected: boolean;
    onPress: () => void;
    disabled?: boolean;
}

export function OnboardingChip({
    label,
    emoji,
    selected,
    onPress,
    disabled = false,
}: OnboardingChipProps) {
    const theme = useOnboardingTheme();

    return (
        <Pressable
            onPress={() => {
                if (disabled) {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    return;
                }
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onPress();
            }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected, disabled }}
            accessibilityLabel={label}
            style={({ pressed }) => [
                styles.pressable,
                { opacity: disabled ? 0.45 : pressed ? 0.9 : 1 },
            ]}
        >
            <View
                style={[
                    styles.chip,
                    {
                        backgroundColor: selected
                            ? withOnboardingAlpha(theme.primary, theme.isDark ? 0.24 : 0.1)
                            : theme.surface,
                        borderColor: selected ? theme.primary : theme.border,
                        borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
                    },
                ]}
            >
                {emoji ? <RNText style={styles.emoji}>{emoji}</RNText> : null}
                <Text
                    style={[
                        styles.label,
                        { color: selected ? theme.primary : theme.foreground },
                    ]}
                    numberOfLines={1}
                >
                    {label}
                </Text>

                {selected ? (
                    <View style={[styles.check, { backgroundColor: theme.primary }]}>
                        <Ionicons
                            name="checkmark"
                            size={12}
                            color={theme.primaryForeground}
                        />
                    </View>
                ) : null}
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    pressable: {
        width: '48.5%',
    },
    chip: {
        width: '100%',
        minHeight: 78,
        borderRadius: RADIUS.lg,
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.micro,
        paddingHorizontal: SPACING.compact,
        paddingVertical: SPACING.tight,
        position: 'relative',
    },
    emoji: {
        fontSize: 26,
        lineHeight: 30,
        textAlign: 'center',
    },
    label: {
        ...TYPOGRAPHY.label,
        fontWeight: '600',
        textAlign: 'center',
        width: '100%',
    },
    check: {
        position: 'absolute',
        top: SPACING.tight,
        right: SPACING.tight,
        width: 20,
        height: 20,
        borderRadius: RADIUS.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
