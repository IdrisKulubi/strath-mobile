import type { MeetupRescheduleRequest } from "@/db/schema";
import {
    listUpcomingMeetupSlotOptions,
    type MeetupSlotKind,
    type MeetupSlotOption,
} from "@/lib/services/meetup-slot-service";

export const MAX_COUNTER_PROPOSALS = 3;
export const MIN_DECLINE_REASON_LENGTH = 3;

const CLOSED_MATCH_STATUSES = new Set(["cancelled", "expired", "completed"]);

export function isClosedMatchStatus(status: string): boolean {
    return CLOSED_MATCH_STATUSES.has(status);
}

export function isRescheduleEligibleMatchStatus(status: string): boolean {
    return status === "mutual" || status === "being_arranged";
}

export function getPartnerUserId(
    row: { userAId: string; userBId: string },
    viewerUserId: string,
): string | null {
    if (row.userAId === viewerUserId) return row.userBId;
    if (row.userBId === viewerUserId) return row.userAId;
    return null;
}

export function isViewerSlotConfirmed(
    row: {
        userAId: string;
        userBId: string;
        userASlotConfirmedAt: Date | null;
        userBSlotConfirmedAt: Date | null;
    },
    viewerUserId: string,
): boolean {
    if (row.userAId === viewerUserId) return Boolean(row.userASlotConfirmedAt);
    if (row.userBId === viewerUserId) return Boolean(row.userBSlotConfirmedAt);
    return false;
}

export function isSameMeetupInstant(a: Date, b: Date): boolean {
    return a.getTime() === b.getTime();
}

export function findMatchingSlotOption(
    proposedScheduledAt: Date,
    now: Date,
    options?: { excludeScheduledAt?: Date | null },
): MeetupSlotOption | null {
    const slots = listUpcomingMeetupSlotOptions(now, {
        count: 8,
        excludeScheduledAt: options?.excludeScheduledAt ?? undefined,
    });

    return (
        slots.find((slot) => isSameMeetupInstant(slot.scheduledAt, proposedScheduledAt)) ?? null
    );
}

/** Number of counter-proposals already made in this negotiation chain. */
export function countCounterProposalsInChain(
    chainRequests: Pick<MeetupRescheduleRequest, "counterOfRequestId">[],
): number {
    return chainRequests.filter((row) => row.counterOfRequestId != null).length;
}

export function resolveChainRootId(
    parent: Pick<MeetupRescheduleRequest, "id" | "chainRootId">,
): string {
    return parent.chainRootId ?? parent.id;
}

export function isDeclineReasonValid(reason: string): boolean {
    return reason.trim().length >= MIN_DECLINE_REASON_LENGTH;
}

export function isScheduledDateInPast(scheduledAt: Date | null, now: Date): boolean {
    if (!scheduledAt) return false;
    return scheduledAt.getTime() <= now.getTime();
}
