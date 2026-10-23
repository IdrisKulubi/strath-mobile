import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { formatMeetupSlot } from '@/lib/meetup-slot';
import type { ReschedulePendingState } from '@/lib/reschedule-types';

interface RescheduleResponseBannerProps {
    partnerFirstName: string;
    pending: ReschedulePendingState;
    onPress: () => void;
}

export function RescheduleResponseBanner({
    partnerFirstName,
    pending,
    onPress,
}: RescheduleResponseBannerProps) {
    const { colors } = useTheme();
    const slotLabel = formatMeetupSlot(pending.proposedScheduledAt);

    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel="Respond to date change request"
            style={({ pressed }) => [
                styles.banner,
                {
                    backgroundColor: `${colors.primary}14`,
                    borderColor: `${colors.primary}40`,
                    opacity: pressed ? 0.9 : 1,
                },
            ]}
        >
            <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}22` }]}>
                <Ionicons name="swap-horizontal" size={18} color={colors.primary} />
            </View>
            <View style={styles.textWrap}>
                <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
                    Respond to date change request
                </Text>
                <Text style={[styles.subtitle, { color: colors.mutedForeground }]} numberOfLines={2}>
                    {partnerFirstName} proposed {slotLabel}.
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
        </Pressable>
    );
}

const styles = StyleSheet.create({
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginHorizontal: 16,
        marginBottom: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1,
    },
    iconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textWrap: {
        flex: 1,
        gap: 2,
    },
    title: {
        fontSize: 15,
        fontWeight: '600',
    },
    subtitle: {
        fontSize: 13,
        lineHeight: 18,
    },
});
