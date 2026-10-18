"use server";

import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { dateMatches, mutualMatches, profiles, user } from "@/db/schema";
import { desc, eq, isNotNull, or } from "drizzle-orm";
import {
    bothUsersConfirmedSlot,
    formatMeetupSlotForDisplay,
    isConfirmWindowOpen,
} from "@/lib/services/meetup-slot-service";

export type MeetupSlotTrackingFilter =
    | "all"
    | "awaiting_both"
    | "one_confirmed"
    | "both_confirmed"
    | "window_closed"
    | "scheduled"
    | "expired";

export type MeetupSlotPhase =
    | "awaiting_both"
    | "one_confirmed"
    | "both_confirmed"
    | "window_closed"
    | "scheduled"
    | "expired"
    | "other";

export interface AdminMeetupSlotUser {
    id: string;
    firstName: string;
    name: string;
    email: string | null;
    phone: string | null;
    profilePhoto: string | null;
    university: string | null;
    course: string | null;
}

export interface AdminMeetupSlotMatchRow {
    mutualMatchId: string;
    candidatePairId: string;
    status: string;
    phase: MeetupSlotPhase;
    assignedSlot: string | null;
    scheduledAt: string | null;
    scheduledAtLabel: string | null;
    confirmBy: string | null;
    confirmWindowOpen: boolean;
    reminderSentAt: string | null;
    userA: AdminMeetupSlotUser;
    userB: AdminMeetupSlotUser;
    userAConfirmedAt: string | null;
    userBConfirmedAt: string | null;
    dateMatchStatus: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface AdminMeetupSlotParticipantRow {
    mutualMatchId: string;
    userId: string;
    user: AdminMeetupSlotUser;
    partner: AdminMeetupSlotUser;
    interaction: "confirmed" | "pending_confirm";
    confirmedAt: string | null;
    phase: MeetupSlotPhase;
    scheduledAtLabel: string | null;
    confirmBy: string | null;
    matchStatus: string;
}

export interface AdminMeetupSlotTrackingResult {
    matches: AdminMeetupSlotMatchRow[];
    participants: AdminMeetupSlotParticipantRow[];
    stats: {
        totalMatches: number;
        awaitingBoth: number;
        oneConfirmed: number;
        bothConfirmed: number;
        windowClosed: number;
        scheduledOrUpcoming: number;
        expired: number;
        usersConfirmed: number;
        usersPendingConfirm: number;
    };
}

export async function getAdminMeetupSlotUser(userId: string): Promise<AdminMeetupSlotUser> {
    const profile = await db.query.profiles.findFirst({
        where: eq(profiles.userId, userId),
        with: { user: true },
    });
    const fallbackUser = profile?.user
        ? null
        : await db.query.user.findFirst({ where: eq(user.id, userId) });

    const firstName =
        profile?.firstName
        || profile?.user?.name?.split(" ")[0]
        || fallbackUser?.name?.split(" ")[0]
        || "Unknown";

    return {
        id: userId,
        firstName,
        name:
            profile
                ? [profile.firstName, profile.lastName].filter(Boolean).join(" ")
                : fallbackUser?.name ?? "Unknown",
        email: profile?.user?.email ?? fallbackUser?.email ?? null,
        phone: profile?.phoneNumber ?? profile?.user?.phoneNumber ?? fallbackUser?.phoneNumber ?? null,
        profilePhoto:
            profile?.profilePhoto
            ?? profile?.user?.profilePhoto
            ?? profile?.user?.image
            ?? fallbackUser?.profilePhoto
            ?? fallbackUser?.image
            ?? null,
        university: profile?.university ?? null,
        course: profile?.course ?? null,
    };
}

function resolveMeetupSlotPhase(
    row: typeof mutualMatches.$inferSelect,
    dateMatchStatus: string | null,
): MeetupSlotPhase {
    const aConfirmed = Boolean(row.userASlotConfirmedAt);
    const bConfirmed = Boolean(row.userBSlotConfirmedAt);
    const bothConfirmed = bothUsersConfirmedSlot({
        userASlotConfirmedAt: row.userASlotConfirmedAt,
        userBSlotConfirmedAt: row.userBSlotConfirmedAt,
    });

    if (row.status === "expired") return "expired";
    if (row.status === "upcoming" || dateMatchStatus === "scheduled") return "scheduled";
    if (bothConfirmed) return "both_confirmed";

    const confirmBy = row.slotConfirmBy;
    const windowOpen = confirmBy ? isConfirmWindowOpen(confirmBy) : false;

    if (!windowOpen && confirmBy && (!aConfirmed || !bConfirmed)) {
        return "window_closed";
    }
    if (aConfirmed !== bConfirmed) return "one_confirmed";
    if (!aConfirmed && !bConfirmed) return "awaiting_both";

    return "other";
}

function matchesFilter(phase: MeetupSlotPhase, filter: MeetupSlotTrackingFilter): boolean {
    if (filter === "all") return true;
    if (filter === "scheduled") return phase === "scheduled";
    if (filter === "expired") return phase === "expired";
    return phase === filter;
}

export async function getAdminMeetupSlotTracking(
    filter: MeetupSlotTrackingFilter = "all",
): Promise<AdminMeetupSlotTrackingResult> {
    await requireAdmin();

    const rows = await db
        .select({
            mutual: mutualMatches,
            dateMatchStatus: dateMatches.status,
        })
        .from(mutualMatches)
        .leftJoin(dateMatches, eq(dateMatches.id, mutualMatches.legacyDateMatchId))
        .where(
            or(
                isNotNull(mutualMatches.slotConfirmBy),
                isNotNull(mutualMatches.assignedSlot),
                isNotNull(mutualMatches.scheduledAt),
            ),
        )
        .orderBy(desc(mutualMatches.updatedAt));

    const matchRows: AdminMeetupSlotMatchRow[] = [];
    const participantRows: AdminMeetupSlotParticipantRow[] = [];

    const stats = {
        totalMatches: 0,
        awaitingBoth: 0,
        oneConfirmed: 0,
        bothConfirmed: 0,
        windowClosed: 0,
        scheduledOrUpcoming: 0,
        expired: 0,
        usersConfirmed: 0,
        usersPendingConfirm: 0,
    };

    const confirmedUserIds = new Set<string>();
    const pendingUserIds = new Set<string>();

    for (const { mutual: row, dateMatchStatus } of rows) {
        const phase = resolveMeetupSlotPhase(row, dateMatchStatus);
        stats.totalMatches += 1;

        switch (phase) {
            case "awaiting_both":
                stats.awaitingBoth += 1;
                break;
            case "one_confirmed":
                stats.oneConfirmed += 1;
                break;
            case "both_confirmed":
                stats.bothConfirmed += 1;
                break;
            case "window_closed":
                stats.windowClosed += 1;
                break;
            case "scheduled":
                stats.scheduledOrUpcoming += 1;
                break;
            case "expired":
                stats.expired += 1;
                break;
            default:
                break;
        }

        if (!matchesFilter(phase, filter)) continue;

        const [userA, userB] = await Promise.all([
            getAdminMeetupSlotUser(row.userAId),
            getAdminMeetupSlotUser(row.userBId),
        ]);

        const confirmBy = row.slotConfirmBy;
        const scheduledAt = row.scheduledAt;

        const matchRow: AdminMeetupSlotMatchRow = {
            mutualMatchId: row.id,
            candidatePairId: row.candidatePairId,
            status: row.status,
            phase,
            assignedSlot: row.assignedSlot ?? null,
            scheduledAt: scheduledAt?.toISOString() ?? null,
            scheduledAtLabel: scheduledAt ? formatMeetupSlotForDisplay(scheduledAt) : null,
            confirmBy: confirmBy?.toISOString() ?? null,
            confirmWindowOpen: confirmBy ? isConfirmWindowOpen(confirmBy) : false,
            reminderSentAt: row.slotConfirmReminderSentAt?.toISOString() ?? null,
            userA,
            userB,
            userAConfirmedAt: row.userASlotConfirmedAt?.toISOString() ?? null,
            userBConfirmedAt: row.userBSlotConfirmedAt?.toISOString() ?? null,
            dateMatchStatus,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
        };

        matchRows.push(matchRow);

        const scheduledLabel = matchRow.scheduledAtLabel;
        const confirmByIso = matchRow.confirmBy;

        const pushParticipant = (
            subject: AdminMeetupSlotUser,
            partner: AdminMeetupSlotUser,
            confirmedAt: string | null,
        ) => {
            const interaction = confirmedAt ? "confirmed" as const : "pending_confirm" as const;
            if (interaction === "confirmed") {
                confirmedUserIds.add(subject.id);
            } else {
                pendingUserIds.add(subject.id);
            }

            participantRows.push({
                mutualMatchId: row.id,
                userId: subject.id,
                user: subject,
                partner,
                interaction,
                confirmedAt,
                phase,
                scheduledAtLabel: scheduledLabel,
                confirmBy: confirmByIso,
                matchStatus: row.status,
            });
        };

        pushParticipant(userA, userB, matchRow.userAConfirmedAt);
        pushParticipant(userB, userA, matchRow.userBConfirmedAt);
    }

    stats.usersConfirmed = confirmedUserIds.size;
    stats.usersPendingConfirm = pendingUserIds.size;

    participantRows.sort((left, right) => {
        if (left.interaction !== right.interaction) {
            return left.interaction === "pending_confirm" ? -1 : 1;
        }
        const leftTime = left.confirmedAt ? new Date(left.confirmedAt).getTime() : 0;
        const rightTime = right.confirmedAt ? new Date(right.confirmedAt).getTime() : 0;
        return rightTime - leftTime;
    });

    return {
        matches: matchRows,
        participants: participantRows,
        stats,
    };
}
