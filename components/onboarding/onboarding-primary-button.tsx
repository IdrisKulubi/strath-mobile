import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable, Text as RNText } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/ui/text';
import { useOnboardingTheme } from '@/lib/onboarding-theme';
import { HEIGHTS, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { useTheme } from '@/hooks/use-theme';

interface OnboardingPrimaryButtonProps {
    label: string;
    onPress: () => void;
    disabled?: boolean;
    accessibilityLabel?: string;
    icon?: keyof typeof Ionicons.glyphMap;
    appearance?: 'standard' | 'rising';
}

export function OnboardingPrimaryButton({
    label,
    onPress,
    disabled = false,
    accessibilityLabel,
    icon,
    appearance = 'standard',
}: OnboardingPrimaryButtonProps) {
    const theme = useOnboardingTheme();
    const { colors } = useTheme();

    const gradientColors = useMemo<[string, string]>(
        () => [theme.primary, theme.primaryHover],
        [theme.primary, theme.primaryHover],
    );

    if (appearance === 'rising') {
        return (
            <Pressable
                onPress={onPress}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel ?? label}
                accessibilityState={{ disabled }}
                style={[styles.risingButton, {
                    backgroundColor: disabled ? colors.control : colors.controlActive,
                    borderColor: colors.controlBorder,
                }]}
            >
                <View style={[styles.risingIconCircle, { backgroundColor: colors.primary, opacity: disabled ? 0.55 : 1 }]}>
                    <Ionicons name={icon ?? 'heart'} size={20} color={colors.primaryForeground} />
                </View>
                <RNText numberOfLines={2} style={[styles.risingLabel, { color: disabled ? colors.mutedForeground : colors.foreground }]}>{label}</RNText>
                <View style={styles.chevrons} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                    <Ionicons name="chevron-forward" size={17} color={disabled ? colors.mutedForeground : colors.foreground} style={styles.chevronOverlap} />
                    <Ionicons name="chevron-forward" size={17} color={disabled ? colors.mutedForeground : colors.foreground} />
                </View>
            </Pressable>
        );
    }

    if (disabled) {
        return (
            <View style={[styles.button, { backgroundColor: theme.disabled }]}>
                <Text style={[styles.label, { color: theme.mutedForeground }]}>{label}</Text>
            </View>
        );
    }

    if (theme.isDark) {
        return (
            <Pressable
                onPress={onPress}
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel ?? label}
                style={({ pressed }) => [
                    styles.button,
                    styles.darkButton,
                    {
                        backgroundColor: theme.surfaceMuted,
                        borderColor: theme.border,
                        opacity: pressed ? 0.92 : 1,
                    },
                ]}
            >
                <View style={[styles.iconCircle, { backgroundColor: theme.primary }]}>
                    <Ionicons name={icon ?? 'arrow-forward'} size={18} color={theme.primaryForeground} />
                </View>
                <Text style={[styles.label, styles.darkLabel, { color: theme.foreground }]}>{label}</Text>
                <Ionicons name="chevron-forward" size={18} color={theme.mutedForeground} />
            </Pressable>
        );
    }

    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel ?? label}
            style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
        >
            <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.button}
            >
                <Text style={[styles.label, { color: theme.primaryForeground }]}>{label}</Text>
            </LinearGradient>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        height: 52,
        borderRadius: RADIUS.full,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    risingButton: { width: '100%', minHeight: HEIGHTS.primaryControl, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: RADIUS.full, borderWidth: 1, paddingHorizontal: SPACING.micro, paddingVertical: SPACING.micro },
    risingIconCircle: { width: 44, height: 44, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center' },
    risingLabel: { flex: 1, textAlign: 'center', ...TYPOGRAPHY.body, fontWeight: '600', paddingHorizontal: SPACING.tight },
    chevrons: { width: 44, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    chevronOverlap: { marginRight: -8 },
    darkButton: {
        flexDirection: 'row',
        paddingHorizontal: 8,
        borderWidth: StyleSheet.hairlineWidth,
        gap: 12,
    },
    iconCircle: {
        width: 36,
        height: 36,
        borderRadius: RADIUS.full,
        justifyContent: 'center',
        alignItems: 'center',
    },
    label: {
        fontSize: 17,
        fontWeight: '600',
    },
    darkLabel: {
        flex: 1,
        textAlign: 'center',
    },
});
