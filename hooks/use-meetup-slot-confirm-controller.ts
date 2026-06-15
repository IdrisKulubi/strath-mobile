import { useMemo } from 'react';
import * as Haptics from 'expo-haptics';

import { useConfirmMeetupSlot } from '@/hooks/use-confirm-meetup-slot';
import { usePayToConfirm } from '@/hooks/use-pay-to-confirm';
import { usePaymentStatus } from '@/hooks/use-payment-status';
import { usePaymentsEnabled } from '@/hooks/use-payments-enabled';
import { useNotificationPermissionPrompt } from '@/context/notification-permission-context';
import { useToast } from '@/components/ui/toast';
import {
    getConfirmToastMessage,
    type ConfirmToastOutcome,
} from '@/lib/confirmation-copy';
import {
    formatPaymentAmount,
    getPaymentUiCopy,
    resolvePaymentUiPhase,
    type PaymentUiPhase,
} from '@/lib/payment-ui';

export interface UseMeetupSlotConfirmControllerInput {
    mutualMatchId: string;
    dateMatchId?: string | null;
    partnerFirstName: string;
    viewerSlotConfirmed: boolean;
    partnerSlotConfirmed: boolean;
    confirmWindowOpen: boolean;
}

export function useMeetupSlotConfirmController({
    mutualMatchId,
    dateMatchId,
    partnerFirstName,
    viewerSlotConfirmed,
    partnerSlotConfirmed,
    confirmWindowOpen,
}: UseMeetupSlotConfirmControllerInput) {
    const toast = useToast();
    const confirm = useConfirmMeetupSlot();
    const payToConfirm = usePayToConfirm();
    const { paymentsEnabled } = usePaymentsEnabled();
    const { data: paymentStatus } = usePaymentStatus(dateMatchId ?? undefined);
    const { promptIfAppropriate } = useNotificationPermissionPrompt();

    const amountLabel = formatPaymentAmount(
        paymentStatus?.amount ?? 499,
        paymentStatus?.currency ?? 'KES',
    );

    const confirmationBalance = paymentStatus?.confirmationBalance ?? {
        available: 0,
        reserved: 0,
        total: 0,
    };
    const canConfirmWithBalance = paymentStatus?.canConfirmWithBalance ?? false;

    const paymentPhase = resolvePaymentUiPhase({
        paymentsEnabled,
        paymentStatus,
        viewerSlotConfirmed,
        partnerSlotConfirmed,
    });

    const paymentCopy = getPaymentUiCopy(
        paymentPhase,
        partnerFirstName,
        amountLabel,
        confirmationBalance,
    );

    const useBalanceConfirm =
        paymentsEnabled && canConfirmWithBalance && !viewerSlotConfirmed;

    const isPending = useBalanceConfirm
        ? confirm.isPending
        : paymentsEnabled
          ? payToConfirm.isPending
          : confirm.isPending;

    const canAct =
        confirmWindowOpen
        && !viewerSlotConfirmed
        && !isPending
        && paymentPhase !== 'expired_unpaid'
        && paymentPhase !== 'expired_refund_choice'
        && paymentPhase !== 'both_paid'
        && paymentPhase !== 'paid_waiting';

    const showConfirmedState =
        viewerSlotConfirmed
        || paymentPhase === 'paid_waiting'
        || paymentPhase === 'both_paid';

    const showWhySection =
        paymentsEnabled
        && !showConfirmedState
        && paymentPhase !== 'expired_unpaid'
        && paymentPhase !== 'expired_refund_choice'
        && paymentPhase !== 'expired_restored';

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

    const showToastForOutcome = async (outcome: ConfirmToastOutcome) => {
        const message = getConfirmToastMessage(outcome, partnerFirstName, confirmationBalance);
        toast.show({
            message,
            variant: outcome === 'finalized' || outcome === 'pack_purchased' ? 'success' : 'default',
        });
        await promptIfAppropriate({
            context: 'after_confirm',
            partnerName: partnerFirstName,
        });
    };

    const handlePrimaryAction = () => {
        if (!canAct) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        if (useBalanceConfirm) {
            confirm.mutate(mutualMatchId, {
                onSuccess: async (data) => {
                    if (data?.status === 'finalized') {
                        await showToastForOutcome('finalized');
                    } else {
                        await showToastForOutcome('balance_confirmed');
                    }
                },
                onError: () => {
                    toast.show({
                        message: 'Could not confirm right now. Try again.',
                        variant: 'danger',
                    });
                },
            });
            return;
        }

        if (paymentsEnabled && dateMatchId) {
            payToConfirm.mutate(
                { mutualMatchId, dateMatchId, partnerFirstName },
                {
                    onSuccess: (result) => {
                        const outcome: ConfirmToastOutcome =
                            result.outcome === 'paid_waiting' && !viewerSlotConfirmed
                                ? 'pack_purchased'
                                : result.outcome;
                        void showToastForOutcome(outcome);
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
            ? useBalanceConfirm
                ? 'Confirming…'
                : 'Opening checkout…'
            : paymentCopy.primaryCta ?? 'Confirm match'
        : isPending
          ? 'Confirming…'
          : 'Confirm date';

    return {
        paymentsEnabled,
        paymentPhase: paymentPhase as PaymentUiPhase,
        paymentStatus,
        confirmationBalance,
        canConfirmWithBalance,
        amountLabel,
        paymentCopy,
        canAct,
        isPending,
        showConfirmedState,
        showWhySection,
        partnerLine,
        primaryCtaLabel,
        handlePrimaryAction,
        handleCreditApplied: () => {
            void showToastForOutcome('paid_waiting');
        },
    };
}
