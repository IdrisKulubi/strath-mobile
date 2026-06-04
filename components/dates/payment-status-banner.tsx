import React from 'react';
import { StyleSheet, Text as RNText, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/use-theme';
import { usePaymentStatus } from '@/hooks/use-payment-status';
import { usePaymentsEnabled } from '@/hooks/use-payments-enabled';
import {
    formatPaymentAmount,
    getPaymentUiCopy,
    resolvePaymentUiPhase,
} from '@/lib/payment-ui';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';

interface PaymentStatusBannerProps {
    dateMatchId: string;
    partnerFirstName: string;
    viewerSlotConfirmed: boolean;
    partnerSlotConfirmed: boolean;
}

export function PaymentStatusBanner({
    dateMatchId,
    partnerFirstName,
    viewerSlotConfirmed,
    partnerSlotConfirmed,
}: PaymentStatusBannerProps) {
    const { colors } = useTheme();
    const { paymentsEnabled } = usePaymentsEnabled();
    const { data: paymentStatus } = usePaymentStatus(dateMatchId);

    if (!paymentsEnabled) {
        return null;
    }

    const phase = resolvePaymentUiPhase({
        paymentsEnabled,
        paymentStatus,
        viewerSlotConfirmed,
        partnerSlotConfirmed,
    });

    if (phase === 'free_confirm' || phase === 'awaiting_payment' || phase === 'partner_paid_you_havent') {
        return null;
    }

    const amountLabel = formatPaymentAmount(
        paymentStatus?.amount ?? 499,
        paymentStatus?.currency ?? 'KES',
    );
    const copy = getPaymentUiCopy(phase, partnerFirstName, amountLabel);

    const tone =
        phase === 'both_paid'
            ? colors.success ?? '#3DB87A'
            : phase === 'expired_unpaid' || phase === 'expired_refund_choice'
              ? colors.mutedForeground
              : colors.primary;

    return (
        <View
            style={[
                styles.banner,
                {
                    backgroundColor: `${tone}14`,
                    borderColor: `${tone}35`,
                },
            ]}
        >
            <Ionicons
                name={
                    phase === 'both_paid'
                        ? 'checkmark-circle'
                        : phase === 'paid_waiting'
                          ? 'time-outline'
                          : 'information-circle-outline'
                }
                size={18}
                color={tone}
            />
            <RNText style={[styles.text, { color: colors.foreground }]}>{copy.body || copy.partnerLine}</RNText>
        </View>
    );
}

const styles = StyleSheet.create({
    banner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: SPACING.tight,
        padding: SPACING.compact,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        marginTop: SPACING.tight,
    },
    text: {
        ...TYPOGRAPHY.caption,
        flex: 1,
        lineHeight: 18,
    },
});
