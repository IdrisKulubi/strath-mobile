import React, { useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { CachedImage } from '@/components/ui/cached-image';
import { useTheme } from '@/hooks/use-theme';
import { SentRequest, VIBE_EMOJIS, VIBE_LABELS } from '@/hooks/use-date-requests';

interface SentInviteCardProps {
    request: SentRequest;
    index: number;
}

const STATUS_CONFIG = {
    pending: {
        label: 'Waiting for response',
        color: '#f59e0b',
        icon: 'time-outline' as const,
        bg: 'rgba(245,158,11,0.1)',
    },
    accepted: {
        label: 'Accepted',
        color: '#10b981',
        icon: 'checkmark-circle-outline' as const,
        bg: 'rgba(16,185,129,0.1)',
    },
    declined: {
        label: 'Declined',
        color: '#6b7280',
        icon: 'close-circle-outline' as const,
        bg: 'rgba(107,114,128,0.1)',
    },
    expired: {
        label: 'Expired',
        color: '#6b7280',
        icon: 'alert-circle-outline' as const,
        bg: 'rgba(107,114,128,0.1)',
    },
};

export function SentInviteCard({ request, index }: SentInviteCardProps) {
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const config = STATUS_CONFIG[request.status];

    const handleViewProfile = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/profile/${request.toUserId}`);
    }, [request.toUserId, router]);

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
            <View style={styles.row}>
                {/* Avatar */}
                <Pressable onPress={handleViewProfile} style={[styles.avatarWrap, { backgroundColor: colors.muted }]}>
                    {request.toUser.profilePhoto ? (
                        <CachedImage uri={request.toUser.profilePhoto} style={styles.avatar} />
                    ) : (
                        <Ionicons name="person-circle-outline" size={52} color={colors.mutedForeground} />
                    )}
                </Pressable>

                {/* Info */}
                <View style={styles.info}>
                    <Text style={[styles.name, { color: colors.foreground }]}>
                        {request.toUser.firstName}{request.toUser.age ? `, ${request.toUser.age}` : ''}
                    </Text>
                    <Text style={[styles.vibe, { color: colors.mutedForeground }]}>
                        {VIBE_EMOJIS[request.vibe]} {VIBE_LABELS[request.vibe]} invite
                    </Text>

                    {/* Status badge */}
                    <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
                        <Ionicons name={config.icon} size={13} color={config.color} />
                        <Text style={[styles.statusText, { color: config.color }]}>
                            {config.label}
                        </Text>
                    </View>
                </View>

                {/* View profile chevron */}
                <Pressable onPress={handleViewProfile} hitSlop={8}>
                    <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
                </Pressable>
            </View>

            {/* Optional message */}
            {request.message && (
                <View style={[styles.messageWrap, {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                    borderColor: colors.border,
                }]}>
                    <Text style={[styles.messageText, { color: colors.mutedForeground }]}>
                        "{request.message}"
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
        gap: 10,
        marginHorizontal: 16,
        marginBottom: 12,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatarWrap: {
        width: 56,
        height: 56,
        borderRadius: 28,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
    },
    info: {
        flex: 1,
        gap: 4,
    },
    name: {
        fontSize: 17,
        fontWeight: '700',
    },
    vibe: {
        fontSize: 13,
        fontWeight: '500',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        marginTop: 2,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    messageWrap: {
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    messageText: {
        fontSize: 13,
        fontStyle: 'italic',
        lineHeight: 18,
    },
});
