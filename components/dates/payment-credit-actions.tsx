import React from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text as RNText,
    TouchableOpacity,
    View,
} from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { usePaymentStatus } from '@/hooks/use-payment-status';
import { usePaymentsEnabled } from '@/hooks/use-payments-enabled';
import { useRefundChoice, useUsePaymentCredit } from '@/hooks/use-payment-credit';
import { useToast } from '@/components/ui/toast';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';

interface PaymentCreditActionsProps {
    dateMatchId: string;
    onCreditApplied?: () => void;
}

export function PaymentCreditActions({ dateMatchId, onCreditApplied }: PaymentCreditActionsProps) {
    const { colors } = useTheme();
    const toast = useToast();
    const { paymentsEnabled } = usePaymentsEnabled();
    const { data: status, isLoading } = usePaymentStatus(dateMatchId);
    const useCredit = useUsePaymentCredit();
    const refundChoice = useRefundChoice();

    if (!paymentsEnabled) {
        return null;
    }

    if (isLoading && !status) {
        return (
            <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <ActivityIndicator color={colors.primary} />
            </View>
        );
    }

    if (!status) {
        return null;
    }

    const showRefund = status.canChooseRefund;
    const showUseCredit = status.canUseCredit;
    const isCancelled = status.paymentState === 'cancelled';

    if (!showRefund && !showUseCredit) {
        return null;
    }

    const amountLabel = `KES ${status.amount}`;

    const handleUseCredit = () => {
        useCredit.mutate(dateMatchId, {
            onSuccess: (data) => {
                if (data?.finalized) {
                    toast.show({
                        message: 'Date confirmed. See you on campus.',
                        variant: 'success',
                    });
                } else {
                    toast.show({
                        message: 'You are confirmed. Waiting for your match.',
                        variant: 'default',
                    });
                }
                onCreditApplied?.();
            },
            onError: (error) => {
                toast.show({
                    message: error instanceof Error ? error.message : 'Could not use credit.',
                    variant: 'danger',
                });
            },
        });
    };

    const handleRefundChoice = (choice: 'credit' | 'refund') => {
        refundChoice.mutate(
            { dateMatchId, choice },
            {
                onSuccess: (_data, variables) => {
                    if (variables.choice === 'credit') {
                        toast.show({
                            message: `${amountLabel} stays in your StrathSpace credit.`,
                            variant: 'success',
                        });
                    } else {
                        toast.show({
                            message: 'Refund requested. We will process it shortly.',
                            variant: 'default',
                        });
                    }
                },
                onError: (error) => {
                    toast.show({
                        message: error instanceof Error ? error.message : 'Could not update your choice.',
                        variant: 'danger',
                    });
                },
            },
        );
    };

    const busy = useCredit.isPending || refundChoice.isPending;

    return (
        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
            {showRefund ? (
                <>
                    <RNText style={[styles.body, { color: colors.mutedForeground }]}>
                        {isCancelled
                            ? `This date was cancelled. Your ${amountLabel} is saved as StrathSpace credit, or you can request a refund.`
                            : `They did not confirm in time. Your ${amountLabel} is saved as StrathSpace credit, or you can request a refund.`}
                    </RNText>
                    <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Keep as credit"
                        activeOpacity={0.88}
                        disabled={busy}
                        onPress={() => handleRefundChoice('credit')}
                        style={[
                            styles.primaryButton,
                            { backgroundColor: colors.primary, borderColor: colors.primary },
                            busy && styles.disabled,
                        ]}
                    >
                        <RNText style={styles.primaryLabel}>
                            {refundChoice.isPending ? 'Saving…' : 'Keep as credit'}
                        </RNText>
                    </TouchableOpacity>
                    <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Request refund"
                        activeOpacity={0.88}
                        disabled={busy}
                        onPress={() => handleRefundChoice('refund')}
                        style={[
                            styles.outlineButton,
                            { borderColor: colors.border, backgroundColor: colors.background },
                            busy && styles.disabled,
                        ]}
                    >
                        <RNText style={[styles.outlineLabel, { color: colors.foreground }]}>
                            Request refund
                        </RNText>
                    </TouchableOpacity>
                </>
            ) : null}

            {showUseCredit ? (
                <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Use ${amountLabel} credit`}
                    activeOpacity={0.88}
                    disabled={busy}
                    onPress={handleUseCredit}
                    style={[
                        styles.outlineButton,
                        { borderColor: colors.border, backgroundColor: colors.background },
                        showRefund && styles.spacedTop,
                        busy && styles.disabled,
                    ]}
                >
                    <RNText style={[styles.outlineLabel, { color: colors.foreground }]}>
                        {useCredit.isPending ? 'Applying credit…' : `Use ${amountLabel} credit`}
                    </RNText>
                </TouchableOpacity>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderWidth: 1,
        borderRadius: RADIUS.md,
        padding: SPACING.base,
        gap: SPACING.compact,
        marginTop: SPACING.compact,
    },
    body: {
        ...TYPOGRAPHY.caption,
    },
    primaryButton: {
        minHeight: 44,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SPACING.base,
        paddingVertical: SPACING.compact,
    },
    primaryLabel: {
        ...TYPOGRAPHY.callout,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    outlineButton: {
        minHeight: 44,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SPACING.base,
        paddingVertical: SPACING.compact,
    },
    outlineLabel: {
        ...TYPOGRAPHY.callout,
        fontWeight: '600',
    },
    spacedTop: {
        marginTop: SPACING.tight,
    },
    disabled: {
        opacity: 0.6,
    },
});
