import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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

interface MatchPreferencePanelProps {
    expanded?: boolean;
    onExpandedChange?: (expanded: boolean) => void;
}

export function MatchPreferencePanel({
    expanded: expandedProp,
    onExpandedChange,
}: MatchPreferencePanelProps) {
    const { colors, isDark } = useTheme();
    const [expandedInternal, setExpandedInternal] = useState(false);
    const expanded = expandedProp ?? expandedInternal;
    const setExpanded = onExpandedChange ?? setExpandedInternal;

    const {
        data: preferences,
        updatePreferences,
        isUpdatingPreferences,
    } = useMatchPreferences();

    const selectedMode = preferences?.preferenceMode ?? 'surprise_me';

    return (
        <View style={[styles.section, expanded ? styles.sectionExpanded : styles.sectionCollapsed]}>
            <Pressable
                onPress={() => setExpanded(!expanded)}
                style={styles.introToggle}
                accessibilityRole="button"
                accessibilityState={{ expanded }}
            >
                <View style={styles.intro}>
                    <Text
                        variant={expanded ? 'h4' : undefined}
                        style={[
                            expanded ? undefined : styles.collapsedTitle,
                            { color: colors.foreground },
                        ]}
                    >
                        Tomorrow&apos;s picks
                    </Text>
                    {expanded ? (
                        <Text variant="muted" style={{ color: colors.mutedForeground }}>
                            Optional signals — we use these to tune your next five.
                        </Text>
                    ) : null}
                </View>
                <Ionicons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.mutedForeground}
                />
            </Pressable>

            {expanded ? (
                <>
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
                </>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        paddingHorizontal: SPACING.screenX,
    },
    sectionCollapsed: {
        paddingBottom: SPACING.tight,
    },
    sectionExpanded: {
        paddingBottom: SPACING.compact,
    },
    introToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: SPACING.compact,
    },
    intro: {
        flex: 1,
        gap: SPACING.micro,
    },
    collapsedTitle: {
        ...TYPOGRAPHY.callout,
        fontWeight: '600',
    },
    modeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.tight,
        marginTop: SPACING.compact,
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
        paddingBottom: SPACING.tight,
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
