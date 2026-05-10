import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';

interface EmptyMatchesProps {
    allActioned?: boolean;
    hasUpcomingQueued?: boolean;
}

export function EmptyMatches(_props: EmptyMatchesProps) {
    const { colors, isDark } = useTheme();
    const cardBorder = isDark ? 'rgba(233, 30, 140, 0.28)' : 'rgba(233, 30, 140, 0.2)';
    const cardInnerBg = isDark ? 'rgba(45, 27, 71, 0.45)' : 'rgba(255, 255, 255, 0.92)';
    const glowColors = isDark
        ? (['rgba(233,30,140,0.35)', 'rgba(147,51,234,0.2)'] as const)
        : (['rgba(233,30,140,0.2)', 'rgba(233,30,140,0.06)'] as const);

    const tips = [
        "That is today's shortlist",
        'Your next set refreshes tomorrow',
        "Your choices help us improve tomorrow's picks",
    ];

    return (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.outer}>
            <View style={[styles.card, { borderColor: cardBorder, backgroundColor: cardInnerBg }]}>
                <LinearGradient
                    colors={glowColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.cardGlow}
                    pointerEvents="none"
                />

                <View style={styles.cardContent}>
                    <View style={[styles.iconBox, { backgroundColor: colors.primary }]}>
                        <Ionicons name="sparkles" size={24} color={colors.primaryForeground} />
                    </View>

                    <Text style={[styles.eyebrow, { color: colors.primary }]}>Daily shortlist is on</Text>
                    <Text style={[styles.title, { color: colors.foreground }]}>That is today&apos;s shortlist</Text>
                    <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                        We keep the set small on purpose. Make your picks today and we will use those signals to sharpen tomorrow&apos;s five.
                    </Text>

                    <View style={[styles.tips, { borderTopColor: colors.border }]}>
                        {tips.map((line) => (
                            <View key={line} style={styles.tipRow}>
                                <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={styles.tipIcon} />
                                <Text style={[styles.tipText, { color: colors.foreground }]}>{line}</Text>
                            </View>
                        ))}
                    </View>

                    <View style={[styles.notice, { borderColor: cardBorder }]}>
                        <Ionicons name="lock-closed-outline" size={16} color={colors.mutedForeground} />
                        <Text style={[styles.noticeText, { color: colors.mutedForeground }]}>
                            Passing today&apos;s profiles does not unlock more. The next trusted set arrives tomorrow.
                        </Text>
                    </View>
                </View>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    outer: {
        paddingHorizontal: 18,
        paddingTop: 8,
        paddingBottom: 8,
    },
    card: {
        borderRadius: 24,
        borderWidth: 1,
        overflow: 'hidden',
    },
    cardGlow: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.55,
    },
    cardContent: {
        zIndex: 1,
        paddingHorizontal: 22,
        paddingVertical: 26,
        gap: 12,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    eyebrow: {
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        lineHeight: 30,
    },
    subtitle: {
        fontSize: 15,
        lineHeight: 22,
    },
    tips: {
        marginTop: 8,
        paddingTop: 16,
        gap: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    tipRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    tipIcon: {
        marginTop: 1,
    },
    tipText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '600',
    },
    notice: {
        marginTop: 10,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: 'rgba(255,255,255,0.04)',
    },
    noticeText: {
        flex: 1,
        fontSize: 12,
        lineHeight: 17,
        fontWeight: '500',
    },
});
