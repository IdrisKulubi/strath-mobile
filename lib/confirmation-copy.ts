import type { ConfirmationBalance } from '@/hooks/use-payment-status';

export function formatPackAmount(amount: number, currency = 'KES'): string {
    const code = currency.toUpperCase() === 'KES' ? 'KSh' : currency;
    return `${code} ${amount}`;
}

export function getBalanceLabel(count: number): string {
    if (count === 1) {
        return '1 date confirmation left';
    }
    return `${count} date confirmations`;
}

export function getBalancePillText(balance: ConfirmationBalance): {
    primary: string;
    secondary: string | null;
} {
    if (balance.total <= 0) {
        return { primary: '', secondary: null };
    }

    const availableLabel =
        balance.available === 1
            ? '1 confirmation available'
            : `${balance.available} confirmations available`;

    if (balance.reserved > 0 && balance.available > 0) {
        return {
            primary: getBalanceLabel(balance.total),
            secondary: `${balance.reserved} reserved for this match`,
        };
    }

    if (balance.reserved > 0) {
        return {
            primary: '1 confirmation reserved',
            secondary: 'For this match',
        };
    }

    return {
        primary: getBalanceLabel(balance.available),
        secondary: null,
    };
}

export const PACK_FAIR_USE_LINE =
    'Your Date Setup Fee is only used when you both confirm.';

export const PACK_INTRO_BODY =
    'You both showed interest. Confirm before we set up your date.';

export const CONFIRM_MATCH_WHY_TEASER =
    'Verified students only. The Date Setup Fee keeps matches serious.';

export const PACK_DATE_COUNT = 2;

export const DATE_SETUP_FEE_LABEL = 'Date Setup Fee';

export type ConfirmMatchWhyBulletIcon = 'shield-checkmark' | 'heart' | 'refresh';

export interface ConfirmMatchWhyBullet {
    icon: ConfirmMatchWhyBulletIcon;
    title: string;
    body: string;
}

export function getPayCtaLabel(amountLabel: string): string {
    return `Pay ${amountLabel} · ${PACK_DATE_COUNT} dates`;
}

export function getConfirmMatchWhyBullets(_partnerFirstName: string): ConfirmMatchWhyBullet[] {
    return [
        {
            icon: 'shield-checkmark',
            title: 'Verified profiles',
            body: 'Everyone on StrathSpace passes face verification. No fake profiles.',
        },
        {
            icon: 'heart',
            title: 'Real intent',
            body: 'The Date Setup Fee shows you are serious. It cuts ghosting and time-wasters,If they do not confirm your money will remain for the next date ',
        },
    ];
}

export type ConfirmMatchHeaderPhase =
    | 'awaiting_payment'
    | 'has_balance'
    | 'waiting_partner'
    | 'both_confirmed'
    | 'expired'
    | 'free';

export function getConfirmMatchHeaderSubtitle(
    partnerFirstName: string,
    amountLabel: string,
    phase: ConfirmMatchHeaderPhase,
): string {
    const partner = partnerFirstName || 'your match';

    switch (phase) {
        case 'has_balance':
            return `You and ${partner} both said yes. Your Date Setup Fee is already paid. Confirm below to lock in your date.`;
        case 'waiting_partner':
            return `You confirmed with ${partner}. We'll notify you when they confirm too.`;
        case 'both_confirmed':
            return `You and ${partner} are both confirmed. We're arranging your date now.`;
        case 'expired':
            return 'This match expired. New intros refresh soon.';
        case 'free':
            return `You and ${partner} both said yes. Confirm your assigned time to continue.`;
        case 'awaiting_payment':
        default:
            return `You and ${partner} both said yes. One ${amountLabel} Date Setup Fee covers ${PACK_DATE_COUNT} dates.`;
    }
}

export function getGhostSafetyLine(partnerFirstName: string): string {
    const partner = partnerFirstName || 'they';
    return `If ${partner} does not confirm in time, your Date Setup Fee is not used.`;
}

export function getPackPaymentBody(amountLabel: string): string {
    return `One ${amountLabel} Date Setup Fee covers ${PACK_DATE_COUNT} dates.`;
}

export function mapPaymentPhaseToHeaderPhase(
    paymentPhase: string,
    paymentsEnabled: boolean,
): ConfirmMatchHeaderPhase {
    if (!paymentsEnabled) {
        return 'free';
    }

    switch (paymentPhase) {
        case 'has_balance_confirm':
            return 'has_balance';
        case 'paid_waiting':
            return 'waiting_partner';
        case 'both_paid':
            return 'both_confirmed';
        case 'expired_unpaid':
        case 'expired_refund_choice':
        case 'expired_restored':
            return 'expired';
        default:
            return 'awaiting_payment';
    }
}

export type ConfirmToastOutcome =
    | 'finalized'
    | 'paid_waiting'
    | 'confirmed'
    | 'cancelled'
    | 'unpaid'
    | 'pack_purchased'
    | 'balance_confirmed'
    | 'expired_restored';

export function getConfirmToastMessage(
    outcome: ConfirmToastOutcome,
    partnerFirstName: string,
    balance?: ConfirmationBalance,
): string {
    switch (outcome) {
        case 'finalized':
            return 'Date confirmed. See you on campus.';
        case 'pack_purchased':
            return `Date Setup Fee paid. Covers ${PACK_DATE_COUNT} dates. 1 is reserved for this match.`;
        case 'balance_confirmed': {
            const left = balance?.available ?? 0;
            if (left === 1) {
                return 'Match confirmed. 1 date left on your pack.';
            }
            if (left > 1) {
                return `Match confirmed. ${left} dates left on your pack.`;
            }
            return `You confirmed. Waiting for ${partnerFirstName}.`;
        }
        case 'paid_waiting':
            return `You confirmed. Waiting for ${partnerFirstName}.`;
        case 'confirmed':
            return `Waiting for ${partnerFirstName} to confirm.`;
        case 'expired_restored':
            return 'Match expired. Your Date Setup Fee was not used.';
        case 'cancelled':
        case 'unpaid':
            return 'Payment was not completed. Your date is still pending.';
        default:
            return `Waiting for ${partnerFirstName} to confirm.`;
    }
}
