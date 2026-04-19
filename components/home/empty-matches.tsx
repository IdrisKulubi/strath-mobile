import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';

interface EmptyMatchesProps {
    /** User finished acting on today’s card(s) and has no active introduction right now. */
    allActioned?: boolean;
    /** Server has a queued introduction scheduled for a later UTC day. */
    hasUpcomingQueued?: boolean;
}

type EmptyVariant = 'waiting' | 'queued_next' | 'between_intros';

export function EmptyMatches({ allActioned = false, hasUpcomingQueued = false }: EmptyMatchesProps) {
    const { colors, isDark } = useTheme();
    const router = useRouter();

    const variant: EmptyVariant = useMemo(() => {
        if (allActioned && hasUpcomingQueued) return 'queued_next';
        if (allActioned) return 'between_intros';
        return 'waiting';
    }, [allActioned, hasUpcomingQueued]);

    const copy = useMemo(() => {
        switch (variant) {
            case 'waiting':
                return {
                    title: 'We’re still looking for your match',
                    subtitle:
                        'We’re curating introductions — not endless swipes. When someone is a strong fit, they’ll show up here first.',
                    tips: [
                        'We score compatibility for every intro',
                        'Pull down to refresh Home',
                        'Richer profiles help us find better matches',
                    ],
                    showProfileCta: true,
                };
            case 'queued_next':
                return {
                    title: 'Your next intro is on the way',
                    subtitle:
                        'Someone is queued for you on a later day. We’ll notify you when they’re ready — no need to keep checking.',
                    tips: ['Watch for a push notification', 'They’ll appear on Home when it’s time'],
                    showProfileCta: false,
                };
            case 'between_intros':
                return {
                    title: 'We’re finding your next fit',
                    subtitle:
                        'You’ve seen today’s introductions. When we find another strong match, we’ll bring them here.',
                    tips: ['Quality over quantity — that’s the point', 'Turn on notifications so you don’t miss it'],
                    showProfileCta: true,
                };
        }
    }, [variant]);

    const cardBorder = isDark ? 'rgba(233, 30, 140, 0.28)' : 'rgba(233, 30, 140, 0.2)';
    const cardInnerBg = isDark ? 'rgba(45, 27, 71, 0.45)' : 'rgba(255, 255, 255, 0.92)';
    const orbColors = isDark
        ? (['rgba(233,30,140,0.35)', 'rgba(147,51,234,0.2)'] as const)
        : (['rgba(233,30,140,0.2)', 'rgba(233,30,140,0.06)'] as const);

    return (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.outer}>
            <View style={[styles.card, { borderColor: cardBorder, backgroundColor: cardInnerBg }]}>
                <LinearGradient
                    colors={orbColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.cardGlow}
                />

                <View style={styles.cardContent}>
                    <View style={[styles.iconOrb, { borderColor: cardBorder }]}>
                        <LinearGradient colors={orbColors} style={StyleSheet.absoluteFill} start={{ x: 0.2, y: 0 }} end={{ x: 0.9, y: 1 }} />
                        <Ionicons name="sparkles" size={36} color={colors.primary} style={styles.iconSparkle} />
                    </View>

                    <Text style={[styles.title, { color: colors.foreground }]}>{copy.title}</Text>
                    <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{copy.subtitle}</Text>

                    <View style={[styles.tips, { borderTopColor: colors.border }]}>
                        {copy.tips.map((line) => (
                            <View key={line} style={styles.tipRow}>
                                <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={styles.tipIcon} />
                                <Text style={[styles.tipText, { color: colors.foreground }]}>{line}</Text>
                            </View>
                        ))}
                    </View>

                    {copy.showProfileCta ? (
                        <Pressable
                            accessibilityRole="button"
                            onPress={() => router.push('/edit-profile')}
                            style={({ pressed }) => [
                                styles.cta,
                                { backgroundColor: colors.primary, opacity: pressed ? 0.92 : 1 },
                            ]}
                        >
                            <Text style={[styles.ctaLabel, { color: colors.primaryForeground }]}>Polish your profile</Text>
                            <Ionicons name="arrow-forward" size={18} color={colors.primaryForeground} />
                        </Pressable>
                    ) : null}

                    <Text style={[styles.footnote, { color: colors.mutedForeground }]}>
                        StrathSpace works in the background — relax, we’ve got you.
                    </Text>
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
        borderRadius: 28,
        borderWidth: 1,
        overflow: 'hidden',
    },
    cardGlow: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.55,
    },
    cardContent: {
        paddingHorizontal: 22,
        paddingVertical: 28,
        gap: 14,
    },
    iconOrb: {
        alignSelf: 'center',
        width: 88,
        height: 88,
        borderRadius: 44,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        marginBottom: 4,
    },
    iconSparkle: {
        zIndex: 1,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        textAlign: 'center',
        letterSpacing: -0.4,
        lineHeight: 28,
    },
    subtitle: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
    },
    tips: {
        marginTop: 4,
        paddingTop: 18,
        gap: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    tipRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    tipIcon: {
        marginTop: 2,
    },
    tipText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '500',
    },
    cta: {
        marginTop: 6,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 16,
    },
    ctaLabel: {
        fontSize: 16,
        fontWeight: '700',
    },
    footnote: {
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 17,
        marginTop: 2,
    },
});
