import React, { useEffect } from 'react';
import { View, StyleSheet, Pressable, Text as RNText } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
    FadeInDown,
} from 'react-native-reanimated';

import { SPACING, TYPOGRAPHY, RADIUS } from '@/lib/design-tokens';
import { getProfileStrengthHint, getProfileStrengthLabel } from '@/lib/profile-strength';
import { useTheme } from '@/hooks/use-theme';

interface CompletionProgressCardProps {
    percentage: number;
    promptText?: string;
    ctaText?: string;
    onPress?: () => void;
}

export function CompletionProgressCard({
    percentage,
    promptText = 'Complete your profile',
    ctaText,
    onPress,
}: CompletionProgressCardProps) {
    const { colors, isDark } = useTheme();
    const progress = useSharedValue(0);
    const clamped = Math.min(100, Math.max(0, percentage));
    const strengthLabel = getProfileStrengthLabel(clamped);
    const hint = ctaText ?? getProfileStrengthHint(clamped);

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

    return (
        <Animated.View entering={FadeInDown.duration(280)}>
            <Pressable
                onPress={onPress}
                disabled={!onPress}
                style={({ pressed }) => [
                    styles.section,
                    { opacity: pressed && onPress ? 0.88 : 1 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Profile strength ${clamped} percent. ${hint}`}
            >
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
                        <View
                            style={[
                                styles.badge,
                                {
                                    backgroundColor: isDark
                                        ? 'rgba(217, 74, 143, 0.15)'
                                        : 'rgba(184, 50, 122, 0.1)',
                                },
                            ]}
                        >
                            <RNText style={[styles.badgeText, { color: colors.primary }]}>
                                {strengthLabel} · {clamped}%
                            </RNText>
                        </View>
                    </View>

                    <RNText style={[styles.title, { color: colors.foreground }]}>{promptText}</RNText>
                    <RNText style={[styles.hint, { color: colors.mutedForeground }]}>{hint}</RNText>

                    <View style={[styles.track, { backgroundColor: colors.muted }]}>
                        <Animated.View
                            style={[
                                styles.fill,
                                fillStyle,
                                {
                                    backgroundColor: colors.primary,
                                    borderTopLeftRadius: RADIUS.full,
                                    borderBottomLeftRadius: RADIUS.full,
                                    borderTopRightRadius: clamped >= 100 ? RADIUS.full : 0,
                                    borderBottomRightRadius: clamped >= 100 ? RADIUS.full : 0,
                                },
                            ]}
                        />
                        <Animated.View style={spacerStyle} />
                    </View>
                </View>
            </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    section: {
        paddingHorizontal: SPACING.screenX,
        paddingBottom: SPACING.section,
    },
    card: {
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
    badge: {
        paddingHorizontal: SPACING.compact,
        paddingVertical: SPACING.micro + 2,
        borderRadius: RADIUS.full,
    },
    badgeText: {
        ...TYPOGRAPHY.label,
        fontWeight: '600',
    },
    title: {
        ...TYPOGRAPHY.headline,
        fontWeight: '600',
    },
    hint: {
        ...TYPOGRAPHY.caption,
        marginBottom: SPACING.micro,
    },
    track: {
        flexDirection: 'row',
        height: 8,
        borderRadius: RADIUS.full,
        overflow: 'hidden',
        marginTop: SPACING.micro,
    },
    fill: {
        height: '100%',
        minWidth: 8,
    },
});
