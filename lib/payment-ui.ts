import type { ConfirmationBalance, PaymentStatusData } from '@/hooks/use-payment-status';
import {
    formatPackAmount,
    getPackPaymentBody,
    getPayCtaLabel,
    PACK_FAIR_USE_LINE,
    PACK_INTRO_BODY,
} from '@/lib/confirmation-copy';

export type PaymentUiPhase =
    | 'has_balance_confirm'
    | 'awaiting_pack_payment'
    | 'awaiting_payment'
    | 'paid_waiting'
    | 'partner_paid_you_havent'
    | 'both_paid'
    | 'expired_unpaid'
    | 'expired_refund_choice'
    | 'expired_restored'
    | 'free_confirm';

export function formatPaymentAmount(amount: number, currency: string): string {
    return formatPackAmount(amount, currency);
}

export function resolvePaymentUiPhase(input: {
    paymentsEnabled: boolean;
    paymentStatus: PaymentStatusData | null | undefined;
    viewerSlotConfirmed: boolean;
    partnerSlotConfirmed: boolean;
}): PaymentUiPhase {
    if (!input.paymentsEnabled) {
        return 'free_confirm';
    }

    const status = input.paymentStatus;
    const balance: ConfirmationBalance = status?.confirmationBalance ?? {
        available: 0,
        reserved: 0,
        total: 0,
    };

    if (!status) {
        if (input.viewerSlotConfirmed) {
            return 'paid_waiting';
        }
        return balance.available >= 1 ? 'has_balance_confirm' : 'awaiting_pack_payment';
    }

    if (status.paymentState === 'expired' || status.paymentState === 'cancelled') {
        if (status.canChooseRefund) {
            return 'expired_refund_choice';
        }
        if (
            input.viewerSlotConfirmed
            || status.currentUserPaid
            || balance.total > 0
        ) {
            return 'expired_restored';
        }
        return 'expired_unpaid';
    }

    if (status.paymentState === 'both_paid' || (status.currentUserPaid && status.otherUserPaid)) {
        return 'both_paid';
    }

    if (input.viewerSlotConfirmed || status.currentUserPaid) {
        return 'paid_waiting';
    }

    if (status.otherUserPaid && !status.currentUserPaid) {
        return status.canConfirmWithBalance ? 'has_balance_confirm' : 'partner_paid_you_havent';
    }

    if (status.canConfirmWithBalance) {
        return 'has_balance_confirm';
    }

    return 'awaiting_pack_payment';
}

export function phaseRequiresPayment(phase: PaymentUiPhase): boolean {
    return phase === 'awaiting_pack_payment'
        || phase === 'awaiting_payment'
        || phase === 'partner_paid_you_havent';
}

export function phaseUsesBalanceConfirm(phase: PaymentUiPhase): boolean {
    return phase === 'has_balance_confirm';
}

export function getPaymentUiCopy(
    phase: PaymentUiPhase,
    partnerFirstName: string,
    amountLabel: string,
    balance?: ConfirmationBalance,
): {
    body: string;
    partnerLine: string;
    primaryCta: string | null;
    showPrimaryCta: boolean;
    fairUseLine: string | null;
} {
    const fairUseLine = PACK_FAIR_USE_LINE;

    switch (phase) {
        case 'has_balance_confirm':
            return {
                body:
                    balance && balance.available >= 1
                        ? 'Your Date Setup Fee is already covered. Tap below to confirm this match.'
                        : PACK_INTRO_BODY,
                partnerLine: partnerFirstName
                    ? `Confirm your assigned time with ${partnerFirstName}.`
                    : 'Confirm your assigned campus date.',
                primaryCta: 'Confirm match',
                showPrimaryCta: true,
                fairUseLine,
            };
        case 'awaiting_pack_payment':
            return {
                body: getPackPaymentBody(amountLabel),
                partnerLine: partnerFirstName
                    ? `Confirm your assigned time with ${partnerFirstName}.`
                    : 'Confirm your assigned campus date.',
                primaryCta: getPayCtaLabel(amountLabel),
                showPrimaryCta: true,
                fairUseLine,
            };
        case 'both_paid':
            return {
                body: "You're both confirmed. We're arranging this one for you.",
                partnerLine: 'You both confirmed.',
                primaryCta: null,
                showPrimaryCta: false,
                fairUseLine: null,
            };
        case 'paid_waiting':
            return {
                body: `You confirmed. Waiting for ${partnerFirstName} to confirm.`,
                partnerLine: `Waiting for ${partnerFirstName} to confirm.`,
                primaryCta: null,
                showPrimaryCta: false,
                fairUseLine: null,
            };
        case 'partner_paid_you_havent':
            return {
                body: `${partnerFirstName} confirmed. Pay ${amountLabel} once as your Date Setup Fee.`,
                partnerLine: `${partnerFirstName} confirmed. Your turn to lock in.`,
                primaryCta: getPayCtaLabel(amountLabel),
                showPrimaryCta: true,
                fairUseLine,
            };
        case 'expired_unpaid':
            return {
                body: 'This match expired. New intros refresh soon.',
                partnerLine: 'The confirmation window has closed.',
                primaryCta: null,
                showPrimaryCta: false,
                fairUseLine: null,
            };
        case 'expired_restored': {
            const left = balance?.available ?? 0;
            const leftLine =
                left > 0
                    ? `You still have ${left === 1 ? '1 date setup' : `${left} date setups`} left.`
                    : 'Your Date Setup Fee was not used.';
            return {
                body: `They did not confirm in time. ${leftLine}`,
                partnerLine: 'The confirmation window has closed.',
                primaryCta: null,
                showPrimaryCta: false,
                fairUseLine: null,
            };
        }
        case 'expired_refund_choice':
            return {
                body: 'This match expired. Choose what to do with your payment below.',
                partnerLine: 'The confirmation window has closed.',
                primaryCta: null,
                showPrimaryCta: false,
                fairUseLine: null,
            };
        case 'free_confirm':
            return {
                body: '',
                partnerLine: '',
                primaryCta: 'Confirm date',
                showPrimaryCta: true,
                fairUseLine: null,
            };
        case 'awaiting_payment':
        default:
            return {
                body: getPackPaymentBody(amountLabel),
                partnerLine: partnerFirstName
                    ? `Confirm your assigned time with ${partnerFirstName}.`
                    : 'Confirm your assigned campus date.',
                primaryCta: getPayCtaLabel(amountLabel),
                showPrimaryCta: true,
                fairUseLine,
            };
    }
}
