import type { PaymentStatusData } from '@/hooks/use-payment-status';

export type PaymentUiPhase =
    | 'awaiting_payment'
    | 'paid_waiting'
    | 'partner_paid_you_havent'
    | 'both_paid'
    | 'expired_unpaid'
    | 'expired_refund_choice'
    | 'free_confirm';

export function formatPaymentAmount(amount: number, currency: string): string {
    if (currency.toUpperCase() === 'KES') {
        return `KES ${amount}`;
    }
    return `${currency} ${amount}`;
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
    if (!status) {
        return input.viewerSlotConfirmed ? 'paid_waiting' : 'awaiting_payment';
    }

    if (status.paymentState === 'expired') {
        return status.canChooseRefund ? 'expired_refund_choice' : 'expired_unpaid';
    }

    if (status.paymentState === 'both_paid' || (status.currentUserPaid && status.otherUserPaid)) {
        return 'both_paid';
    }

    if (status.currentUserPaid) {
        return 'paid_waiting';
    }

    if (status.otherUserPaid && !status.currentUserPaid) {
        return 'partner_paid_you_havent';
    }

    return 'awaiting_payment';
}

export function getPaymentUiCopy(
    phase: PaymentUiPhase,
    partnerFirstName: string,
    amountLabel: string,
): {
    body: string;
    partnerLine: string;
    primaryCta: string | null;
    showPrimaryCta: boolean;
} {
    switch (phase) {
        case 'both_paid':
            return {
                body: 'You are both confirmed. We are arranging this one for you.',
                partnerLine: 'You both confirmed.',
                primaryCta: null,
                showPrimaryCta: false,
            };
        case 'paid_waiting':
            return {
                body: 'You are confirmed. Waiting for the other person to confirm.',
                partnerLine: `Waiting for ${partnerFirstName} to confirm.`,
                primaryCta: null,
                showPrimaryCta: false,
            };
        case 'partner_paid_you_havent':
            return {
                body: `They have confirmed. Pay ${amountLabel} to move forward.`,
                partnerLine: `${partnerFirstName} confirmed. Your turn to lock in.`,
                primaryCta: `Pay ${amountLabel}`,
                showPrimaryCta: true,
            };
        case 'expired_unpaid':
            return {
                body: 'This match expired. New intros refresh soon.',
                partnerLine: 'The confirmation window has closed.',
                primaryCta: null,
                showPrimaryCta: false,
            };
        case 'expired_refund_choice':
            return {
                body: 'This match expired. Choose what to do with your setup fee below.',
                partnerLine: 'The confirmation window has closed.',
                primaryCta: null,
                showPrimaryCta: false,
            };
        case 'free_confirm':
            return {
                body: '',
                partnerLine: '',
                primaryCta: 'Confirm date',
                showPrimaryCta: true,
            };
        case 'awaiting_payment':
        default:
            return {
                body: `Both of you said yes. Confirm your date with a one-time ${amountLabel} setup fee.`,
                partnerLine: partnerFirstName
                    ? `Confirm your assigned time with ${partnerFirstName}.`
                    : 'Confirm your assigned campus date.',
                primaryCta: `Pay ${amountLabel} to confirm`,
                showPrimaryCta: true,
            };
    }
}
