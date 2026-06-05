import type { MeetupSlotKind } from "@/lib/meetup-reschedule/types";

export const RESCHEDULE_REQUEST_BLOCK_REASONS = [
    "feature_disabled",
    "not_participant",
    "match_closed",
    "date_passed",
    "confirm_first",
    "payment_required",
    "pending_exists",
] as const;

export type RescheduleRequestBlockReason = (typeof RESCHEDULE_REQUEST_BLOCK_REASONS)[number];

export const RESCHEDULE_REQUEST_FAIL_REASONS = [
    ...RESCHEDULE_REQUEST_BLOCK_REASONS,
    "invalid_slot",
    "confirm_window_closed",
    "not_found",
] as const;

export type RescheduleRequestFailReason = (typeof RESCHEDULE_REQUEST_FAIL_REASONS)[number];

export const RESCHEDULE_RESPOND_FAIL_REASONS = [
    "feature_disabled",
    "not_found",
    "not_participant",
    "not_pending",
    "not_your_turn",
    "confirm_window_closed",
    "invalid_slot",
    "counter_cap_reached",
    "reason_required",
] as const;

export type RescheduleRespondFailReason = (typeof RESCHEDULE_RESPOND_FAIL_REASONS)[number];

export type RescheduleViewerState = {
    canRequest: boolean;
    blockReason?: RescheduleRequestBlockReason;
    pending?: {
        requestId: string;
        proposedScheduledAt: string;
        proposedConfirmBy: string;
        proposedSlot: MeetupSlotKind;
        requestedByUserId: string;
        isYourTurnToRespond: boolean;
        counterCount: number;
        lastDeclineReason?: string;
    };
};

export type RequestRescheduleSuccess = {
    ok: true;
    requestId: string;
    proposedScheduledAt: string;
    proposedConfirmBy: string;
    proposedSlot: MeetupSlotKind;
    partnerUserId: string;
};

export type RequestRescheduleResult =
    | RequestRescheduleSuccess
    | { ok: false; reason: RescheduleRequestFailReason };

export type AcceptRescheduleSuccess = {
    ok: true;
    status: "applied";
    scheduledAt: string;
    confirmBy: string;
    proposedSlot: MeetupSlotKind;
    arrangementStatus: string;
    finalized: boolean;
};

export type AcceptRescheduleResult =
    | AcceptRescheduleSuccess
    | { ok: false; reason: RescheduleRespondFailReason };

export type DeclineWithCounterSuccess = {
    ok: true;
    requestId: string;
    proposedScheduledAt: string;
    proposedConfirmBy: string;
    proposedSlot: MeetupSlotKind;
    partnerUserId: string;
};

export type DeclineWithCounterResult =
    | DeclineWithCounterSuccess
    | { ok: false; reason: RescheduleRespondFailReason };

export type CancelPendingRescheduleResult =
    | { ok: true }
    | {
          ok: false;
          reason:
              | "feature_disabled"
              | "not_found"
              | "not_participant"
              | "not_pending"
              | "not_requester";
      };
