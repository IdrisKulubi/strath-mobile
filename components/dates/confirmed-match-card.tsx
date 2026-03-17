import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, {
    FadeInDown,
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { CachedImage } from '@/components/ui/cached-image';
import { useTheme } from '@/hooks/use-theme';
import { MutualDate, ARRANGEMENT_STATUS_LABELS } from '@/hooks/use-date-requests';

interface ConfirmedMatchCardProps {
    match: MutualDate;
    index: number;
}

function PulseDot({ color }: { color: string }) {
    const scale = useSharedValue(1);
    useEffect(() => {
        scale.value = withRepeat(
            withSequence(
                withTiming(1.4, { duration: 700, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
            ),
            -1,
            false,
        );
    }, [scale]);
    const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
    return <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }, style]} />;
}

const ARRANGEMENT_COLORS: Record<MutualDate['arrangementStatus'], string> = {
    mutual: '#e91e8c',
    call_pending: '#f59e0b',
    being_arranged: '#e91e8c',
    upcoming: '#10b981',
    completed: '#10b981',
    cancelled: '#6b7280',
    expired: '#6b7280',
};

export function ConfirmedMatchCard({ match, index }: ConfirmedMatchCardProps) {
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const statusColor = ARRANGEMENT_COLORS[match.arrangementStatus];

    const handleViewProfile = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/profile/${match.withUser.id}`);
    }, [match.withUser.id, router]);

    const handleStartCall = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (match.legacyMatchId) {
            router.push(`/vibe-check/${match.legacyMatchId}`);
        }
    }, [match.legacyMatchId, router]);

    return (
        <Animated.View
            entering={FadeInDown.delay(index * 80).springify().damping(14)}
            style={[
                styles.card,
                {
                    backgroundColor: isDark ? colors.card : '#fff',
                    borderColor: colors.border,
                },
            ]}
        >
            {/* Match badge */}
            <View style={[styles.matchBadge, { backgroundColor: isDark ? 'rgba(233,30,140,0.12)' : 'rgba(233,30,140,0.08)' }]}>
                <Ionicons name="heart" size={12} color={colors.primary} />
                <Text style={[styles.matchBadgeText, { color: colors.primary }]}>
                    {match.arrangementStatus === 'mutual' ? 'Mutual Match' : 'Date Match'}
                </Text>
            </View>

            {/* Header */}
            <Pressable onPress={handleViewProfile} style={styles.headerRow}>
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
                    {match.withUser.compatibilityScore !== undefined && (
                        <View style={styles.compatRow}>
                            <Ionicons name="sparkles" size={12} color="#10b981" />
                            <Text style={styles.compatText}>
                                {match.withUser.compatibilityScore}% compatible
                            </Text>
                        </View>
                    )}
                    <Text style={[styles.vibeText, { color: colors.mutedForeground }]}>
                        Curated for both of you
                    </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
            </Pressable>

            {/* Why you match */}
            {match.withUser.compatibilityReasons && match.withUser.compatibilityReasons.length > 0 && (
                <View style={[styles.reasonsBlock, {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                    borderColor: colors.border,
                }]}>
                    {match.withUser.compatibilityReasons.slice(0, 2).map((r, i) => (
                        <Text key={i} style={[styles.reason, { color: colors.mutedForeground }]}>• {r}</Text>
                    ))}
                </View>
            )}

            {/* Arrangement status */}
            <View style={[styles.statusRow, { backgroundColor: `${statusColor}12`, borderColor: `${statusColor}30` }]}>
                <PulseDot color={statusColor} />
                <Text style={[styles.statusText, { color: statusColor }]}>
                    {ARRANGEMENT_STATUS_LABELS[match.arrangementStatus]}
                </Text>
            </View>

            {/* Scheduled date details — shown when date is confirmed */}
            {match.arrangementStatus === 'upcoming' && (match.venueName || match.scheduledAt) && (
                <View style={[styles.scheduledBlock, { backgroundColor: isDark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.06)', borderColor: 'rgba(16,185,129,0.25)' }]}>
                    <Ionicons name="calendar" size={16} color="#10b981" />
                    {match.venueName && (
                        <Text style={[styles.scheduledText, { color: colors.foreground }]}>
                            {match.venueName}{match.venueAddress ? `, ${match.venueAddress}` : ''}
                        </Text>
                    )}
                    {match.scheduledAt && (
                        <Text style={[styles.scheduledTime, { color: colors.mutedForeground }]}>
                            {new Date(match.scheduledAt).toLocaleDateString(undefined, { dateStyle: 'full', timeStyle: 'short' })}
                        </Text>
                    )}
                </View>
            )}

            {/* Call CTA — only shown if call not yet done */}
            {match.arrangementStatus === 'call_pending' && (
                <View style={styles.callSection}>
                    <Text style={[styles.callHint, { color: colors.mutedForeground }]}>
                        Before you meet, take a quick 3-minute call to reduce awkwardness and confirm the vibe.
                    </Text>
                    <Pressable
                        onPress={handleStartCall}
                        disabled={!match.legacyMatchId}
                        style={[styles.callBtn, { backgroundColor: colors.primary, opacity: match.legacyMatchId ? 1 : 0.6 }]}
                    >
                        <Ionicons name="call-outline" size={16} color="#fff" />
                        <Text style={styles.callBtnText}>Start 3-Minute Call</Text>
                    </Pressable>
                </View>
            )}

            {match.arrangementStatus === 'being_arranged' && (
                <View style={[styles.scheduledBlock, { backgroundColor: isDark ? 'rgba(233,30,140,0.08)' : 'rgba(233,30,140,0.06)', borderColor: 'rgba(233,30,140,0.25)' }]}>
                    <Ionicons name="sparkles" size={16} color={colors.primary} />
                    <Text style={[styles.scheduledText, { color: colors.foreground }]}>
                        Our team will reach out soon.
                    </Text>
                </View>
            )}

            {match.arrangementStatus === 'mutual' && (
                <View style={[styles.scheduledBlock, { backgroundColor: isDark ? 'rgba(233,30,140,0.08)' : 'rgba(233,30,140,0.06)', borderColor: 'rgba(233,30,140,0.25)' }]}>
                    <Ionicons name="sparkles" size={16} color={colors.primary} />
                    <Text style={[styles.scheduledText, { color: colors.foreground }]}>
                        Mutual interest unlocked. Start your 3-minute call when you're ready.
                    </Text>
                </View>
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 16,
        gap: 12,
        marginHorizontal: 16,
        marginBottom: 12,
    },
    matchBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
    },
    matchBadgeText: {
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
    compatRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    compatText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#10b981',
    },
    vibeText: {
        fontSize: 13,
        fontWeight: '500',
    },
    reasonsBlock: {
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 3,
    },
    reason: {
        fontSize: 13,
        lineHeight: 18,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    scheduledBlock: {
        flexDirection: 'column',
        gap: 4,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    scheduledText: {
        fontSize: 14,
        fontWeight: '600',
    },
    scheduledTime: {
        fontSize: 13,
        fontWeight: '500',
    },
    statusText: {
        fontSize: 13,
        fontWeight: '600',
        flex: 1,
    },
    callSection: {
        gap: 10,
    },
    callHint: {
        fontSize: 13,
        lineHeight: 18,
    },
    callBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: 14,
        paddingVertical: 13,
        minHeight: 46,
    },
    callBtnText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
});
