"use server";

import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import {
    user,
    profiles,
    dateRequests,
    dateMatches,
    dateFeedback,
    analyticsEvents,
} from "@/db/schema";
import { eq, desc, count, and, or, gte, lt, sql } from "drizzle-orm";
import { logEvent, EVENT_TYPES } from "@/lib/analytics";
import { revalidatePath } from "next/cache";
import { sendPushNotification } from "@/lib/notifications";
import { NOTIFICATION_TYPES } from "@/lib/notification-types";

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getAdminMetrics() {
    await requireAdmin();

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);

    const [
        [{ totalUsers }],
        [{ totalRequestsAllTime }],
        [{ requestsToday }],
        [{ totalAccepted }],
        [{ totalDeclined }],
        [{ pendingSetup }],
        [{ scheduled }],
        [{ attended }],
    ] = await Promise.all([
        db.select({ totalUsers: count() }).from(user),
        db.select({ totalRequestsAllTime: count() }).from(dateRequests),
        db.select({ requestsToday: count() }).from(dateRequests).where(gte(dateRequests.createdAt, todayStart)),
        db.select({ totalAccepted: count() }).from(dateRequests).where(eq(dateRequests.status, "accepted")),
        db.select({ totalDeclined: count() }).from(dateRequests).where(eq(dateRequests.status, "declined")),
        db.select({ pendingSetup: count() }).from(dateMatches).where(eq(dateMatches.status, "pending_setup")),
        db.select({ scheduled: count() }).from(dateMatches).where(eq(dateMatches.status, "scheduled")),
        db.select({ attended: count() }).from(dateMatches).where(eq(dateMatches.status, "attended")),
    ]);

    const totalFeedback = await db.select({ cnt: count() }).from(dateFeedback);
    const meetAgainYes = await db.select({ cnt: count() }).from(dateFeedback).where(eq(dateFeedback.meetAgain, "yes"));

    return {
        totalUsers,
        totalRequestsAllTime,
        requestsToday,
        totalAccepted,
        totalDeclined,
        pendingSetup,
        scheduled,
        attended,
        totalFeedback: totalFeedback[0].cnt,
        secondDates: meetAgainYes[0].cnt,
        acceptanceRate: totalRequestsAllTime > 0 ? Math.round((totalAccepted / totalRequestsAllTime) * 100) : 0,
        attendanceRate: totalAccepted > 0 ? Math.round((attended / totalAccepted) * 100) : 0,
    };
}

export async function getAdminDateRequests(statusFilter?: string) {
    await requireAdmin();

    const rows = await db
        .select()
        .from(dateRequests)
        .orderBy(desc(dateRequests.createdAt))
        .limit(100);

    const filtered = statusFilter && statusFilter !== "all"
        ? rows.filter((r) => r.status === statusFilter)
        : rows;

    return Promise.all(
        filtered.map(async (r) => {
            const [fromProfile, toProfile] = await Promise.all([
                db.query.profiles.findFirst({ where: eq(profiles.userId, r.fromUserId), with: { user: true } }),
                db.query.profiles.findFirst({ where: eq(profiles.userId, r.toUserId), with: { user: true } }),
            ]);
            return {
                ...r,
                createdAt: r.createdAt.toISOString(),
                updatedAt: r.updatedAt.toISOString(),
                fromUser: {
                    firstName: fromProfile?.firstName ?? fromProfile?.user?.name?.split(" ")[0] ?? "Unknown",
                    profilePhoto: fromProfile?.profilePhoto ?? fromProfile?.user?.image,
                    email: fromProfile?.user?.email,
                },
                toUser: {
                    firstName: toProfile?.firstName ?? toProfile?.user?.name?.split(" ")[0] ?? "Unknown",
                    profilePhoto: toProfile?.profilePhoto ?? toProfile?.user?.image,
                    email: toProfile?.user?.email,
                },
            };
        })
    );
}

export async function getAdminPendingDates() {
    await requireAdmin();

    const rows = await db
        .select()
        .from(dateMatches)
        .where(eq(dateMatches.status, "pending_setup"))
        .orderBy(desc(dateMatches.createdAt));

    return Promise.all(
        rows.map(async (dm) => {
            const [profileA, profileB] = await Promise.all([
                db.query.profiles.findFirst({ where: eq(profiles.userId, dm.userAId), with: { user: true } }),
                db.query.profiles.findFirst({ where: eq(profiles.userId, dm.userBId), with: { user: true } }),
            ]);
            return {
                ...dm,
                createdAt: dm.createdAt.toISOString(),
                userA: {
                    id: dm.userAId,
                    firstName: profileA?.firstName ?? profileA?.user?.name?.split(" ")[0] ?? "Unknown",
                    profilePhoto: profileA?.profilePhoto ?? profileA?.user?.image,
                    phone: profileA?.user?.phoneNumber,
                    email: profileA?.user?.email,
                },
                userB: {
                    id: dm.userBId,
                    firstName: profileB?.firstName ?? profileB?.user?.name?.split(" ")[0] ?? "Unknown",
                    profilePhoto: profileB?.profilePhoto ?? profileB?.user?.image,
                    phone: profileB?.user?.phoneNumber,
                    email: profileB?.user?.email,
                },
            };
        })
    );
}

export async function getAdminScheduledDates() {
    await requireAdmin();

    const rows = await db
        .select()
        .from(dateMatches)
        .where(
            or(
                eq(dateMatches.status, "scheduled"),
                eq(dateMatches.status, "attended"),
                eq(dateMatches.status, "cancelled"),
                eq(dateMatches.status, "no_show")
            )
        )
        .orderBy(desc(dateMatches.createdAt));

    return Promise.all(
        rows.map(async (dm) => {
            const [profileA, profileB, feedbackRows] = await Promise.all([
                db.query.profiles.findFirst({ where: eq(profiles.userId, dm.userAId), with: { user: true } }),
                db.query.profiles.findFirst({ where: eq(profiles.userId, dm.userBId), with: { user: true } }),
                db.query.dateFeedback.findMany({ where: eq(dateFeedback.dateMatchId, dm.id) }),
            ]);
            return {
                ...dm,
                createdAt: dm.createdAt.toISOString(),
                userA: {
                    firstName: profileA?.firstName ?? profileA?.user?.name?.split(" ")[0] ?? "Unknown",
                    profilePhoto: profileA?.profilePhoto ?? profileA?.user?.image,
                },
                userB: {
                    firstName: profileB?.firstName ?? profileB?.user?.name?.split(" ")[0] ?? "Unknown",
                    profilePhoto: profileB?.profilePhoto ?? profileB?.user?.image,
                },
                feedbackCount: feedbackRows.length,
                avgRating: feedbackRows.length > 0
                    ? Math.round((feedbackRows.reduce((s, f) => s + f.rating, 0) / feedbackRows.length) * 10) / 10
                    : null,
            };
        })
    );
}

export async function getAdminUsers() {
    await requireAdmin();

    const rows = await db
        .select()
        .from(user)
        .orderBy(desc(user.createdAt))
        .limit(200);

    return Promise.all(
        rows.map(async (u) => {
            const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, u.id) });
            const [sentCount, receivedCount, matchCount] = await Promise.all([
                db.select({ cnt: count() }).from(dateRequests).where(eq(dateRequests.fromUserId, u.id)),
                db.select({ cnt: count() }).from(dateRequests).where(eq(dateRequests.toUserId, u.id)),
                db.select({ cnt: count() }).from(dateMatches).where(
                    or(eq(dateMatches.userAId, u.id), eq(dateMatches.userBId, u.id))
                ),
            ]);
            return {
                id: u.id,
                name: u.name,
                email: u.email,
                role: u.role,
                createdAt: u.createdAt.toISOString(),
                lastActive: u.lastActive.toISOString(),
                deletedAt: u.deletedAt?.toISOString() ?? null,
                profileComplete: profile?.profileCompleted ?? false,
                firstName: profile?.firstName ?? null,
                profilePhoto: profile?.profilePhoto ?? u.image,
                sentRequests: sentCount[0].cnt,
                receivedRequests: receivedCount[0].cnt,
                dateMatches: matchCount[0].cnt,
            };
        })
    );
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function scheduleDate(formData: FormData) {
    await requireAdmin();

    const matchId = formData.get("matchId") as string;
    const venueName = formData.get("venueName") as string;
    const venueAddress = formData.get("venueAddress") as string;
    const scheduledAt = formData.get("scheduledAt") as string;

    if (!matchId || !venueName || !scheduledAt) {
        throw new Error("Missing required fields");
    }

    const dm = await db.query.dateMatches.findFirst({ where: eq(dateMatches.id, matchId) });
    if (!dm) throw new Error("Date match not found");

    await db.update(dateMatches)
        .set({
            status: "scheduled",
            venueName: venueName || null,
            venueAddress: venueAddress || null,
            scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        })
        .where(eq(dateMatches.id, matchId));

    logEvent(EVENT_TYPES.DATE_SCHEDULED, null, { matchId, venueName }).catch(() => {});

    const [userA, userB] = await Promise.all([
        db.query.user.findFirst({ where: eq(user.id, dm.userAId) }),
        db.query.user.findFirst({ where: eq(user.id, dm.userBId) }),
    ]);
    const [profileA, profileB] = await Promise.all([
        db.query.profiles.findFirst({ where: eq(profiles.userId, dm.userAId) }),
        db.query.profiles.findFirst({ where: eq(profiles.userId, dm.userBId) }),
    ]);

    const nameA = profileA?.firstName ?? userA?.name?.split(" ")[0] ?? "your match";
    const nameB = profileB?.firstName ?? userB?.name?.split(" ")[0] ?? "your match";
    const dateStr = new Date(scheduledAt).toLocaleString("en-KE", {
        dateStyle: "medium",
        timeStyle: "short",
    });
    const body = `${venueName}, ${venueAddress} — ${dateStr}`;

    if (userA?.pushToken) {
        await sendPushNotification(userA.pushToken, {
            title: `Your date with ${nameB} is set! 📍`,
            body,
            data: { type: NOTIFICATION_TYPES.DATE_SCHEDULED },
        });
    }
    if (userB?.pushToken) {
        await sendPushNotification(userB.pushToken, {
            title: `Your date with ${nameA} is set! 📍`,
            body,
            data: { type: NOTIFICATION_TYPES.DATE_SCHEDULED },
        });
    }

    revalidatePath("/admin/pending-dates");
    revalidatePath("/admin/scheduled-dates");
    revalidatePath("/admin");
}

export async function updateDateMatchStatus(matchId: string, status: string) {
    await requireAdmin();

    const validStatuses = ["pending_setup", "scheduled", "attended", "cancelled", "no_show"];
    if (!validStatuses.includes(status)) throw new Error("Invalid status");

    await db.update(dateMatches)
        .set({ status: status as any })
        .where(eq(dateMatches.id, matchId));

    if (status === "attended") {
        logEvent(EVENT_TYPES.DATE_ATTENDED, null, { matchId }).catch(() => {});
        const dm = await db.query.dateMatches.findFirst({ where: eq(dateMatches.id, matchId) });
        if (dm) {
            const [userA, userB] = await Promise.all([
                db.query.user.findFirst({ where: eq(user.id, dm.userAId) }),
                db.query.user.findFirst({ where: eq(user.id, dm.userBId) }),
            ]);
            const [profileA, profileB] = await Promise.all([
                db.query.profiles.findFirst({ where: eq(profiles.userId, dm.userAId) }),
                db.query.profiles.findFirst({ where: eq(profiles.userId, dm.userBId) }),
            ]);
            const nameA = profileA?.firstName ?? userA?.name?.split(" ")[0] ?? "your date";
            const nameB = profileB?.firstName ?? userB?.name?.split(" ")[0] ?? "your date";

            if (userA?.pushToken) {
                await sendPushNotification(userA.pushToken, {
                    title: "How was your date? 💬",
                    body: `Leave feedback for your date with ${nameB}`,
                    data: { type: NOTIFICATION_TYPES.FEEDBACK_PROMPT, dateId: matchId, name: nameB },
                });
            }
            if (userB?.pushToken) {
                await sendPushNotification(userB.pushToken, {
                    title: "How was your date? 💬",
                    body: `Leave feedback for your date with ${nameA}`,
                    data: { type: NOTIFICATION_TYPES.FEEDBACK_PROMPT, dateId: matchId, name: nameA },
                });
            }
        }
    }

    revalidatePath("/admin/scheduled-dates");
    revalidatePath("/admin/pending-dates");
    revalidatePath("/admin");
}

export async function getAdminTimeSeries(days = 30) {
    await requireAdmin();

    const since = new Date();
    since.setUTCDate(since.getUTCDate() - days);
    since.setUTCHours(0, 0, 0, 0);

    const rows = await db
        .select({
            day: sql<string>`date_trunc('day', ${analyticsEvents.createdAt})::date::text`,
            eventType: analyticsEvents.eventType,
            cnt: count(),
        })
        .from(analyticsEvents)
        .where(gte(analyticsEvents.createdAt, since))
        .groupBy(
            sql`date_trunc('day', ${analyticsEvents.createdAt})::date::text`,
            analyticsEvents.eventType
        )
        .orderBy(sql`date_trunc('day', ${analyticsEvents.createdAt})::date::text`);

    // Build a map: day → { eventType: count }
    const byDay: Record<string, Record<string, number>> = {};
    for (const row of rows) {
        if (!byDay[row.day]) byDay[row.day] = {};
        byDay[row.day][row.eventType] = row.cnt;
    }

    // Fill missing days with zeros for the last N days
    const result: Array<{ date: string; [key: string]: number | string }> = [];
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setUTCDate(d.getUTCDate() - i);
        d.setUTCHours(0, 0, 0, 0);
        const key = d.toISOString().split("T")[0];
        result.push({
            date: key,
            date_request_sent: byDay[key]?.date_request_sent ?? 0,
            date_request_accepted: byDay[key]?.date_request_accepted ?? 0,
            date_scheduled: byDay[key]?.date_scheduled ?? 0,
            date_attended: byDay[key]?.date_attended ?? 0,
            feedback_submitted: byDay[key]?.feedback_submitted ?? 0,
        });
    }

    return result;
}

export async function setUserRole(userId: string, role: "user" | "admin") {
    await requireAdmin();
    await db.update(user).set({ role }).where(eq(user.id, userId));
    revalidatePath("/admin/users");
}

export async function suspendUser(userId: string) {
    await requireAdmin();
    await db.update(user).set({ deletedAt: new Date() }).where(eq(user.id, userId));
    revalidatePath("/admin/users");
}

export async function reinstateUser(userId: string) {
    await requireAdmin();
    await db.update(user).set({ deletedAt: null }).where(eq(user.id, userId));
    revalidatePath("/admin/users");
}
