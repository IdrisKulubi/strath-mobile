import { and, eq, inArray, isNotNull, isNull, lte, or } from "drizzle-orm";
import db from "@/db/drizzle";
import { db as readDb } from "@/lib/db";
import {
    dateLocations,
    dateMatches,
    mutualMatches,
    profiles,
    user,
} from "@/db/schema";
import {
    assignMeetupSlot,
    bothUsersConfirmedSlot,
    formatMeetupSlotForDisplay,
    isConfirmWindowOpen,
    isSlotConfirmEligibleStatus,
    type MeetupSlotKind,
} from "@/lib/services/meetup-slot-service";
import { syncMutualMatchFromDateMatch } from "@/lib/services/mutual-match-service";
import { sendPushNotification } from "@/lib/notifications";
import { NOTIFICATION_TYPES } from "@/lib/notification-types";
import { logEvent, EVENT_TYPES } from "@/lib/analytics";

export interface SlotConfirmationView {
    assignedSlot: MeetupSlotKind | null;
    scheduledAt: string | null;
    confirmBy: string | null;
    confirmWindowOpen: boolean;
    viewerSlotConfirmed: boolean;
    partnerSlotConfirmed: boolean;
    needsSlotConfirmation: boolean;
}

export function buildSlotConfirmationView(
    row: typeof mutualMatches.$inferSelect,
    viewerUserId: string,
): SlotConfirmationView {
    const isUserA = row.userAId === viewerUserId;
    const viewerConfirmed = Boolean(
        isUserA ? row.userASlotConfirmedAt : row.userBSlotConfirmedAt,
    );
    const partnerConfirmed = Boolean(
        isUserA ? row.userBSlotConfirmedAt : row.userASlotConfirmedAt,
    );
    const confirmBy = row.slotConfirmBy;
    const confirmWindowOpen = confirmBy
        ? isConfirmWindowOpen(confirmBy)
        : false;
    const needsSlotConfirmation =
        isSlotConfirmEligibleStatus(row.status)
        && Boolean(row.scheduledAt && confirmBy)
        && !bothUsersConfirmedSlot({
            userASlotConfirmedAt: row.userASlotConfirmedAt,
            userBSlotConfirmedAt: row.userBSlotConfirmedAt,
        });

    return {
        assignedSlot: row.assignedSlot ?? null,
        scheduledAt: row.scheduledAt?.toISOString() ?? null,
        confirmBy: confirmBy?.toISOString() ?? null,
        confirmWindowOpen,
        viewerSlotConfirmed: viewerConfirmed,
        partnerSlotConfirmed: partnerConfirmed,
        needsSlotConfirmation,
    };
}

/** Active venue marked default in admin Locations; else newest active location. */
export async function getDefaultDateLocation() {
    const markedDefault = await db.query.dateLocations.findFirst({
        where: and(eq(dateLocations.isActive, true), eq(dateLocations.isDefault, true)),
    });
    if (markedDefault) return markedDefault;

    return db.query.dateLocations.findFirst({
        where: eq(dateLocations.isActive, true),
        orderBy: (t, { desc }) => [desc(t.updatedAt)],
    });
}

export async function sendDateScheduledPushNotifications(input: {
    userAId: string;
    userBId: string;
    venueName: string;
    venueAddress: string;
    scheduledAt: Date;
}) {
    const [userA, userB] = await Promise.all([
        db.query.user.findFirst({ where: eq(user.id, input.userAId) }),
        db.query.user.findFirst({ where: eq(user.id, input.userBId) }),
    ]);
    const [profileA, profileB] = await Promise.all([
        db.query.profiles.findFirst({ where: eq(profiles.userId, input.userAId) }),
        db.query.profiles.findFirst({ where: eq(profiles.userId, input.userBId) }),
    ]);

    const nameA = profileA?.firstName ?? userA?.name?.split(" ")[0] ?? "your match";
    const nameB = profileB?.firstName ?? userB?.name?.split(" ")[0] ?? "your match";
    const dateStr = formatMeetupSlotForDisplay(input.scheduledAt);
    const body = `${input.venueName}, ${input.venueAddress} — ${dateStr}`;

    await Promise.all([
        userA?.pushToken
            ? sendPushNotification(userA.pushToken, {
                title: `Your date with ${nameB} is set`,
                body,
                data: { type: NOTIFICATION_TYPES.DATE_SCHEDULED },
            })
            : Promise.resolve(),
        userB?.pushToken
            ? sendPushNotification(userB.pushToken, {
                title: `Your date with ${nameA} is set`,
                body,
                data: { type: NOTIFICATION_TYPES.DATE_SCHEDULED },
            })
            : Promise.resolve(),
    ]);
}

export async function tryFinalizeConfirmedMeetup(
    mutualMatchId: string,
): Promise<{ finalized: boolean; reason?: string }> {
    const row = await db.query.mutualMatches.findFirst({
        where: eq(mutualMatches.id, mutualMatchId),
    });
    if (!row) return { finalized: false, reason: "not_found" };
    if (!isSlotConfirmEligibleStatus(row.status)) {
        return { finalized: false, reason: "wrong_status" };
    }

    if (
        !bothUsersConfirmedSlot({
            userASlotConfirmedAt: row.userASlotConfirmedAt,
            userBSlotConfirmedAt: row.userBSlotConfirmedAt,
        })
    ) {
        return { finalized: false, reason: "not_both_confirmed" };
    }

    if (!row.slotConfirmBy || !isConfirmWindowOpen(row.slotConfirmBy)) {
        return { finalized: false, reason: "confirm_window_closed" };
    }

    const dateMatchId = row.legacyDateMatchId;
    if (!dateMatchId) return { finalized: false, reason: "no_date_match" };

    const location = await getDefaultDateLocation();
    if (!location) {
        console.error(
            "[meetup-confirmation] no active date location in admin; cannot auto-schedule",
            { mutualMatchId },
        );
        return { finalized: false, reason: "no_venue" };
    }

    const scheduledAt = row.scheduledAt ?? new Date();

    await db
        .update(dateMatches)
        .set({
            status: "scheduled",
            locationId: location.id,
            venueName: location.name,
            venueAddress: location.address,
            scheduledAt,
            userAConfirmed: true,
            userBConfirmed: true,
            callCompleted: true,
        })
        .where(eq(dateMatches.id, dateMatchId));

    await syncMutualMatchFromDateMatch(dateMatchId);

    await sendDateScheduledPushNotifications({
        userAId: row.userAId,
        userBId: row.userBId,
        venueName: location.name,
        venueAddress: location.address ?? "",
        scheduledAt,
    });

    logEvent(EVENT_TYPES.DATE_SCHEDULED, null, {
        mutualMatchId,
        dateMatchId,
        venueName: location.name,
        autoScheduled: true,
    }).catch(() => {});

    console.log("[meetup-confirmation] auto-scheduled meetup", {
        mutualMatchId,
        dateMatchId,
        scheduledAt: scheduledAt.toISOString(),
    });

    return { finalized: true };
}

export type ConfirmMeetupSlotResult =
    | { status: "confirmed"; slot: SlotConfirmationView; arrangementStatus: string }
    | { status: "finalized"; slot: SlotConfirmationView; arrangementStatus: string }
    | { status: "expired" }
    | { status: "not_found" }
    | { status: "forbidden" }
    | { status: "confirm_window_closed" };

export async function confirmMeetupSlot(
    mutualMatchId: string,
    userId: string,
): Promise<ConfirmMeetupSlotResult> {
    await expireUnconfirmedMeetups(mutualMatchId);

    const row = await db.query.mutualMatches.findFirst({
        where: eq(mutualMatches.id, mutualMatchId),
    });
    if (!row) return { status: "not_found" };
    if (row.userAId !== userId && row.userBId !== userId) return { status: "forbidden" };
    if (row.status === "expired") return { status: "expired" };
    if (!isSlotConfirmEligibleStatus(row.status)) {
        const slot = buildSlotConfirmationView(row, userId);
        return { status: "confirmed", slot, arrangementStatus: row.status };
    }

    if (!row.slotConfirmBy || !isConfirmWindowOpen(row.slotConfirmBy)) {
        return { status: "confirm_window_closed" };
    }

    const now = new Date();
    const isUserA = row.userAId === userId;
    const alreadyConfirmed = isUserA ? row.userASlotConfirmedAt : row.userBSlotConfirmedAt;

    if (!alreadyConfirmed) {
        await db
            .update(mutualMatches)
            .set({
                ...(isUserA
                    ? { userASlotConfirmedAt: now }
                    : { userBSlotConfirmedAt: now }),
                updatedAt: now,
            })
            .where(eq(mutualMatches.id, mutualMatchId));
    }

    const finalize = await tryFinalizeConfirmedMeetup(mutualMatchId);
    const refreshed = await db.query.mutualMatches.findFirst({
        where: eq(mutualMatches.id, mutualMatchId),
    });
    if (!refreshed) return { status: "not_found" };

    const slot = buildSlotConfirmationView(refreshed, userId);
    if (finalize.finalized) {
        return {
            status: "finalized",
            slot,
            arrangementStatus: refreshed.status,
        };
    }

    return {
        status: "confirmed",
        slot,
        arrangementStatus: refreshed.status,
    };
}

/**
 * Expire mutual matches that missed the slot confirmation deadline.
 */
export async function expireUnconfirmedMeetups(mutualMatchId?: string): Promise<number> {
    const now = new Date();
    const conditions = [
        inArray(mutualMatches.status, ["mutual", "being_arranged"]),
        isNotNull(mutualMatches.slotConfirmBy),
        lte(mutualMatches.slotConfirmBy, now),
        or(
            isNull(mutualMatches.userASlotConfirmedAt),
            isNull(mutualMatches.userBSlotConfirmedAt),
        ),
    ];

    if (mutualMatchId) {
        conditions.push(eq(mutualMatches.id, mutualMatchId));
    }

    const expired = await db
        .update(mutualMatches)
        .set({ status: "expired", updatedAt: now })
        .where(and(...conditions))
        .returning({
            id: mutualMatches.id,
            legacyDateMatchId: mutualMatches.legacyDateMatchId,
        });

    for (const row of expired) {
        if (row.legacyDateMatchId) {
            await db
                .update(dateMatches)
                .set({ status: "cancelled" })
                .where(eq(dateMatches.id, row.legacyDateMatchId));
        }
    }

    if (expired.length > 0) {
        console.log("[meetup-confirmation] expired unconfirmed meetups", {
            count: expired.length,
            mutualMatchId: mutualMatchId ?? null,
        });
    }

    return expired.length;
}

/** Assign slot fields and create linked date_match when a mutual row is created. */
export async function initializeMeetupSlotForMutual(
    tx: Pick<typeof db, "insert" | "update">,
    input: {
        mutualMatchId: string;
        candidatePairId: string;
        userAId: string;
        userBId: string;
        mutualAt?: Date;
    },
): Promise<{ dateMatchId: string; scheduledAt: Date; confirmBy: Date; slot: MeetupSlotKind }> {
    const mutualAt = input.mutualAt ?? new Date();
    const assignment = assignMeetupSlot(mutualAt);

    const [dateRow] = await tx
        .insert(dateMatches)
        .values({
            candidatePairId: input.candidatePairId,
            userAId: input.userAId,
            userBId: input.userBId,
            vibe: "coffee",
            status: "pending_setup",
            scheduledAt: assignment.scheduledAt,
            callCompleted: false,
            userAConfirmed: false,
            userBConfirmed: false,
            createdAt: mutualAt,
        })
        .returning({ id: dateMatches.id });

    await tx
        .update(mutualMatches)
        .set({
            scheduledAt: assignment.scheduledAt,
            slotConfirmBy: assignment.confirmBy,
            assignedSlot: assignment.slot,
            legacyDateMatchId: dateRow.id,
            updatedAt: mutualAt,
        })
        .where(eq(mutualMatches.id, input.mutualMatchId));

    return {
        dateMatchId: dateRow.id,
        scheduledAt: assignment.scheduledAt,
        confirmBy: assignment.confirmBy,
        slot: assignment.slot,
    };
}
