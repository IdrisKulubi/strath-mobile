import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { APP_FEATURE_KEYS, isFeatureEnabled } from "@/lib/feature-flags";
import type {
    RescheduleRequestFailReason,
    RescheduleRespondFailReason,
} from "@/lib/meetup-reschedule/result-types";

export async function ensureRescheduleEnabled() {
    const enabled = await isFeatureEnabled(APP_FEATURE_KEYS.rescheduleEnabled, false);
    if (!enabled) {
        return errorResponse(new Error("Reschedule is not available"), 404);
    }
    return null;
}

const REQUEST_REASON_STATUS: Partial<Record<RescheduleRequestFailReason, number>> = {
    not_found: 404,
    not_participant: 403,
    feature_disabled: 404,
};

const REQUEST_REASON_MESSAGE: Record<RescheduleRequestFailReason, string> = {
    feature_disabled: "Reschedule is not available",
    not_participant: "You do not belong to this mutual",
    match_closed: "This match is no longer active",
    date_passed: "This date has already passed",
    confirm_first: "Confirm your date before requesting a change",
    payment_required: "Complete payment to confirm before requesting a change",
    pending_exists: "A date change request is already pending",
    invalid_slot: "That time is not available",
    confirm_window_closed: "The confirmation window for that time has closed",
    not_found: "Mutual match not found",
};

export function rescheduleRequestError(reason: RescheduleRequestFailReason) {
    const status = REQUEST_REASON_STATUS[reason] ?? 400;
    return NextResponse.json({ success: false, reason }, { status });
}

export function rescheduleRequestErrorMessage(reason: RescheduleRequestFailReason) {
    return errorResponse(new Error(REQUEST_REASON_MESSAGE[reason]), REQUEST_REASON_STATUS[reason] ?? 400);
}

const RESPOND_REASON_STATUS: Partial<Record<RescheduleRespondFailReason, number>> = {
    not_found: 404,
    not_participant: 403,
    not_your_turn: 403,
    feature_disabled: 404,
};

const RESPOND_REASON_MESSAGE: Record<RescheduleRespondFailReason, string> = {
    feature_disabled: "Reschedule is not available",
    not_found: "Request not found",
    not_participant: "You do not belong to this mutual",
    not_pending: "This request is no longer pending",
    not_your_turn: "It is not your turn to respond",
    confirm_window_closed: "The confirmation window for this proposal has closed",
    invalid_slot: "That counter-proposal time is not available",
    counter_cap_reached: "Too many counter-proposals — accept the time or cancel the match",
    reason_required: "Please share why this time does not work",
};

export function rescheduleRespondError(reason: RescheduleRespondFailReason) {
    const status = RESPOND_REASON_STATUS[reason] ?? 400;
    return NextResponse.json({ success: false, reason }, { status });
}

export function rescheduleRespondErrorMessage(reason: RescheduleRespondFailReason) {
    return errorResponse(
        new Error(RESPOND_REASON_MESSAGE[reason]),
        RESPOND_REASON_STATUS[reason] ?? 400,
    );
}
