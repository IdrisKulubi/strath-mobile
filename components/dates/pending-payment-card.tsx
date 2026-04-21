import React, { useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type BottomSheet from '@gorhom/bottom-sheet';

import { Text } from '@/components/ui/text';
import { CachedImage } from '@/components/ui/cached-image';
import { useTheme } from '@/hooks/use-theme';
import type { MutualDate } from '@/hooks/use-date-requests';
import { DateCoordinationPaywall } from '@/components/paywall/date-coordination-paywall';

interface PendingPaymentCardProps {
    match: MutualDate;
    index: number;
}

/**
 * Entry point for matches whose post-call decision is already "meet" but whose
 * payment window is still open. Mirrors the copy shown on the decision screen
 * so users who dismissed the paywall can always find their way back to it from
 * the Dates tab (docs/payment.md §3 step 6).
 */
export function PendingPaymentCard({ match, index }: PendingPaymentCardProps) {
    const { colors, isDark } = useTheme();
    const paywallRef = useRef<BottomSheet>(null);

    const mePaid = match.paymentState === 'paid_waiting_for_other';
    const dateMatchId = match.legacyDateMatchId ?? null;

    const countdownText = useMemo(() => {
        if (!match.paymentDueBy) return null;
        const ms = new Date(match.paymentDueBy).getTime() - Date.now();
        if (ms <= 0) return 'Window closing soon';
        const hours = Math.floor(ms / (1000 * 60 * 60));
        if (hours > 24) {
            const days = Math.floor(hours / 24);
            return `${days}d left to confirm`;
        }
        return `${hours}h left to confirm`;
    }, [match.paymentDueBy]);

    const handleOpen = useCallback(() => {
        if (!dateMatchId) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        paywallRef.current?.expand();
    }, [dateMatchId]);

    const handleClose = useCallback(() => {
        paywallRef.current?.close();
    }, []);

    return (
        <Animated.View
            entering={FadeInDown.delay(index * 80).springify().damping(14)}
            style={[
                styles.card,
                {
                    backgroundColor: isDark ? colors.card : '#fff',
                    borderColor: 'rgba(236,72,153,0.35)',
                },
            ]}
        >
            <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(236,72,153,0.18)' : 'rgba(236,72,153,0.10)' }]}>
                <Ionicons name="sparkles" size={12} color={colors.primary} />
                <Text style={[styles.badgeText, { color: colors.primary }]}>
                    {mePaid ? 'Waiting on partner' : 'Confirm your date'}
                </Text>
            </View>

            <View style={styles.headerRow}>
                <View style={[styles.avatarWrap, { backgroundColor: colors.muted }]}>
                    {match.withUser.profilePhoto ? (
                        <CachedImage uri={match.withUser.profilePhoto} style={styles.avatar} />
                    ) : (
                        <Ionicons name="person-circle-outline" size={56} color={colors.mutedForeground} />
                    )}
                </View>
                <View style={styles.nameBlock}>
                    <Text style={[styles.name, { color: colors.foreground }]}>
                        {match.withUser.firstName}{match.withUser.age ? `, ${match.withUser.age}` : ''}
                    </Text>
                    <Text style={[styles.subtext, { color: colors.mutedForeground }]} numberOfLines={2}>
                        {mePaid
                            ? `You're in. Waiting for ${match.withUser.firstName} to confirm their half.`
                            : `You both said yes — confirm with a KES 200 coordination fee to arrange it.`}
                    </Text>
                </View>
            </View>

            {countdownText && (
                <View style={[styles.countdownRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderColor: colors.border }]}>
                    <Ionicons name="time-outline" size={14} color={colors.mutedForeground} />
                    <Text style={[styles.countdownText, { color: colors.mutedForeground }]}>
                        {countdownText}
                    </Text>
                </View>
            )}

            {!mePaid && (
                <Pressable
                    onPress={handleOpen}
                    style={[styles.cta, { backgroundColor: colors.primary }]}
                >
                    <Ionicons name="card-outline" size={16} color="#fff" />
                    <Text style={styles.ctaText}>Confirm with KES 200</Text>
                </Pressable>
            )}

            {dateMatchId && (
                <DateCoordinationPaywall
                    ref={paywallRef}
                    dateMatchId={dateMatchId}
                    partnerName={match.withUser.firstName}
                    onClose={handleClose}
                    onPaid={handleClose}
                />
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 20,
        borderWidth: 1.5,
        padding: 16,
        gap: 12,
        marginHorizontal: 16,
        marginBottom: 12,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatarWrap: {
        width: 60,
        height: 60,
        borderRadius: 30,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    nameBlock: {
        flex: 1,
        gap: 3,
    },
    name: {
        fontSize: 18,
        fontWeight: '700',
    },
    subtext: {
        fontSize: 13,
        lineHeight: 18,
    },
    countdownRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 8,
        alignSelf: 'flex-start',
    },
    countdownText: {
        fontSize: 12,
        fontWeight: '600',
    },
    cta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: 14,
        paddingVertical: 13,
        minHeight: 46,
    },
    ctaText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
});
