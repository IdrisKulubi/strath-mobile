import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { useTheme } from '@/hooks/use-theme';
import {
    PreferenceMode,
    getPreferenceLabel,
    useMatchPreferences,
} from '@/hooks/use-match-discovery';

const MODES: PreferenceMode[] = [
    'similar_to_me',
    'different_from_me',
    'surprise_me',
    'active_only',
];

const AVAILABILITY: {
    key: 'availableNow' | 'availableToday' | 'openToCalls';
    label: string;
}[] = [
    { key: 'availableToday', label: 'Available today' },
    { key: 'openToCalls', label: 'Open to calls' },
];

export function MatchPreferencePanel() {
    const { colors, isDark } = useTheme();
    const {
        data: preferences,
        updatePreferences,
        isUpdatingPreferences,
    } = useMatchPreferences();

    const selectedMode = preferences?.preferenceMode ?? 'surprise_me';

    return (
        <View style={styles.section}>
            <View style={styles.intro}>
                <Text variant="h4" style={{ color: colors.foreground }}>
                    Tomorrow&apos;s picks
                </Text>
                <Text variant="muted" style={{ color: colors.mutedForeground }}>
                    Optional signals — we use these to tune your next five.
                </Text>
            </View>

            <View style={styles.modeRow}>
                {MODES.map((mode) => {
                    const selected = selectedMode === mode;
                    return (
                        <Pressable
                            key={mode}
                            disabled={isUpdatingPreferences}
                            onPress={() => updatePreferences({ preferenceMode: mode })}
                            style={[
                                styles.modePill,
                                {
                                    backgroundColor: selected
                                        ? (isDark ? 'rgba(217, 74, 143, 0.12)' : 'rgba(184, 50, 122, 0.08)')
                                        : 'transparent',
                                    borderColor: selected ? colors.primary : colors.border,
                                },
                            ]}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                        >
                            <Text
                                style={[
                                    styles.modeText,
                                    { color: selected ? colors.primary : colors.foreground },
                                ]}
                            >
                                {getPreferenceLabel(mode)}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.availabilityRow}>
                {AVAILABILITY.map((item) => {
                    const selected = Boolean(preferences?.[item.key]);
                    return (
                        <Pressable
                            key={item.key}
                            disabled={isUpdatingPreferences}
                            onPress={() => updatePreferences({ [item.key]: !selected })}
                            style={[
                                styles.availabilityPill,
                                {
                                    borderColor: selected ? colors.primary : colors.border,
                                    backgroundColor: selected
                                        ? (isDark ? 'rgba(217, 74, 143, 0.08)' : 'rgba(184, 50, 122, 0.06)')
                                        : 'transparent',
                                },
                            ]}
                            accessibilityRole="switch"
                            accessibilityState={{ checked: selected }}
                        >
                            <Text
                                style={[
                                    styles.availabilityText,
                                    {
                                        color: selected ? colors.foreground : colors.mutedForeground,
                                    },
                                ]}
                            >
                                {item.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        paddingHorizontal: SPACING.screenX,
        paddingBottom: SPACING.section,
        gap: SPACING.compact,
    },
    intro: {
        gap: SPACING.micro,
        marginBottom: SPACING.tight,
    },
    modeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.tight,
    },
    modePill: {
        borderRadius: RADIUS.full,
        borderWidth: 1,
        paddingHorizontal: SPACING.compact,
        paddingVertical: SPACING.tight,
    },
    modeText: {
        ...TYPOGRAPHY.label,
        fontWeight: '500',
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginVertical: SPACING.tight,
    },
    availabilityRow: {
        flexDirection: 'row',
        gap: SPACING.tight,
    },
    availabilityPill: {
        flex: 1,
        minHeight: 44,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SPACING.compact,
    },
    availabilityText: {
        ...TYPOGRAPHY.label,
        fontWeight: '500',
    },
});
