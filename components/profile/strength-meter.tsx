import React, { useEffect } from 'react';
import { View, StyleSheet, Pressable, Text as RNText } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
} from 'react-native-reanimated';

import { RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { getProfileStrengthHint, getProfileStrengthLabel } from '@/lib/profile-strength';
import { useTheme } from '@/hooks/use-theme';

interface StrengthMeterProps {
    percentage: number;
    onPress?: () => void;
}

export function StrengthMeter({ percentage, onPress }: StrengthMeterProps) {
    const { colors, isDark } = useTheme();
    const progress = useSharedValue(0);
    const clamped = Math.min(100, Math.max(0, percentage));
    const strengthLabel = getProfileStrengthLabel(clamped);

    useEffect(() => {
        progress.value = withTiming(clamped / 100, {
            duration: 700,
            easing: Easing.out(Easing.cubic),
        });
    }, [clamped, progress]);

    const fillStyle = useAnimatedStyle(() => ({
        flex: Math.max(progress.value, 0.001),
    }));

    const spacerStyle = useAnimatedStyle(() => ({
        flex: Math.max(1 - progress.value, 0.001),
    }));

    const content = (
        <View
            style={[
                styles.card,
                {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                },
                !isDark && styles.cardShadowLight,
            ]}
        >
            <View style={styles.topRow}>
                <RNText style={[styles.eyebrow, { color: colors.mutedForeground }]}>
                    Profile strength
                </RNText>
                <RNText style={[styles.percent, { color: colors.primary }]}>
                    {strengthLabel} · {clamped}%
                </RNText>
            </View>
            <RNText style={[styles.hint, { color: colors.mutedForeground }]}>
                {getProfileStrengthHint(clamped)}
            </RNText>
            <View style={[styles.track, { backgroundColor: colors.muted }]}>
                <Animated.View
                    style={[
                        styles.fill,
                        fillStyle,
                        { backgroundColor: colors.primary },
                    ]}
                />
                <Animated.View style={spacerStyle} />
            </View>
        </View>
    );

    if (!onPress) return content;

    return (
        <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}>
            {content}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        marginHorizontal: SPACING.screenX,
        marginBottom: SPACING.compact,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        padding: SPACING.base,
        gap: SPACING.tight,
    },
    cardShadowLight: {
        shadowColor: '#1C1524',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: SPACING.compact,
    },
    eyebrow: {
        ...TYPOGRAPHY.label,
        fontWeight: '600',
    },
    percent: {
        ...TYPOGRAPHY.label,
        fontWeight: '600',
    },
    hint: {
        ...TYPOGRAPHY.caption,
    },
    track: {
        flexDirection: 'row',
        height: 8,
        borderRadius: RADIUS.full,
        overflow: 'hidden',
    },
    fill: {
        height: '100%',
        minWidth: 8,
        borderTopLeftRadius: RADIUS.full,
        borderBottomLeftRadius: RADIUS.full,
    },
});
