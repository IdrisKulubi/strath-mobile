import React, { useMemo, useState } from 'react';
import { Modal, StyleSheet, Text as RNText, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { CachedImage } from '@/components/ui/cached-image';
import { CancelHoldSheet } from '@/components/home/cancel-hold-sheet';
import { useTheme } from '@/hooks/use-theme';
import { useMeetupSlotConfirmController } from '@/hooks/use-meetup-slot-confirm-controller';
import { MeetupSlotConfirmContent } from '@/components/dates/meetup-slot-confirm';
import { ConfirmMatchWhySection } from '@/components/dates/confirm-match-why-section';
import {
    getConfirmMatchHeaderSubtitle,
    getGhostSafetyLine,
    mapPaymentPhaseToHeaderPhase,
} from '@/lib/confirmation-copy';
import { SPACING, RADIUS, TYPOGRAPHY } from '@/lib/design-tokens';
import {
    type MatchHold,
    type MatchHoldCancelReason,
    useCancelMatchHold,
} from '@/hooks/use-daily-matches';
import { usePaymentStatus } from '@/hooks/use-payment-status';
import { usePaymentsEnabled } from '@/hooks/use-payments-enabled';
import { useToast } from '@/components/ui/toast';
import { formatPaymentAmount } from '@/lib/payment-ui';

interface MeetupSlotConfirmModalProps {
    visible: boolean;
    hold: MatchHold;
    /** Called after the user confirms cancellation with a reason */
    onCancelHold?: () => void;
}

export function MeetupSlotConfirmModal({
    visible,
    hold,
    onCancelHold,
}: MeetupSlotConfirmModalProps) {
    const { colors } = useTheme();
    const toast = useToast();
    const cancelHold = useCancelMatchHold();
    const [showCancelSheet, setShowCancelSheet] = useState(false);
    const partnerName = hold.partner.firstName ?? 'your match';
    const slot = hold.slotConfirmation;

    const { paymentsEnabled } = usePaymentsEnabled();
    const { data: paymentStatus } = usePaymentStatus(hold.dateMatchId ?? null);

    const paidCreditNote = useMemo(() => {
        if (!paymentsEnabled) {
            return null;
        }
        if (paymentStatus?.confirmationBalance && paymentStatus.confirmationBalance.reserved > 0) {
            return 'If they do not confirm in time, your confirmation stays unused.';
        }
        if (paymentStatus?.currentUserPaid) {
            const amountLabel = formatPaymentAmount(
                paymentStatus.amount ?? 499,
                paymentStatus.currency ?? 'KES',
            );
            return `If you cancel, your ${amountLabel} pack balance stays on your account.`;
        }
        return null;
    }, [paymentsEnabled, paymentStatus]);

    const handleCancelConfirm = (reason: MatchHoldCancelReason) => {
        cancelHold.mutate(
            { mutualMatchId: hold.mutualMatchId, reason, notes: null },
            {
                onSuccess: (data) => {
                    setShowCancelSheet(false);
                    if (data.credited && data.creditAmountCents != null) {
                        const amountLabel = formatPaymentAmount(
                            data.creditAmountCents / 100,
                            paymentStatus?.currency ?? 'KES',
                        );
                        toast.show({
                            message: `Cancelled. ${amountLabel} saved as your StrathSpace credit.`,
                            variant: 'success',
                        });
                    } else {
                        toast.show({
                            message: 'Cancelled — we will keep matching you.',
                            variant: 'success',
                        });
                    }
                    onCancelHold?.();
                },
                onError: () => {
                    toast.show({
                        message: 'Could not cancel right now. Please try again.',
                        variant: 'danger',
                    });
                },
            },
        );
    };

    const controller = useMeetupSlotConfirmController({
        mutualMatchId: hold.mutualMatchId,
        dateMatchId: hold.dateMatchId,
        partnerFirstName: partnerName,
        viewerSlotConfirmed: slot.viewerSlotConfirmed,
        partnerSlotConfirmed: slot.partnerSlotConfirmed,
        confirmWindowOpen: slot.confirmWindowOpen,
    });

    const {
        paymentPhase,
        amountLabel,
        canAct,
        showConfirmedState,
        showWhySection,
        showGhostSafetyLine: shouldShowGhostSafetyLine,
        primaryCtaLabel,
        handlePrimaryAction,
    } = controller;

    const headerSubtitle = getConfirmMatchHeaderSubtitle(
        partnerName,
        amountLabel,
        mapPaymentPhaseToHeaderPhase(paymentPhase, paymentsEnabled),
    );

    const showFooterPrimary = !showConfirmedState && canAct;
    const ghostSafetyLine = shouldShowGhostSafetyLine ? getGhostSafetyLine(partnerName) : null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={() => {}}
        >
            <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
                <SafeAreaView
                    edges={['top', 'bottom', 'left', 'right']}
                    style={[styles.screen, { backgroundColor: colors.background }]}
                >
                    <View style={styles.main}>
                        <View style={styles.content}>
                        <View style={styles.partnerHero}>
                            <View style={[styles.avatarWrap, { borderColor: colors.border }]}>
                                {hold.partner.profilePhoto ? (
                                    <CachedImage uri={hold.partner.profilePhoto} style={styles.avatar} />
                                ) : (
                                    <View style={[styles.avatarFallback, { backgroundColor: colors.muted }]}>
                                        <Ionicons name="person" size={32} color={colors.mutedForeground} />
                                    </View>
                                )}
                            </View>
                            <Text style={[styles.partnerName, { color: colors.foreground }]}>
                                {partnerName}
                                {hold.partner.age ? `, ${hold.partner.age}` : ''}
                            </Text>
                        </View>

                        <View style={styles.header}>
                            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
                                Confirm your date with {partnerName}
                            </Text>
                            <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
                                {headerSubtitle}
                            </Text>
                        </View>

                        {showWhySection ? (
                            <ConfirmMatchWhySection partnerFirstName={partnerName} layout="modal" variant="flat" />
                        ) : null}

                        <MeetupSlotConfirmContent
                            layout="modal"
                            hidePrimaryCta
                            controller={controller}
                            mutualMatchId={hold.mutualMatchId}
                            dateMatchId={hold.dateMatchId}
                            partnerFirstName={partnerName}
                            scheduledAt={slot.scheduledAt}
                            confirmBy={slot.confirmBy}
                            viewerSlotConfirmed={slot.viewerSlotConfirmed}
                            partnerSlotConfirmed={slot.partnerSlotConfirmed}
                            confirmWindowOpen={slot.confirmWindowOpen}
                            reschedule={slot.reschedule}
                            style={styles.slotBlock}
                        />
                    </View>
                </View>

                <View style={[styles.footer, { backgroundColor: colors.background }]}>
                    {showConfirmedState ? (
                        <View
                            style={[
                                styles.confirmedFooter,
                                { borderColor: colors.border, backgroundColor: colors.card },
                            ]}
                        >
                            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                            <RNText style={[styles.confirmedFooterLabel, { color: colors.foreground }]}>
                                You confirmed
                            </RNText>
                        </View>
                    ) : showFooterPrimary ? (
                        <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel={primaryCtaLabel}
                            activeOpacity={0.88}
                            disabled={!canAct}
                            onPress={handlePrimaryAction}
                        >
                            <View
                                style={[
                                    styles.primaryButton,
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
                    ) : null}

                    {ghostSafetyLine ? (
                        <RNText style={[styles.ghostSafetyLine, { color: colors.mutedForeground }]}>
                            {ghostSafetyLine}
                        </RNText>
                    ) : null}

                    <TouchableOpacity
                        onPress={() => setShowCancelSheet(true)}
                        accessibilityRole="button"
                        accessibilityLabel="Cancel this match"
                        activeOpacity={0.7}
                        hitSlop={{ top: 12, bottom: 12, left: 24, right: 24 }}
                        style={styles.cancelLinkWrap}
                    >
                        <RNText style={[styles.cancelLink, { color: colors.mutedForeground }]}>
                            Cancel this match
                        </RNText>
                    </TouchableOpacity>
                </View>
                </SafeAreaView>

                <CancelHoldSheet
                    visible={showCancelSheet}
                    partnerName={partnerName}
                    isSubmitting={cancelHold.isPending}
                    paidCreditNote={paidCreditNote}
                    onClose={() => setShowCancelSheet(false)}
                    onConfirm={handleCancelConfirm}
                />
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalRoot: {
        flex: 1,
    },
    screen: {
        flex: 1,
    },
    main: {
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        paddingHorizontal: SPACING.screenX,
        paddingTop: SPACING.compact,
    },
    content: {
        flex: 1,
        minHeight: 0,
        alignItems: 'center',
        justifyContent: 'space-evenly',
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
        paddingVertical: SPACING.tight,
    },
    slotBlock: {
        marginTop: 0,
    },
    header: {
        alignItems: 'center',
        gap: SPACING.micro,
        paddingHorizontal: SPACING.compact,
    },
    headerTitle: {
        ...TYPOGRAPHY.title,
        textAlign: 'center',
        letterSpacing: -0.3,
        fontWeight: '700',
    },
    headerSubtitle: {
        ...TYPOGRAPHY.caption,
        textAlign: 'center',
        lineHeight: 20,
        maxWidth: 320,
    },
    partnerHero: {
        alignItems: 'center',
        gap: SPACING.micro,
        paddingHorizontal: SPACING.compact,
        width: '100%',
    },
    avatarWrap: {
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    avatarFallback: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    partnerName: {
        ...TYPOGRAPHY.callout,
        fontWeight: '600',
        textAlign: 'center',
    },
    footer: {
        flexShrink: 0,
        paddingHorizontal: SPACING.screenX,
        paddingTop: SPACING.compact,
        paddingBottom: SPACING.base,
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
        gap: SPACING.tight,
        zIndex: 10,
        elevation: 10,
    },
    primaryButton: {
        width: '100%',
        minHeight: 52,
        borderRadius: RADIUS.lg,
        borderWidth: 2,
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
    ghostSafetyLine: {
        ...TYPOGRAPHY.caption,
        textAlign: 'center',
        fontWeight: '600',
        lineHeight: 18,
        paddingHorizontal: SPACING.tight,
    },
    confirmedFooter: {
        width: '100%',
        minHeight: 52,
        borderRadius: RADIUS.lg,
        borderWidth: StyleSheet.hairlineWidth,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    confirmedFooterLabel: {
        fontSize: 16,
        fontWeight: '600',
    },
    cancelLinkWrap: {
        alignSelf: 'stretch',
        alignItems: 'center',
        paddingVertical: SPACING.compact,
        paddingHorizontal: SPACING.base,
        minHeight: 48,
        justifyContent: 'center',
    },
    cancelLink: {
        ...TYPOGRAPHY.caption,
        fontWeight: '600',
        textAlign: 'center',
        textDecorationLine: 'underline',
    },
});
