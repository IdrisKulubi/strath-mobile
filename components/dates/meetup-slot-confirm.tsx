import React, { useMemo } from 'react';
import {
    Pressable,
    StyleSheet,
    Text as RNText,
    TouchableOpacity,
    View,
    type StyleProp,
    type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/hooks/use-theme';
import { useConfirmMeetupSlot } from '@/hooks/use-confirm-meetup-slot';
import { usePayToConfirm } from '@/hooks/use-pay-to-confirm';
import { usePaymentStatus } from '@/hooks/use-payment-status';
import { usePaymentsEnabled } from '@/hooks/use-payments-enabled';
import { useNotificationPermissionPrompt } from '@/context/notification-permission-context';
import { useToast } from '@/components/ui/toast';
import { PaymentCreditActions } from '@/components/dates/payment-credit-actions';
import { PaymentStatusBanner } from '@/components/dates/payment-status-banner';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import {
    formatPaymentAmount,
    getPaymentUiCopy,
    resolvePaymentUiPhase,
} from '@/lib/payment-ui';
import { MeetupRescheduleSection } from '@/components/dates/meetup-reschedule-section';
import { formatConfirmBy, formatMeetupSlot, MEETUP_WINDOWS_COPY } from '@/lib/meetup-slot';
import type { RescheduleViewerState } from '@/lib/reschedule-types';

export interface MeetupSlotConfirmProps {
    mutualMatchId: string;
    dateMatchId?: string | null;
    partnerFirstName: string;
    scheduledAt: string | null;
    confirmBy: string | null;
    viewerSlotConfirmed: boolean;
    partnerSlotConfirmed: boolean;
    confirmWindowOpen: boolean;
    reschedule?: RescheduleViewerState;
    layout?: 'inline' | 'modal';
    style?: StyleProp<ViewStyle>;
}

export function MeetupSlotConfirm({
    mutualMatchId,
    dateMatchId,
    partnerFirstName,
    scheduledAt,
    confirmBy,
    viewerSlotConfirmed,
    partnerSlotConfirmed,
    confirmWindowOpen,
    reschedule,
    layout = 'inline',
    style,
}: MeetupSlotConfirmProps) {
    const { colors } = useTheme();
    const toast = useToast();
    const confirm = useConfirmMeetupSlot();
    const payToConfirm = usePayToConfirm();
    const { paymentsEnabled } = usePaymentsEnabled();
    const { data: paymentStatus } = usePaymentStatus(dateMatchId ?? undefined);
    const { promptIfAppropriate } = useNotificationPermissionPrompt();
    const primaryFill = colors.primary;
    const isModal = layout === 'modal';

    const amountLabel = formatPaymentAmount(
        paymentStatus?.amount ?? 499,
        paymentStatus?.currency ?? 'KES',
    );

    const paymentPhase = resolvePaymentUiPhase({
        paymentsEnabled,
        paymentStatus,
        viewerSlotConfirmed,
        partnerSlotConfirmed,
    });

    const paymentCopy = getPaymentUiCopy(paymentPhase, partnerFirstName, amountLabel);

    const isPending = paymentsEnabled ? payToConfirm.isPending : confirm.isPending;

    const canAct =
        confirmWindowOpen
        && !viewerSlotConfirmed
        && !isPending
        && paymentPhase !== 'expired_unpaid'
        && paymentPhase !== 'expired_refund_choice'
        && paymentPhase !== 'both_paid'
        && paymentPhase !== 'paid_waiting';

    const partnerLine = useMemo(() => {
        if (paymentsEnabled && paymentCopy.partnerLine) {
            return paymentCopy.partnerLine;
        }
        if (viewerSlotConfirmed) {
            return partnerSlotConfirmed
                ? 'You both confirmed.'
                : `Waiting for ${partnerFirstName} to confirm.`;
        }
        if (partnerSlotConfirmed) {
            return `${partnerFirstName} confirmed. Tap below to lock in.`;
        }
        return `Confirm your assigned time with ${partnerFirstName}.`;
    }, [
        paymentsEnabled,
        paymentCopy.partnerLine,
        viewerSlotConfirmed,
        partnerSlotConfirmed,
        partnerFirstName,
    ]);

    const showToastForOutcome = async (outcome: string) => {
        if (outcome === 'finalized') {
            toast.show({
                message: 'Date confirmed. See you on campus.',
                variant: 'success',
            });
        } else if (outcome === 'paid_waiting') {
            toast.show({
                message: `You are confirmed. Waiting for ${partnerFirstName}.`,
                variant: 'default',
            });
        } else if (outcome === 'confirmed') {
            toast.show({
                message: `Waiting for ${partnerFirstName} to confirm.`,
                variant: 'default',
            });
        } else if (outcome === 'cancelled' || outcome === 'unpaid') {
            toast.show({
                message: 'Payment was not completed. Your date is still pending.',
                variant: 'default',
            });
        }
        await promptIfAppropriate({
            context: 'after_confirm',
            partnerName: partnerFirstName,
        });
    };

    const handlePrimaryAction = () => {
        if (!canAct) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        if (paymentsEnabled && dateMatchId) {
            payToConfirm.mutate(
                { mutualMatchId, dateMatchId, partnerFirstName },
                {
                    onSuccess: (result) => {
                        void showToastForOutcome(result.outcome);
                    },
                    onError: (error) => {
                        toast.show({
                            message:
                                error instanceof Error
                                    ? error.message
                                    : 'Could not start payment. Try again.',
                            variant: 'danger',
                        });
                    },
                },
            );
            return;
        }

        confirm.mutate(mutualMatchId, {
            onSuccess: async (data) => {
                if (data?.status === 'finalized') {
                    await showToastForOutcome('finalized');
                } else {
                    await showToastForOutcome('confirmed');
                }
            },
            onError: () => {
                toast.show({
                    message: 'Could not confirm right now. Try again.',
                    variant: 'danger',
                });
            },
        });
    };

    const primaryCtaLabel = paymentsEnabled
        ? isPending
            ? 'Opening checkout…'
            : paymentCopy.primaryCta ?? 'Confirm date'
        : isPending
          ? 'Confirming…'
          : 'Confirm date';

    const bodyCopy = paymentsEnabled && paymentCopy.body ? paymentCopy.body : null;

    const confirmedBlock = (
        <View
            style={[
                isModal ? styles.confirmedBadgeModal : styles.confirmedBadge,
                { borderColor: colors.border },
            ]}
        >
            <Ionicons name="checkmark-circle" size={isModal ? 20 : 18} color={primaryFill} />
            <RNText style={[styles.confirmedLabel, { color: colors.foreground }]}>You confirmed</RNText>
        </View>
    );

    const primaryButton = (
        <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={primaryCtaLabel}
            activeOpacity={0.88}
            disabled={!canAct}
            onPress={handlePrimaryAction}
        >
            <View
                style={[
                    isModal ? styles.modalConfirmButton : styles.inlinePrimaryButton,
                    {
                        backgroundColor: colors.primary,
                        borderColor: colors.primary,
                    },
                    !canAct && styles.buttonDisabled,
                ]}
            >
                <RNText style={styles.primaryButtonLabel}>{primaryCtaLabel}</RNText>
            </View>
        </TouchableOpacity>
    );

    const creditBlock =
        dateMatchId && paymentsEnabled ? (
            <PaymentCreditActions
                dateMatchId={dateMatchId}
                onCreditApplied={() => {
                    void showToastForOutcome('paid_waiting');
                }}
            />
        ) : null;

    const statusBanner =
        dateMatchId && paymentsEnabled ? (
            <PaymentStatusBanner
                dateMatchId={dateMatchId}
                partnerFirstName={partnerFirstName}
                viewerSlotConfirmed={viewerSlotConfirmed}
                partnerSlotConfirmed={partnerSlotConfirmed}
            />
        ) : null;

    if (isModal) {
        return (
            <View
                style={[
                    styles.modalPanel,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    style,
                ]}
            >
                <View style={styles.modalBody}>
                    {scheduledAt ? (
                        <View style={[styles.modalSlotHero, { backgroundColor: colors.muted }]}>
                            <Ionicons name="calendar-outline" size={22} color={primaryFill} />
                            <RNText style={[styles.modalSlotText, { color: colors.foreground }]}>
                                {formatMeetupSlot(scheduledAt)}
                            </RNText>
                        </View>
                    ) : null}

                    {confirmBy ? (
                        <RNText style={[styles.modalDeadline, { color: colors.mutedForeground }]}>
                            Confirm by {formatConfirmBy(confirmBy)}
                        </RNText>
                    ) : null}

                    <RNText style={[styles.modalVenueCopy, { color: colors.mutedForeground }]}>
                        {MEETUP_WINDOWS_COPY}
                    </RNText>

                    {bodyCopy ? (
                        <RNText style={[styles.paymentBody, { color: colors.mutedForeground }]}>
                            {bodyCopy}
                        </RNText>
                    ) : null}

                    <RNText style={[styles.modalPartnerLine, { color: colors.mutedForeground }]}>
                        {partnerLine}
                    </RNText>

                    {statusBanner}

                    {!confirmWindowOpen && !viewerSlotConfirmed ? (
                        <RNText
                            style={[styles.closedCopy, styles.modalClosedCopy, { color: colors.destructive }]}
                        >
                            The confirmation window has closed.
                        </RNText>
                    ) : null}
                </View>

                {viewerSlotConfirmed || paymentPhase === 'paid_waiting' || paymentPhase === 'both_paid'
                    ? confirmedBlock
                    : primaryButton}

                {creditBlock}

                <MeetupRescheduleSection
                    layout="modal"
                    mutualMatchId={mutualMatchId}
                    dateMatchId={dateMatchId}
                    partnerFirstName={partnerFirstName}
                    viewerSlotConfirmed={viewerSlotConfirmed}
                    reschedule={reschedule}
                />
            </View>
        );
    }

    return (
        <View
            style={[
                styles.card,
                {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                },
                style,
            ]}
        >
            <RNText style={[styles.title, { color: colors.foreground }]}>Your StrathSpace date</RNText>
            <RNText style={[styles.windowsCopy, { color: colors.mutedForeground }]}>
                {MEETUP_WINDOWS_COPY}
            </RNText>

            {scheduledAt ? (
                <View style={styles.slotRow}>
                    <Ionicons name="calendar-outline" size={18} color={primaryFill} />
                    <RNText style={[styles.slotText, { color: colors.foreground }]}>
                        {formatMeetupSlot(scheduledAt)}
                    </RNText>
                </View>
            ) : null}

            {confirmBy ? (
                <RNText style={[styles.deadline, { color: colors.mutedForeground }]}>
                    Confirm by {formatConfirmBy(confirmBy)}
                </RNText>
            ) : null}

            {bodyCopy ? (
                <RNText style={[styles.paymentBody, { color: colors.mutedForeground }]}>{bodyCopy}</RNText>
            ) : null}

            <RNText style={[styles.partnerLine, { color: colors.mutedForeground }]}>{partnerLine}</RNText>

            {statusBanner}

            {viewerSlotConfirmed || paymentPhase === 'paid_waiting' || paymentPhase === 'both_paid' ? (
                confirmedBlock
            ) : (
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={primaryCtaLabel}
                    disabled={!canAct}
                    onPress={handlePrimaryAction}
                    style={({ pressed }) => [
                        styles.confirmPill,
                        {
                            borderColor: primaryFill,
                            backgroundColor: paymentsEnabled ? primaryFill : 'transparent',
                            opacity: !canAct ? 0.5 : pressed ? 0.85 : 1,
                        },
                    ]}
                >
                    <RNText
                        style={[
                            styles.confirmLabel,
                            {
                                color: paymentsEnabled ? '#FFFFFF' : primaryFill,
                            },
                        ]}
                    >
                        {primaryCtaLabel}
                    </RNText>
                </Pressable>
            )}

            {!confirmWindowOpen && !viewerSlotConfirmed ? (
                <RNText style={[styles.closedCopy, { color: colors.destructive }]}>
                    The confirmation window has closed.
                </RNText>
            ) : null}

            {creditBlock}

            <MeetupRescheduleSection
                layout="inline"
                mutualMatchId={mutualMatchId}
                dateMatchId={dateMatchId}
                partnerFirstName={partnerFirstName}
                viewerSlotConfirmed={viewerSlotConfirmed}
                reschedule={reschedule}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: RADIUS.md,
        borderWidth: StyleSheet.hairlineWidth,
        padding: SPACING.base,
        gap: SPACING.compact,
    },
    modalPanel: {
        width: '100%',
        borderRadius: RADIUS.lg,
        borderWidth: StyleSheet.hairlineWidth,
        padding: SPACING.comfortable,
        gap: SPACING.section,
        alignItems: 'center',
    },
    modalBody: {
        width: '100%',
        alignItems: 'center',
        gap: SPACING.compact,
    },
    modalSlotHero: {
        width: '100%',
        alignItems: 'center',
        gap: SPACING.tight,
        paddingVertical: SPACING.section,
        paddingHorizontal: SPACING.base,
        borderRadius: RADIUS.md,
    },
    modalSlotText: {
        ...TYPOGRAPHY.title,
        textAlign: 'center',
    },
    modalDeadline: {
        ...TYPOGRAPHY.caption,
        textAlign: 'center',
        fontWeight: '600',
    },
    modalVenueCopy: {
        ...TYPOGRAPHY.caption,
        textAlign: 'center',
        paddingHorizontal: SPACING.tight,
    },
    paymentBody: {
        ...TYPOGRAPHY.caption,
        textAlign: 'center',
        lineHeight: 18,
    },
    modalPartnerLine: {
        ...TYPOGRAPHY.caption,
        textAlign: 'center',
    },
    modalClosedCopy: {
        textAlign: 'center',
    },
    modalConfirmButton: {
        width: '100%',
        minHeight: 52,
        borderRadius: RADIUS.lg,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SPACING.base,
    },
    inlinePrimaryButton: {
        alignSelf: 'stretch',
        minHeight: 48,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SPACING.base,
    },
    primaryButtonLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    buttonDisabled: {
        opacity: 0.45,
    },
    title: {
        fontSize: 17,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    windowsCopy: {
        fontSize: 13,
        lineHeight: 18,
    },
    slotRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.tight,
    },
    slotText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        lineHeight: 20,
    },
    deadline: {
        fontSize: 13,
        lineHeight: 18,
    },
    partnerLine: {
        fontSize: 13,
        lineHeight: 18,
    },
    confirmPill: {
        alignSelf: 'stretch',
        minHeight: 44,
        borderRadius: RADIUS.md,
        borderWidth: 1.5,
        paddingHorizontal: SPACING.base,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmLabel: {
        fontSize: 15,
        fontWeight: '700',
    },
    confirmedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: RADIUS.full,
        borderWidth: StyleSheet.hairlineWidth,
    },
    confirmedBadgeModal: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'stretch',
        justifyContent: 'center',
        minHeight: 52,
        borderRadius: RADIUS.md,
        borderWidth: StyleSheet.hairlineWidth,
    },
    confirmedLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    closedCopy: {
        fontSize: 13,
        lineHeight: 18,
    },
});
