import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { Text } from '@/components/ui/text';
import { CachedImage } from '@/components/ui/cached-image';
import { useTheme } from '@/hooks/use-theme';
import { ScheduledDate } from '@/hooks/use-date-requests';

interface HistoryCardProps {
    date: ScheduledDate;
    index: number;
}

const STATUS_CONFIG = {
    attended: {
        label: 'Completed',
        color: '#10b981',
        icon: 'checkmark-circle-outline' as const,
    },
    cancelled: {
        label: 'Cancelled',
        color: '#6b7280',
        icon: 'close-circle-outline' as const,
    },
    expired: {
        label: 'Expired',
        color: '#6b7280',
        icon: 'alert-circle-outline' as const,
    },
    scheduled: {
        label: 'Scheduled',
        color: '#3b82f6',
        icon: 'calendar-outline' as const,
    },
    pending_setup: {
        label: 'Pending',
        color: '#f59e0b',
        icon: 'time-outline' as const,
    },
};

function formatDate(iso: string) {
    try {
        return format(parseISO(iso), 'MMM d, yyyy');
    } catch {
        return '';
    }
}

export function HistoryCard({ date, index }: HistoryCardProps) {
    const { colors, isDark } = useTheme();
    const config = STATUS_CONFIG[date.status] ?? STATUS_CONFIG.expired;

    return (
        <Animated.View
            entering={FadeInDown.delay(index * 60).springify().damping(14)}
            style={[
                styles.card,
                {
                    backgroundColor: isDark ? colors.card : '#fff',
                    borderColor: colors.border,
                    opacity: date.status === 'cancelled' || date.status === 'expired' ? 0.7 : 1,
                },
            ]}
        >
            <View style={styles.row}>
                <View style={[styles.avatarWrap, { backgroundColor: colors.muted }]}>
                    {date.withUser.profilePhoto ? (
                        <CachedImage uri={date.withUser.profilePhoto} style={styles.avatar} />
                    ) : (
                        <Ionicons name="person-circle-outline" size={48} color={colors.mutedForeground} />
                    )}
                </View>

                <View style={styles.info}>
                    <Text style={[styles.name, { color: colors.foreground }]}>
                        {date.withUser.firstName}
                    </Text>
                    {date.scheduledAt && (
                        <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
                            {formatDate(date.scheduledAt)}
                        </Text>
                    )}
                </View>

                <View style={[styles.statusBadge, { backgroundColor: `${config.color}15` }]}>
                    <Ionicons name={config.icon} size={14} color={config.color} />
                    <Text style={[styles.statusText, { color: config.color }]}>
                        {config.label}
                    </Text>
                </View>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 14,
        marginHorizontal: 16,
        marginBottom: 10,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatarWrap: {
        width: 48,
        height: 48,
        borderRadius: 24,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    info: {
        flex: 1,
        gap: 3,
    },
    name: {
        fontSize: 16,
        fontWeight: '700',
    },
    dateText: {
        fontSize: 13,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 999,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
});
