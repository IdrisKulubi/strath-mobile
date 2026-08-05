import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/ui/text';
import { useOnboardingTheme } from '@/lib/onboarding-theme';
import { RADIUS } from '@/lib/design-tokens';

interface OnboardingPrimaryButtonProps {
    label: string;
    onPress: () => void;
    disabled?: boolean;
    accessibilityLabel?: string;
    icon?: keyof typeof Ionicons.glyphMap;
}

export function OnboardingPrimaryButton({
    label,
    onPress,
    disabled = false,
    accessibilityLabel,
    icon = 'arrow-forward',
}: OnboardingPrimaryButtonProps) {
    const theme = useOnboardingTheme();

    const gradientColors = useMemo<[string, string]>(
        () => [theme.primary, theme.primaryHover],
        [theme.primary, theme.primaryHover],
    );

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
                    <Ionicons name={icon} size={18} color={theme.primaryForeground} />
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
