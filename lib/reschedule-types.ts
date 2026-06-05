/** Mirrors backend `RescheduleViewerState` from meetup-reschedule/result-types.ts */

export type RescheduleRequestBlockReason =
    | 'feature_disabled'
    | 'not_participant'
    | 'match_closed'
    | 'date_passed'
    | 'confirm_first'
    | 'payment_required'
    | 'pending_exists';

export type ReschedulePendingState = {
    requestId: string;
    proposedScheduledAt: string;
    proposedConfirmBy: string;
    proposedSlot: 'wednesday' | 'saturday';
    requestedByUserId: string;
    isYourTurnToRespond: boolean;
    counterCount: number;
    lastDeclineReason?: string;
};

export type RescheduleViewerState = {
    canRequest: boolean;
    blockReason?: RescheduleRequestBlockReason;
    pending?: ReschedulePendingState;
};

export type RescheduleSlotOption = {
    slot: 'wednesday' | 'saturday';
    scheduledAt: string;
    confirmBy: string;
    label: string;
};
