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
    'A confirmation is only used when you both confirm.';

export const PACK_INTRO_BODY =
    'You both showed interest. Confirm before we set up your date.';

export function getPackPaymentBody(amountLabel: string): string {
    return `${PACK_INTRO_BODY} Pay ${amountLabel} once and get 2 date confirmations.`;
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
            return 'You have 2 date confirmations. 1 is reserved for this match.';
        case 'balance_confirmed': {
            const left = balance?.available ?? 0;
            if (left === 1) {
                return 'Match confirmed. 1 confirmation left for next time.';
            }
            if (left > 1) {
                return `Match confirmed. ${left} confirmations left.`;
            }
            return `You confirmed. Waiting for ${partnerFirstName}.`;
        }
        case 'paid_waiting':
            return `You confirmed. Waiting for ${partnerFirstName}.`;
        case 'confirmed':
            return `Waiting for ${partnerFirstName} to confirm.`;
        case 'expired_restored':
            return 'Match expired. Your confirmation was not used.';
        case 'cancelled':
        case 'unpaid':
            return 'Payment was not completed. Your date is still pending.';
        default:
            return `Waiting for ${partnerFirstName} to confirm.`;
    }
}
