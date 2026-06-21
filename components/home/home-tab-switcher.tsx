import React, { useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { Palette, RADIUS, SPACING } from '@/lib/design-tokens';
import { useTheme } from '@/hooks/use-theme';
import { formatBadgeCount } from '@/hooks/use-notification-counts';

export type HomeTab = 'today' | 'interested';

const TRACK_INSET = 4;
const SEGMENT_HEIGHT = 40;

interface HomeTabSwitcherProps {
    activeTab: HomeTab;
    onTabChange: (tab: HomeTab) => void;
    interestedCount?: number;
}

export function HomeTabSwitcher({
    activeTab,
    onTabChange,
    interestedCount = 0,
}: HomeTabSwitcherProps) {
    const { isDark, colors } = useTheme();
    const badgeLabel = formatBadgeCount(interestedCount);

    const trackFill = isDark ? Palette.dark.secondary : Palette.light.muted;
    const pillColor = colors.primary;
    const selectedLabel = Palette.light.foreground;
    const unselectedLabel = isDark ? Palette.dark.foreground : Palette.light.mutedForeground;

    const handlePress = useCallback(
        (tab: HomeTab) => {
            if (tab === activeTab) return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onTabChange(tab);
        },
        [activeTab, onTabChange],
    );

    return (
        <View style={styles.host}>
            <View
                style={[styles.track, { backgroundColor: trackFill }]}
                accessibilityRole="tablist"
            >
                <View style={styles.row}>
                    <SegmentHalf
                        label="Today"
                        selected={activeTab === 'today'}
                        onPress={() => handlePress('today')}
                        pillColor={pillColor}
                        selectedLabel={selectedLabel}
                        unselectedLabel={unselectedLabel}
                        accessibilityLabel="Today's picks"
                    />
                    <SegmentHalf
                        label="Interested"
                        selected={activeTab === 'interested'}
                        onPress={() => handlePress('interested')}
                        pillColor={pillColor}
                        selectedLabel={selectedLabel}
                        unselectedLabel={unselectedLabel}
                        badge={activeTab !== 'interested' ? badgeLabel : undefined}
                        accessibilityLabel={
                            badgeLabel
                                ? `Interested in you, ${interestedCount} pending`
                                : 'Interested in you'
                        }
                    />
                </View>
            </View>
        </View>
    );
}

function SegmentHalf({
    label,
    selected,
    onPress,
    pillColor,
    selectedLabel,
    unselectedLabel,
    badge,
    accessibilityLabel,
}: {
    label: string;
    selected: boolean;
    onPress: () => void;
    pillColor: string;
    selectedLabel: string;
    unselectedLabel: string;
    badge?: string;
    accessibilityLabel: string;
}) {
    return (
        <View
            style={[
                styles.half,
                selected ? { backgroundColor: pillColor } : null,
            ]}
        >
            <TouchableOpacity
                onPress={onPress}
                activeOpacity={selected ? 1 : 0.7}
                style={styles.touch}
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel}
            >
                <Text
                    style={[
                        styles.label,
                        {
                            color: selected ? selectedLabel : unselectedLabel,
                            fontWeight: selected ? '600' : '500',
                        },
                    ]}
                >
                    {label}
                </Text>
                {badge ? (
                    <View style={[styles.badge, { backgroundColor: pillColor }]}>
                        <Text style={styles.badgeText}>{badge}</Text>
                    </View>
                ) : null}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    host: {
        marginHorizontal: SPACING.screenX,
        marginBottom: SPACING.compact,
    },
    track: {
        borderRadius: RADIUS.full,
        padding: TRACK_INSET,
    },
    row: {
        flexDirection: 'row',
        height: SEGMENT_HEIGHT,
        borderRadius: RADIUS.full,
        overflow: 'hidden',
    },
    half: {
        width: '50%',
        height: SEGMENT_HEIGHT,
        borderRadius: RADIUS.full,
    },
    touch: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingHorizontal: SPACING.tight,
    },
    label: {
        fontSize: 15,
        lineHeight: 20,
        includeFontPadding: false,
    },
    badge: {
        minWidth: 18,
        height: 18,
        paddingHorizontal: 5,
        borderRadius: RADIUS.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeText: {
        fontSize: 10,
        lineHeight: 12,
        fontWeight: '600',
        color: Palette.dark.primaryForeground,
        includeFontPadding: false,
    },
});
