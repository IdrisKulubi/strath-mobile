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
import { MutualDate, ARRANGEMENT_STATUS_LABELS, isChatUnlocked } from '@/hooks/use-date-requests';

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

export function ConfirmedMatchCard({ match, index }: ConfirmedMatchCardProps) {
    const { colors, isDark } = useTheme();
    const arrangementColors: Record<MutualDate['arrangementStatus'], string> = {
        mutual: colors.primary,
        being_arranged: colors.primary,
        upcoming: colors.success ?? '#3DB87A',
        completed: colors.success ?? '#3DB87A',
        cancelled: colors.mutedForeground,
        expired: colors.mutedForeground,
    };
    const router = useRouter();
    const statusColor = arrangementColors[match.arrangementStatus];
    const formattedScheduledAt = match.scheduledAt
        ? new Intl.DateTimeFormat(undefined, {
            dateStyle: 'full',
            timeStyle: 'short',
        }).format(new Date(match.scheduledAt))
        : null;

    const handleViewProfile = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/profile/${match.withUser.id}`);
    }, [match.withUser.id, router]);

    const handleOpenChat = useCallback(() => {
        if (!match.legacyMatchId) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: '/chat/[matchId]', params: { matchId: match.legacyMatchId } } as any);
    }, [match.legacyMatchId, router]);

    const chatUnlocked = isChatUnlocked(match);
    const unreadCount = match.unreadMessageCount ?? 0;
    const unreadLabel = unreadCount > 9 ? '9+' : String(unreadCount);

    return (
        <Animated.View
            entering={FadeInDown.delay(index * 80).duration(400)}
            style={[styles.card, {
                backgroundColor: isDark ? colors.card : '#fff',
                borderColor: colors.border,
            }]}
        >
            <View style={[styles.matchBadge, { backgroundColor: `${colors.primary}18` }]}>
                <Ionicons name="heart" size={12} color={colors.primary} />
                <Text style={[styles.matchBadgeText, { color: colors.primary }]}>Mutual</Text>
            </View>

            <Pressable onPress={handleViewProfile} style={styles.headerRow}>
                <View style={[styles.avatarWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                    {match.withUser.profilePhoto ? (
                        <CachedImage uri={match.withUser.profilePhoto} style={styles.avatar} />
                    ) : (
                        <Ionicons name="person" size={28} color={colors.mutedForeground} />
                    )}
                </View>
                <View style={styles.nameBlock}>
                    <Text style={[styles.name, { color: colors.foreground }]}>
                        {match.withUser.firstName}
                        {match.withUser.age ? `, ${match.withUser.age}` : ''}
                    </Text>
                    {match.withUser.compatibilityScore != null && (
                        <Text style={[styles.vibeText, { color: colors.primary }]}>
                            {match.withUser.compatibilityScore}% match
                        </Text>
                    )}
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
            </Pressable>

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

            <View style={[styles.statusRow, { backgroundColor: `${statusColor}12`, borderColor: `${statusColor}30` }]}>
                <PulseDot color={statusColor} />
                <Text style={[styles.statusText, { color: statusColor }]}>
                    {ARRANGEMENT_STATUS_LABELS[match.arrangementStatus]}
                </Text>
            </View>

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
                            {formattedScheduledAt}
                        </Text>
                    )}
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
                <View style={[styles.mutualHintBlock, { backgroundColor: isDark ? 'rgba(233,30,140,0.08)' : 'rgba(233,30,140,0.06)', borderColor: 'rgba(233,30,140,0.25)' }]}>
                    <View style={styles.mutualHintRow}>
                        <Ionicons name="chatbubble-ellipses" size={16} color={colors.primary} />
                        <Text style={[styles.scheduledText, { color: colors.foreground, flex: 1 }]}>
                            You matched. Say hi in chat while we arrange your date.
                        </Text>
                    </View>
                </View>
            )}

            {chatUnlocked && (
                <Pressable
                    onPress={handleOpenChat}
                    style={({ pressed }) => [
                        styles.chatChip,
                        match.arrangementStatus === 'mutual' && styles.chatChipPrimary,
                        {
                            borderColor: match.arrangementStatus === 'mutual' ? colors.primary : colors.border,
                            backgroundColor: match.arrangementStatus === 'mutual'
                                ? `${colors.primary}14`
                                : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'),
                            opacity: pressed ? 0.7 : 1,
                        },
                    ]}
                >
                    <Ionicons
                        name="chatbubble-ellipses-outline"
                        size={18}
                        color={match.arrangementStatus === 'mutual' ? colors.primary : colors.foreground}
                    />
                    <Text style={[
                        styles.chatChipText,
                        { color: match.arrangementStatus === 'mutual' ? colors.primary : colors.foreground },
                    ]} numberOfLines={1}>
                        Message {match.withUser.firstName}
                    </Text>
                    {unreadCount > 0 ? (
                        <View style={[styles.chatUnreadBadge, { backgroundColor: colors.primary }]}>
                            <Text style={styles.chatUnreadBadgeText}>{unreadLabel}</Text>
                        </View>
                    ) : (
                        <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
                    )}
                </Pressable>
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
    mutualHintBlock: {
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    mutualHintRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
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
    chatChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderRadius: 14,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 12,
        minHeight: 46,
    },
    chatChipPrimary: {
        minHeight: 50,
    },
    chatChipText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
    },
    chatUnreadBadge: {
        minWidth: 22,
        height: 22,
        borderRadius: 11,
        paddingHorizontal: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chatUnreadBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '800',
    },
});
