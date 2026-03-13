import React, { useCallback } from 'react';
import { View, StyleSheet, Pressable, Linking, Alert } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { format, parseISO } from 'date-fns';
import { Text } from '@/components/ui/text';
import { CachedImage } from '@/components/ui/cached-image';
import { useTheme } from '@/hooks/use-theme';
import { ScheduledDate } from '@/hooks/use-date-requests';

interface UpcomingDateCardProps {
    date: ScheduledDate;
    index: number;
    onCancel?: (dateId: string) => void;
}

function formatDatetime(iso: string) {
    try {
        return format(parseISO(iso), "EEEE, d MMM 'at' h:mm a");
    } catch {
        return iso;
    }
}

export function UpcomingDateCard({ date, index, onCancel }: UpcomingDateCardProps) {
    const { colors, colorScheme } = useTheme();
    const isDark = colorScheme === 'dark';

    const handleSupport = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Linking.openURL('mailto:support@strathspace.com?subject=Date%20Support');
    }, []);

    const handleCancel = useCallback(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
            'Cancel Date',
            `Are you sure you want to cancel your date with ${date.withUser.firstName}?`,
            [
                { text: 'Keep Date', style: 'cancel' },
                {
                    text: 'Cancel Date',
                    style: 'destructive',
                    onPress: () => onCancel?.(date.id),
                },
            ],
        );
    }, [date, onCancel]);

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
            {/* Header */}
            <View style={styles.headerRow}>
                <View style={[styles.avatarWrap, { backgroundColor: colors.muted }]}>
                    {date.withUser.profilePhoto ? (
                        <CachedImage uri={date.withUser.profilePhoto} style={styles.avatar} />
                    ) : (
                        <Ionicons name="person-circle-outline" size={52} color={colors.mutedForeground} />
                    )}
                </View>
                <View style={styles.nameBlock}>
                    <Text style={[styles.label, { color: colors.mutedForeground }]}>Upcoming Date</Text>
                    <Text style={[styles.name, { color: colors.foreground }]}>{date.withUser.firstName}</Text>
                </View>
                <View style={[styles.confirmedBadge, { backgroundColor: '#10b98118' }]}>
                    <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                    <Text style={styles.confirmedText}>Confirmed</Text>
                </View>
            </View>

            {/* Details */}
            <View style={[styles.detailsBlock, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: colors.border }]}>
                {date.scheduledAt && (
                    <View style={styles.detailRow}>
                        <Ionicons name="time-outline" size={16} color={colors.primary} />
                        <Text style={[styles.detailText, { color: colors.foreground }]}>
                            {formatDatetime(date.scheduledAt)}
                        </Text>
                    </View>
                )}
                {date.venueName && (
                    <View style={styles.detailRow}>
                        <Ionicons name="location-outline" size={16} color={colors.primary} />
                        <Text style={[styles.detailText, { color: colors.foreground }]}>
                            {date.venueName}{date.venueAddress ? `, ${date.venueAddress}` : ''}
                        </Text>
                    </View>
                )}
            </View>

            {/* Actions */}
            <View style={styles.actionsRow}>
                <Pressable
                    onPress={handleSupport}
                    style={({ pressed }) => [
                        styles.supportBtn,
                        {
                            borderColor: colors.border,
                            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                            opacity: pressed ? 0.7 : 1,
                        },
                    ]}
                >
                    <Ionicons name="chatbubble-outline" size={14} color={colors.mutedForeground} />
                    <Text style={[styles.supportBtnText, { color: colors.mutedForeground }]}>Support</Text>
                </Pressable>

                <Pressable
                    onPress={handleCancel}
                    style={({ pressed }) => [
                        styles.cancelBtn,
                        {
                            borderColor: '#FF3B3030',
                            backgroundColor: isDark ? 'rgba(255,59,48,0.08)' : 'rgba(255,59,48,0.05)',
                            opacity: pressed ? 0.7 : 1,
                        },
                    ]}
                >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
            </View>
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
    headerRow: {
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
    nameBlock: {
        flex: 1,
        gap: 2,
    },
    label: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    name: {
        fontSize: 18,
        fontWeight: '700',
    },
    confirmedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
    },
    confirmedText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#10b981',
    },
    detailsBlock: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 12,
        gap: 8,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    detailText: {
        fontSize: 14,
        fontWeight: '500',
        flex: 1,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    supportBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderRadius: 12,
        borderWidth: 1,
        paddingVertical: 10,
    },
    supportBtnText: {
        fontSize: 13,
        fontWeight: '600',
    },
    cancelBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        borderWidth: 1,
        paddingVertical: 10,
    },
    cancelBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#FF3B30',
    },
});
