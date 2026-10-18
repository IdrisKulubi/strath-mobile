import type { RescheduleRequestBlockReason } from '@/lib/reschedule-types';

const REQUEST_REASON_MESSAGES: Record<RescheduleRequestBlockReason, string> = {
    feature_disabled: 'Date changes are not available right now.',
    not_participant: 'You do not belong to this match.',
    match_closed: 'This match is no longer active.',
    date_passed: 'This date has already passed.',
    confirm_first: 'Confirm your date before requesting a change.',
    payment_required: 'Complete payment to confirm before requesting a change.',
    pending_exists: 'You already have a pending date change request.',
};

const RESPOND_REASON_MESSAGES: Record<string, string> = {
    not_found: 'That request is no longer available.',
    not_participant: 'You do not belong to this match.',
    not_pending: 'This request is no longer pending.',
    not_your_turn: 'It is not your turn to respond.',
    confirm_window_closed: 'The confirmation window for this proposal has closed.',
    invalid_slot: 'That time is no longer available. Pick another slot.',
    counter_cap_reached:
        "You've reached the limit of counter-proposals. Accept the time or cancel this match.",
    reason_required: 'Please share why this time does not work.',
    feature_disabled: 'Date changes are not available right now.',
};

export function messageForRescheduleRequestReason(reason: string): string {
    return REQUEST_REASON_MESSAGES[reason as RescheduleRequestBlockReason] ?? 'Could not request a date change.';
}

export function messageForRescheduleRespondReason(reason: string): string {
    return RESPOND_REASON_MESSAGES[reason] ?? 'Could not update your date.';
}
