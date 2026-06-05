import { and, eq } from "drizzle-orm";
import db from "@/db/drizzle";
import { meetupRescheduleRequests, mutualMatches } from "@/db/schema";
import { APP_FEATURE_KEYS, isFeatureEnabled } from "@/lib/feature-flags";
import type {
    AcceptRescheduleResult,
    CancelPendingRescheduleResult,
    DeclineWithCounterResult,
    RequestRescheduleResult,
    RescheduleRequestBlockReason,
    RescheduleRequestFailReason,
    RescheduleRespondFailReason,
    RescheduleViewerState,
} from "@/lib/meetup-reschedule/result-types";
import {
    countCounterProposalsInChain,
    findMatchingSlotOption,
    getPartnerUserId,
    isClosedMatchStatus,
    isDeclineReasonValid,
    isRescheduleEligibleMatchStatus,
    isScheduledDateInPast,
    isViewerSlotConfirmed,
    MAX_COUNTER_PROPOSALS,
    resolveChainRootId,
} from "@/lib/meetup-reschedule/validation";
import { getPaymentsEnabled } from "@/lib/payments/payment-flags";
import { findUserPaymentForMatch } from "@/lib/payments/payment-repository";
import {
    applyMeetupSlotToMatch,
    buildSlotConfirmationView,
    tryFinalizeConfirmedMeetup,
    type SlotConfirmationView,
} from "@/lib/services/meetup-confirmation-service";
import { shouldRequirePaymentToConfirm } from "@/lib/services/meetup-confirmation-payment";
import {
    sendRescheduleAcceptedPush,
    sendRescheduleCancelledPush,
    sendRescheduleCounteredPush,
    sendRescheduleRequestedPush,
} from "@/lib/services/meetup-reschedule-push";
import {
    formatMeetupSlotForDisplay,
    listUpcomingMeetupSlotOptions,
    type MeetupSlotKind,
} from "@/lib/services/meetup-slot-service";

async function isRescheduleFeatureEnabled(): Promise<boolean> {
    return isFeatureEnabled(APP_FEATURE_KEYS.rescheduleEnabled, false);
}

type MutualRow = typeof mutualMatches.$inferSelect;

function parseProposedScheduledAt(value: Date | string): Date | null {
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

async function loadMutualMatch(mutualMatchId: string): Promise<MutualRow | null> {
    return (
        (await db.query.mutualMatches.findFirst({
            where: eq(mutualMatches.id, mutualMatchId),
        })) ?? null
    );
}

async function loadPendingRequest(requestId: string) {
    return (
        (await db.query.meetupRescheduleRequests.findFirst({
            where: eq(meetupRescheduleRequests.id, requestId),
        })) ?? null
    );
}

async function loadChainRequests(chainRootId: string, mutualMatchId: string) {
    return db.query.meetupRescheduleRequests.findMany({
        where: and(
            eq(meetupRescheduleRequests.mutualMatchId, mutualMatchId),
            eq(meetupRescheduleRequests.chainRootId, chainRootId),
        ),
    });
}

async function viewerPaymentBlocksReschedule(
    row: MutualRow,
    viewerUserId: string,
): Promise<boolean> {
    const paymentsEnabled = await getPaymentsEnabled();
    if (!paymentsEnabled || !row.legacyDateMatchId) return false;

    const userPayment = await findUserPaymentForMatch(row.legacyDateMatchId, viewerUserId);
    return shouldRequirePaymentToConfirm({
        paymentsEnabled: true,
        userPaymentStatus: userPayment?.status,
    });
}

export async function assertCanRequestReschedule(
    mutualMatchId: string,
    userId: string,
    proposedScheduledAt?: Date,
): Promise<{ ok: true } | { ok: false; reason: RescheduleRequestFailReason }> {
    if (!(await isRescheduleFeatureEnabled())) {
        return { ok: false, reason: "feature_disabled" };
    }

    const row = await loadMutualMatch(mutualMatchId);
    if (!row) return { ok: false, reason: "not_found" };

    if (!getPartnerUserId(row, userId)) {
        return { ok: false, reason: "not_participant" };
    }

    if (isClosedMatchStatus(row.status)) {
        return { ok: false, reason: "match_closed" };
    }

    if (!isRescheduleEligibleMatchStatus(row.status)) {
        if (row.status === "upcoming" && isScheduledDateInPast(row.scheduledAt, new Date())) {
            return { ok: false, reason: "date_passed" };
        }
        return { ok: false, reason: "match_closed" };
    }

    if (!isViewerSlotConfirmed(row, userId)) {
        return { ok: false, reason: "confirm_first" };
    }

    if (await viewerPaymentBlocksReschedule(row, userId)) {
        return { ok: false, reason: "payment_required" };
    }

    if (row.pendingRescheduleRequestId) {
        return { ok: false, reason: "pending_exists" };
    }

    if (proposedScheduledAt) {
        const now = new Date();
        const match = findMatchingSlotOption(proposedScheduledAt, now, {
            excludeScheduledAt: row.scheduledAt,
        });
        if (!match) return { ok: false, reason: "invalid_slot" };
        if (match.confirmBy.getTime() <= now.getTime()) {
            return { ok: false, reason: "confirm_window_closed" };
        }
    }

    return { ok: true };
}

export async function requestReschedule(
    mutualMatchId: string,
    userId: string,
    proposedScheduledAtInput: Date | string,
): Promise<RequestRescheduleResult> {
    const proposedScheduledAt = parseProposedScheduledAt(proposedScheduledAtInput);
    if (!proposedScheduledAt) {
        return { ok: false, reason: "invalid_slot" };
    }

    const eligibility = await assertCanRequestReschedule(
        mutualMatchId,
        userId,
        proposedScheduledAt,
    );
    if (!eligibility.ok) {
        return { ok: false, reason: eligibility.reason };
    }

    const row = await loadMutualMatch(mutualMatchId);
    if (!row) return { ok: false, reason: "not_found" };

    const slotOption = findMatchingSlotOption(proposedScheduledAt, new Date(), {
        excludeScheduledAt: row.scheduledAt,
    });
    if (!slotOption) return { ok: false, reason: "invalid_slot" };

    const partnerUserId = getPartnerUserId(row, userId);
    if (!partnerUserId) return { ok: false, reason: "not_participant" };

    const now = new Date();

    const created = await db.transaction(async (tx) => {
        const [request] = await tx
            .insert(meetupRescheduleRequests)
            .values({
                mutualMatchId,
                requestedByUserId: userId,
                proposedSlot: slotOption.slot,
                proposedScheduledAt: slotOption.scheduledAt,
                proposedConfirmBy: slotOption.confirmBy,
                status: "pending",
            })
            .returning();

        await tx
            .update(meetupRescheduleRequests)
            .set({ chainRootId: request.id })
            .where(eq(meetupRescheduleRequests.id, request.id));

        await tx
            .update(mutualMatches)
            .set({
                pendingRescheduleRequestId: request.id,
                reschedulePausedExpiryAt: now,
                updatedAt: now,
            })
            .where(eq(mutualMatches.id, mutualMatchId));

        return { ...request, chainRootId: request.id };
    });

    void sendRescheduleRequestedPush({
        recipientUserId: partnerUserId,
        requesterUserId: userId,
        scheduledAt: slotOption.scheduledAt,
        mutualMatchId,
        requestId: created.id,
    });

    return {
        ok: true,
        requestId: created.id,
        proposedScheduledAt: slotOption.scheduledAt.toISOString(),
        proposedConfirmBy: slotOption.confirmBy.toISOString(),
        proposedSlot: slotOption.slot,
        partnerUserId,
    };
}

async function assertCanRespondToRequest(
    requestId: string,
    userId: string,
    counterScheduledAt?: Date,
): Promise<
    | {
          ok: true;
          request: typeof meetupRescheduleRequests.$inferSelect;
          mutual: MutualRow;
      }
    | { ok: false; reason: RescheduleRespondFailReason }
> {
    if (!(await isRescheduleFeatureEnabled())) {
        return { ok: false, reason: "feature_disabled" };
    }

    const request = await loadPendingRequest(requestId);
    if (!request) return { ok: false, reason: "not_found" };
    if (request.status !== "pending") return { ok: false, reason: "not_pending" };

    const mutual = await loadMutualMatch(request.mutualMatchId);
    if (!mutual) return { ok: false, reason: "not_found" };

    if (!getPartnerUserId(mutual, userId)) {
        return { ok: false, reason: "not_participant" };
    }

    if (request.requestedByUserId === userId) {
        return { ok: false, reason: "not_your_turn" };
    }

    const now = new Date();
    if (request.proposedConfirmBy.getTime() <= now.getTime()) {
        return { ok: false, reason: "confirm_window_closed" };
    }

    if (counterScheduledAt) {
        const match = findMatchingSlotOption(counterScheduledAt, now, {
            excludeScheduledAt: mutual.scheduledAt,
        });
        if (!match) return { ok: false, reason: "invalid_slot" };
        if (match.confirmBy.getTime() <= now.getTime()) {
            return { ok: false, reason: "confirm_window_closed" };
        }
    }

    return { ok: true, request, mutual };
}

export async function acceptReschedule(
    requestId: string,
    userId: string,
): Promise<AcceptRescheduleResult> {
    const check = await assertCanRespondToRequest(requestId, userId);
    if (!check.ok) return { ok: false, reason: check.reason };

    const { request, mutual } = check;
    const now = new Date();

    await db.transaction(async (tx) => {
        await tx
            .update(meetupRescheduleRequests)
            .set({ status: "accepted", respondedAt: now })
            .where(eq(meetupRescheduleRequests.id, request.id));

        await tx
            .update(mutualMatches)
            .set({
                pendingRescheduleRequestId: null,
                reschedulePausedExpiryAt: null,
                updatedAt: now,
            })
            .where(eq(mutualMatches.id, mutual.id));
    });

    await applyMeetupSlotToMatch(mutual.id, {
        slot: request.proposedSlot as MeetupSlotKind,
        scheduledAt: request.proposedScheduledAt,
        confirmBy: request.proposedConfirmBy,
        markBothConfirmed: true,
    });

    const finalize = await tryFinalizeConfirmedMeetup(mutual.id);
    const refreshed = await loadMutualMatch(mutual.id);

    if (!finalize.finalized) {
        void sendRescheduleAcceptedPush({
            recipientUserId: request.requestedByUserId,
            accepterUserId: userId,
            scheduledAt: request.proposedScheduledAt,
            mutualMatchId: mutual.id,
        });
    }

    return {
        ok: true,
        status: "applied",
        scheduledAt: request.proposedScheduledAt.toISOString(),
        confirmBy: request.proposedConfirmBy.toISOString(),
        proposedSlot: request.proposedSlot as MeetupSlotKind,
        arrangementStatus: refreshed?.status ?? mutual.status,
        finalized: finalize.finalized,
    };
}

export async function declineWithCounter(
    requestId: string,
    userId: string,
    input: { reason: string; counterScheduledAt: Date | string },
): Promise<DeclineWithCounterResult> {
    if (!isDeclineReasonValid(input.reason)) {
        return { ok: false, reason: "reason_required" };
    }

    const counterScheduledAt = parseProposedScheduledAt(input.counterScheduledAt);
    if (!counterScheduledAt) {
        return { ok: false, reason: "invalid_slot" };
    }

    const check = await assertCanRespondToRequest(requestId, userId, counterScheduledAt);
    if (!check.ok) return { ok: false, reason: check.reason };

    const { request, mutual } = check;
    const chainRootId = resolveChainRootId(request);
    const chainRows = await loadChainRequests(chainRootId, mutual.id);

    if (countCounterProposalsInChain(chainRows) >= MAX_COUNTER_PROPOSALS) {
        return { ok: false, reason: "counter_cap_reached" };
    }

    const slotOption = findMatchingSlotOption(counterScheduledAt, new Date(), {
        excludeScheduledAt: mutual.scheduledAt,
    });
    if (!slotOption) return { ok: false, reason: "invalid_slot" };

    const partnerUserId = getPartnerUserId(mutual, userId);
    if (!partnerUserId) return { ok: false, reason: "not_participant" };

    const now = new Date();
    const trimmedReason = input.reason.trim();

    const newRequest = await db.transaction(async (tx) => {
        await tx
            .update(meetupRescheduleRequests)
            .set({
                status: "declined",
                declineReason: trimmedReason,
                respondedAt: now,
            })
            .where(eq(meetupRescheduleRequests.id, request.id));

        const [counter] = await tx
            .insert(meetupRescheduleRequests)
            .values({
                mutualMatchId: mutual.id,
                requestedByUserId: userId,
                proposedSlot: slotOption.slot,
                proposedScheduledAt: slotOption.scheduledAt,
                proposedConfirmBy: slotOption.confirmBy,
                status: "pending",
                counterOfRequestId: request.id,
                chainRootId,
            })
            .returning();

        await tx
            .update(mutualMatches)
            .set({
                pendingRescheduleRequestId: counter.id,
                reschedulePausedExpiryAt: now,
                updatedAt: now,
            })
            .where(eq(mutualMatches.id, mutual.id));

        return counter;
    });

    void sendRescheduleCounteredPush({
        recipientUserId: partnerUserId,
        counterUserId: userId,
        scheduledAt: slotOption.scheduledAt,
        mutualMatchId: mutual.id,
        requestId: newRequest.id,
    });

    return {
        ok: true,
        requestId: newRequest.id,
        proposedScheduledAt: slotOption.scheduledAt.toISOString(),
        proposedConfirmBy: slotOption.confirmBy.toISOString(),
        proposedSlot: slotOption.slot,
        partnerUserId,
    };
}

export async function cancelPendingReschedule(
    mutualMatchId: string,
    userId: string,
): Promise<CancelPendingRescheduleResult> {
    if (!(await isRescheduleFeatureEnabled())) {
        return { ok: false, reason: "feature_disabled" };
    }

    const mutual = await loadMutualMatch(mutualMatchId);
    if (!mutual) return { ok: false, reason: "not_found" };

    if (!getPartnerUserId(mutual, userId)) {
        return { ok: false, reason: "not_participant" };
    }

    if (!mutual.pendingRescheduleRequestId) {
        return { ok: false, reason: "not_pending" };
    }

    const pending = await loadPendingRequest(mutual.pendingRescheduleRequestId);
    if (!pending || pending.status !== "pending") {
        return { ok: false, reason: "not_pending" };
    }

    if (pending.requestedByUserId !== userId) {
        return { ok: false, reason: "not_requester" };
    }

    const partnerUserId = getPartnerUserId(mutual, userId);
    const now = new Date();

    await db.transaction(async (tx) => {
        await tx
            .update(meetupRescheduleRequests)
            .set({ status: "cancelled", respondedAt: now })
            .where(eq(meetupRescheduleRequests.id, pending.id));

        await tx
            .update(mutualMatches)
            .set({
                pendingRescheduleRequestId: null,
                reschedulePausedExpiryAt: null,
                updatedAt: now,
            })
            .where(eq(mutualMatches.id, mutualMatchId));
    });

    if (partnerUserId) {
        void sendRescheduleCancelledPush({
            recipientUserId: partnerUserId,
            requesterUserId: userId,
            mutualMatchId,
        });
    }

    return { ok: true };
}

async function resolveRequestBlockReason(
    row: MutualRow,
    viewerUserId: string,
): Promise<RescheduleRequestBlockReason | undefined> {
    if (!getPartnerUserId(row, viewerUserId)) return "not_participant";
    if (isClosedMatchStatus(row.status)) return "match_closed";
    if (!isRescheduleEligibleMatchStatus(row.status)) {
        if (row.status === "upcoming" && isScheduledDateInPast(row.scheduledAt, new Date())) {
            return "date_passed";
        }
        return "match_closed";
    }
    if (!isViewerSlotConfirmed(row, viewerUserId)) return "confirm_first";
    if (await viewerPaymentBlocksReschedule(row, viewerUserId)) return "payment_required";
    if (row.pendingRescheduleRequestId) return "pending_exists";
    return undefined;
}

export async function getRescheduleStateForViewer(
    mutualMatchId: string,
    userId: string,
): Promise<RescheduleViewerState> {
    if (!(await isRescheduleFeatureEnabled())) {
        return { canRequest: false, blockReason: "feature_disabled" };
    }

    const row = await loadMutualMatch(mutualMatchId);
    if (!row || !getPartnerUserId(row, userId)) {
        return { canRequest: false, blockReason: "not_participant" };
    }

    const blockReason = await resolveRequestBlockReason(row, userId);
    const canRequest = !blockReason;

    let pending: RescheduleViewerState["pending"];

    if (row.pendingRescheduleRequestId) {
        const active = await loadPendingRequest(row.pendingRescheduleRequestId);
        if (active && active.status === "pending") {
            const chainRootId = resolveChainRootId(active);
            const chainRows = await loadChainRequests(chainRootId, row.id);
            const lastDeclined = chainRows
                .filter((r) => r.status === "declined" && r.declineReason)
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

            pending = {
                requestId: active.id,
                proposedScheduledAt: active.proposedScheduledAt.toISOString(),
                proposedConfirmBy: active.proposedConfirmBy.toISOString(),
                proposedSlot: active.proposedSlot as MeetupSlotKind,
                requestedByUserId: active.requestedByUserId,
                isYourTurnToRespond: active.requestedByUserId !== userId,
                counterCount: countCounterProposalsInChain(chainRows),
                lastDeclineReason: lastDeclined?.declineReason ?? undefined,
            };
        }
    }

    return { canRequest, blockReason, pending };
}

export async function buildSlotConfirmationViewWithReschedule(
    row: MutualRow,
    viewerUserId: string,
): Promise<SlotConfirmationView> {
    const slot = buildSlotConfirmationView(row, viewerUserId);
    const reschedule = await getRescheduleStateForViewer(row.id, viewerUserId);
    return { ...slot, reschedule };
}

export type RescheduleSlotOptionDto = {
    slot: MeetupSlotKind;
    scheduledAt: string;
    confirmBy: string;
    label: string;
};

export async function listRescheduleOptionsForMutual(
    mutualMatchId: string,
    userId: string,
): Promise<
    | {
          ok: true;
          options: RescheduleSlotOptionDto[];
          currentScheduledAt: string | null;
      }
    | { ok: false; reason: "feature_disabled" | "not_found" | "not_participant" }
> {
    if (!(await isRescheduleFeatureEnabled())) {
        return { ok: false, reason: "feature_disabled" };
    }

    const row = await loadMutualMatch(mutualMatchId);
    if (!row) return { ok: false, reason: "not_found" };
    if (!getPartnerUserId(row, userId)) {
        return { ok: false, reason: "not_participant" };
    }

    const now = new Date();
    const options = listUpcomingMeetupSlotOptions(now, {
        count: 4,
        excludeScheduledAt: row.scheduledAt ?? undefined,
    }).map((option) => ({
        slot: option.slot,
        scheduledAt: option.scheduledAt.toISOString(),
        confirmBy: option.confirmBy.toISOString(),
        label: formatMeetupSlotForDisplay(option.scheduledAt),
    }));

    return {
        ok: true,
        options,
        currentScheduledAt: row.scheduledAt?.toISOString() ?? null,
    };
}

/** Cancel any pending reschedule rows when a match is cancelled (match-hold integration). */
export async function cancelPendingReschedulesForMatch(
    mutualMatchId: string,
    tx: Pick<typeof db, "update"> = db,
): Promise<void> {
    const now = new Date();
    await tx
        .update(meetupRescheduleRequests)
        .set({ status: "cancelled", respondedAt: now })
        .where(
            and(
                eq(meetupRescheduleRequests.mutualMatchId, mutualMatchId),
                eq(meetupRescheduleRequests.status, "pending"),
            ),
        );

    await tx
        .update(mutualMatches)
        .set({
            pendingRescheduleRequestId: null,
            reschedulePausedExpiryAt: null,
            updatedAt: now,
        })
        .where(eq(mutualMatches.id, mutualMatchId));
}
