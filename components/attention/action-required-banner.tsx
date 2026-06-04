import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { usePaymentStatus } from '@/hooks/use-payment-status';
import { usePaymentsEnabled } from '@/hooks/use-payments-enabled';
import { formatPaymentAmount } from '@/lib/payment-ui';
import { formatConfirmBy, formatMeetupSlot } from '@/lib/meetup-slot';
import type { SlotConfirmationState } from '@/hooks/use-daily-matches';

interface ActionRequiredBannerProps {
    partnerFirstName: string;
    slot: SlotConfirmationState;
    dateMatchId?: string | null;
    onPress: () => void;
}

export function ActionRequiredBanner({
    partnerFirstName,
    slot,
    dateMatchId,
    onPress,
}: ActionRequiredBannerProps) {
    const { colors } = useTheme();
    const { paymentsEnabled } = usePaymentsEnabled();
    const { data: paymentStatus } = usePaymentStatus(dateMatchId ?? undefined);

    if (!slot.needsSlotConfirmation || slot.viewerSlotConfirmed || !slot.confirmWindowOpen) {
        return null;
    }

    const slotLabel = slot.scheduledAt ? formatMeetupSlot(slot.scheduledAt) : 'your campus date';
    const confirmByLabel = slot.confirmBy ? formatConfirmBy(slot.confirmBy) : null;
    const amountLabel = formatPaymentAmount(
        paymentStatus?.amount ?? 499,
        paymentStatus?.currency ?? 'KES',
    );

    const usePaymentCopy = paymentsEnabled && Boolean(dateMatchId);

    const title = slot.partnerSlotConfirmed
        ? `${partnerFirstName} confirmed — your turn`
        : usePaymentCopy
          ? `Pay ${amountLabel} to confirm`
          : `Confirm your date with ${partnerFirstName}`;

    const subtitle = slot.partnerSlotConfirmed
        ? usePaymentCopy
            ? `Pay ${amountLabel} to lock in ${slotLabel}${confirmByLabel ? ` by ${confirmByLabel}` : ''}.`
            : `Lock in ${slotLabel}${confirmByLabel ? ` by ${confirmByLabel}` : ''}.`
        : usePaymentCopy
          ? `Both said yes. Confirm with a one-time ${amountLabel} setup fee.`
          : `${slotLabel}${confirmByLabel ? ` · Confirm by ${confirmByLabel}` : ''}`;

    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={title}
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
                <Ionicons name={usePaymentCopy ? 'card-outline' : 'calendar'} size={18} color={colors.primary} />
            </View>
            <View style={styles.textWrap}>
                <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
                    {title}
                </Text>
                <Text style={[styles.subtitle, { color: colors.mutedForeground }]} numberOfLines={2}>
                    {subtitle}
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
