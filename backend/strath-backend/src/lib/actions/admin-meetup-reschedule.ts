"use server";

import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { meetupRescheduleRequests, mutualMatches } from "@/db/schema";
import type { MeetupRescheduleStatus } from "@/lib/meetup-reschedule/types";
import { desc, eq } from "drizzle-orm";
import { formatMeetupSlotForDisplay } from "@/lib/services/meetup-slot-service";
import {
    getAdminMeetupSlotUser,
    type AdminMeetupSlotUser,
} from "@/lib/actions/admin-meetup-slots";

export interface AdminMeetupRescheduleRequestRow {
    id: string;
    status: MeetupRescheduleStatus;
    requestedBy: AdminMeetupSlotUser;
    proposedSlot: string;
    proposedScheduledAt: string;
    proposedScheduledAtLabel: string;
    proposedConfirmBy: string;
    declineReason: string | null;
    counterOfRequestId: string | null;
    chainRootId: string | null;
    respondedAt: string | null;
    createdAt: string;
}

export interface AdminMeetupRescheduleDetail {
    mutualMatchId: string;
    status: string;
    assignedSlot: string | null;
    scheduledAt: string | null;
    scheduledAtLabel: string | null;
    confirmBy: string | null;
    pendingRescheduleRequestId: string | null;
    userA: AdminMeetupSlotUser;
    userB: AdminMeetupSlotUser;
    requests: AdminMeetupRescheduleRequestRow[];
}

export async function getAdminMeetupRescheduleDetail(
    mutualMatchId: string,
): Promise<AdminMeetupRescheduleDetail | null> {
    await requireAdmin();

    const mutual = await db.query.mutualMatches.findFirst({
        where: eq(mutualMatches.id, mutualMatchId),
    });

    if (!mutual) return null;

    const [userA, userB, requestRows] = await Promise.all([
        getAdminMeetupSlotUser(mutual.userAId),
        getAdminMeetupSlotUser(mutual.userBId),
        db.query.meetupRescheduleRequests.findMany({
            where: eq(meetupRescheduleRequests.mutualMatchId, mutualMatchId),
            orderBy: [desc(meetupRescheduleRequests.createdAt)],
        }),
    ]);

    const requests: AdminMeetupRescheduleRequestRow[] = await Promise.all(
        requestRows.map(async (row) => {
            const requestedBy = await getAdminMeetupSlotUser(row.requestedByUserId);
            return {
                id: row.id,
                status: row.status,
                requestedBy,
                proposedSlot: row.proposedSlot,
                proposedScheduledAt: row.proposedScheduledAt.toISOString(),
                proposedScheduledAtLabel: formatMeetupSlotForDisplay(row.proposedScheduledAt),
                proposedConfirmBy: row.proposedConfirmBy.toISOString(),
                declineReason: row.declineReason ?? null,
                counterOfRequestId: row.counterOfRequestId ?? null,
                chainRootId: row.chainRootId ?? null,
                respondedAt: row.respondedAt?.toISOString() ?? null,
                createdAt: row.createdAt.toISOString(),
            };
        }),
    );

    const scheduledAt = mutual.scheduledAt;

    return {
        mutualMatchId: mutual.id,
        status: mutual.status,
        assignedSlot: mutual.assignedSlot ?? null,
        scheduledAt: scheduledAt?.toISOString() ?? null,
        scheduledAtLabel: scheduledAt ? formatMeetupSlotForDisplay(scheduledAt) : null,
        confirmBy: mutual.slotConfirmBy?.toISOString() ?? null,
        pendingRescheduleRequestId: mutual.pendingRescheduleRequestId ?? null,
        userA,
        userB,
        requests,
    };
}
