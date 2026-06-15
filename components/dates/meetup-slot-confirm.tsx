import React from 'react';
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

import { useTheme } from '@/hooks/use-theme';
import { useMeetupSlotConfirmController } from '@/hooks/use-meetup-slot-confirm-controller';
import { PaymentCreditActions } from '@/components/dates/payment-credit-actions';
import { ConfirmationBalancePill } from '@/components/dates/confirmation-balance-pill';
import { PaymentStatusBanner } from '@/components/dates/payment-status-banner';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { getGhostSafetyLine } from '@/lib/confirmation-copy';
import { MeetupRescheduleAfterConfirmHint } from '@/components/dates/meetup-reschedule-after-confirm-hint';
import { MeetupRescheduleSection } from '@/components/dates/meetup-reschedule-section';
import { formatConfirmBy, formatMeetupSlot, MEETUP_WINDOWS_COPY } from '@/lib/meetup-slot';
import type { RescheduleViewerState } from '@/lib/reschedule-types';

export type MeetupSlotConfirmController = ReturnType<typeof useMeetupSlotConfirmController>;

export interface MeetupSlotConfirmContentProps {
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
    hidePrimaryCta?: boolean;
    controller: MeetupSlotConfirmController;
    style?: StyleProp<ViewStyle>;
}

export interface MeetupSlotConfirmProps extends Omit<MeetupSlotConfirmContentProps, 'controller'> {
    controller?: MeetupSlotConfirmController;
}

export function MeetupSlotConfirmContent({
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
    hidePrimaryCta = false,
    controller,
    style,
}: MeetupSlotConfirmContentProps) {
    const { colors } = useTheme();
    const primaryFill = colors.primary;
    const isModal = layout === 'modal';

    const {
        paymentsEnabled,
        canConfirmWithBalance,
        confirmationBalance,
        paymentCopy,
        canAct,
        showConfirmedState,
        partnerLine,
        primaryCtaLabel,
        handlePrimaryAction,
        handleCreditApplied,
    } = controller;

    const bodyCopy = paymentsEnabled && paymentCopy.body ? paymentCopy.body : null;
    const fairUseLine =
        paymentsEnabled && paymentCopy.fairUseLine && !isModal ? paymentCopy.fairUseLine : null;
    const ghostSafetyLine =
        paymentsEnabled && isModal && !hidePrimaryCta && !showConfirmedState && canAct
            ? getGhostSafetyLine(partnerFirstName)
            : null;

    const balancePill =
        paymentsEnabled && confirmationBalance.total > 0 && !(isModal && hidePrimaryCta) ? (
            <ConfirmationBalancePill balance={confirmationBalance} />
        ) : null;

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
        dateMatchId && paymentsEnabled && !canConfirmWithBalance && !(isModal && hidePrimaryCta) ? (
            <PaymentCreditActions
                dateMatchId={dateMatchId}
                onCreditApplied={handleCreditApplied}
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
            <View style={[styles.modalPanel, style]}>
                <View style={styles.modalBody}>
                    {balancePill}

                    {scheduledAt ? (
                        <View style={styles.modalSlotRow}>
                            <Ionicons name="calendar-outline" size={20} color={primaryFill} />
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

                    {!scheduledAt ? (
                        <RNText style={[styles.modalVenueCopy, { color: colors.mutedForeground }]}>
                            {MEETUP_WINDOWS_COPY}
                        </RNText>
                    ) : null}

                    {bodyCopy && !hidePrimaryCta ? (
                        <RNText style={[styles.paymentBody, { color: colors.mutedForeground }]}>
                            {bodyCopy}
                        </RNText>
                    ) : null}

                    {!hidePrimaryCta ? (
                        <RNText style={[styles.modalPartnerLine, { color: colors.mutedForeground }]}>
                            {partnerLine}
                        </RNText>
                    ) : null}

                    {ghostSafetyLine ? (
                        <RNText style={[styles.ghostSafetyLine, { color: colors.mutedForeground }]}>
                            {ghostSafetyLine}
                        </RNText>
                    ) : null}

                    <MeetupRescheduleAfterConfirmHint
                        layout="modal"
                        reschedule={reschedule}
                        viewerSlotConfirmed={viewerSlotConfirmed}
                        confirmWindowOpen={confirmWindowOpen}
                    />

                    {statusBanner}

                    {!confirmWindowOpen && !viewerSlotConfirmed ? (
                        <RNText
                            style={[styles.closedCopy, styles.modalClosedCopy, { color: colors.destructive }]}
                        >
                            The confirmation window has closed.
                        </RNText>
                    ) : null}
                </View>

                {!hidePrimaryCta
                    ? showConfirmedState
                        ? confirmedBlock
                        : primaryButton
                    : showConfirmedState
                      ? confirmedBlock
                      : null}

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
            <RNText style={[styles.title, { color: colors.foreground }]}>Confirm your match</RNText>

            {balancePill}

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

            {!scheduledAt ? (
                <RNText style={[styles.windowsCopy, { color: colors.mutedForeground }]}>
                    {MEETUP_WINDOWS_COPY}
                </RNText>
            ) : null}

            {bodyCopy ? (
                <RNText style={[styles.paymentBody, { color: colors.mutedForeground }]}>{bodyCopy}</RNText>
            ) : null}

            <RNText style={[styles.partnerLine, { color: colors.mutedForeground }]}>{partnerLine}</RNText>

            {fairUseLine ? (
                <RNText style={[styles.fairUseLine, { color: colors.mutedForeground }]}>
                    {fairUseLine}
                </RNText>
            ) : null}

            <MeetupRescheduleAfterConfirmHint
                layout="inline"
                reschedule={reschedule}
                viewerSlotConfirmed={viewerSlotConfirmed}
                confirmWindowOpen={confirmWindowOpen}
            />

            {statusBanner}

            {showConfirmedState ? (
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

export function MeetupSlotConfirm({
    controller: externalController,
    partnerSlotConfirmed,
    ...contentProps
}: MeetupSlotConfirmProps) {
    const internalController = useMeetupSlotConfirmController({
        mutualMatchId: contentProps.mutualMatchId,
        dateMatchId: contentProps.dateMatchId,
        partnerFirstName: contentProps.partnerFirstName,
        viewerSlotConfirmed: contentProps.viewerSlotConfirmed,
        partnerSlotConfirmed,
        confirmWindowOpen: contentProps.confirmWindowOpen,
    });

    return (
        <MeetupSlotConfirmContent
            {...contentProps}
            partnerSlotConfirmed={partnerSlotConfirmed}
            controller={externalController ?? internalController}
        />
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
        gap: SPACING.tight,
        alignItems: 'center',
    },
    modalBody: {
        width: '100%',
        alignItems: 'center',
        gap: SPACING.micro,
    },
    modalSlotRow: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.tight,
        paddingVertical: SPACING.micro,
    },
    modalSlotText: {
        ...TYPOGRAPHY.title,
        fontWeight: '700',
        textAlign: 'center',
        letterSpacing: -0.3,
    },
    modalDeadline: {
        ...TYPOGRAPHY.caption,
        fontSize: 12,
        textAlign: 'center',
        fontWeight: '500',
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
    ghostSafetyLine: {
        ...TYPOGRAPHY.caption,
        textAlign: 'center',
        fontWeight: '600',
        lineHeight: 18,
        paddingHorizontal: SPACING.tight,
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
    fairUseLine: {
        ...TYPOGRAPHY.caption,
        textAlign: 'center',
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
