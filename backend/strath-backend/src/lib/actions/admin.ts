"use server";

import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import {
    user,
    profiles,
    dateRequests,
    dateMatches,
    dateFeedback,
    datePayments,
    userCredits,
    analyticsEvents,
    dateLocations,
    vibeChecks,
    appFeatureFlags,
} from "@/db/schema";
import { eq, desc, count, and, or, inArray, gte, lt, sql } from "drizzle-orm";
import { logEvent, EVENT_TYPES } from "@/lib/analytics";
import { revalidatePath } from "next/cache";
import { sendPushNotification } from "@/lib/notifications";
import { NOTIFICATION_TYPES } from "@/lib/notification-types";
import { APP_FEATURE_KEYS } from "@/lib/feature-flags";
import {
    getUserCreditBalanceCents,
} from "@/lib/services/payments-service";

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
        [{ onCall }],
    ] = await Promise.all([
        db.select({ totalUsers: count() }).from(user),
        db.select({ totalRequestsAllTime: count() }).from(dateRequests),
        db.select({ requestsToday: count() }).from(dateRequests).where(gte(dateRequests.createdAt, todayStart)),
        db.select({ totalAccepted: count() }).from(dateRequests).where(eq(dateRequests.status, "accepted")),
        db.select({ totalDeclined: count() }).from(dateRequests).where(eq(dateRequests.status, "declined")),
        db.select({ pendingSetup: count() }).from(dateMatches).where(
            and(
                eq(dateMatches.status, "pending_setup"),
                eq(dateMatches.callCompleted, true),
                eq(dateMatches.userAConfirmed, true),
                eq(dateMatches.userBConfirmed, true),
                // Payment-gated: matches awaiting payment are NOT in the
                // admin "arranging" queue yet (docs/payment.md §4.1).
                inArray(dateMatches.paymentState, ["not_required", "being_arranged"]),
            )
        ),
        db.select({ scheduled: count() }).from(dateMatches).where(eq(dateMatches.status, "scheduled")),
        db.select({ attended: count() }).from(dateMatches).where(eq(dateMatches.status, "attended")),
        db.select({ onCall: count() }).from(vibeChecks).where(
            or(
                eq(vibeChecks.status, "pending"),
                eq(vibeChecks.status, "scheduled"),
                eq(vibeChecks.status, "active"),
            )
        ),
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
        onCall,
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
                    phone: fromProfile?.phoneNumber ?? fromProfile?.user?.phoneNumber,
                    location: fromProfile?.currentLocation,
                },
                toUser: {
                    firstName: toProfile?.firstName ?? toProfile?.user?.name?.split(" ")[0] ?? "Unknown",
                    profilePhoto: toProfile?.profilePhoto ?? toProfile?.user?.image,
                    email: toProfile?.user?.email,
                    phone: toProfile?.phoneNumber ?? toProfile?.user?.phoneNumber,
                    location: toProfile?.currentLocation,
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
        .where(
            and(
                eq(dateMatches.status, "pending_setup"),
                eq(dateMatches.callCompleted, true),
                eq(dateMatches.userAConfirmed, true),
                eq(dateMatches.userBConfirmed, true),
                // Payment-gated (docs/payment.md §4.1): admin only sees pairs
                // that either didn't need to pay (flag off / legacy rows) or
                // have already completed payment on both sides.
                inArray(dateMatches.paymentState, ["not_required", "being_arranged"]),
            )
        )
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
                    phone: profileA?.phoneNumber ?? profileA?.user?.phoneNumber,
                    email: profileA?.user?.email,
                    location: profileA?.currentLocation,
                },
                userB: {
                    id: dm.userBId,
                    firstName: profileB?.firstName ?? profileB?.user?.name?.split(" ")[0] ?? "Unknown",
                    profilePhoto: profileB?.profilePhoto ?? profileB?.user?.image,
                    phone: profileB?.phoneNumber ?? profileB?.user?.phoneNumber,
                    email: profileB?.user?.email,
                    location: profileB?.currentLocation,
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
        .where(eq(dateMatches.status, "scheduled"))
        .orderBy(desc(dateMatches.scheduledAt), desc(dateMatches.createdAt));

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
                scheduledAt: dm.scheduledAt?.toISOString() ?? null,
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

export async function getAdminOnCallSessions() {
    await requireAdmin();

    const rows = await db
        .select()
        .from(vibeChecks)
        .where(
            or(
                eq(vibeChecks.status, "pending"),
                eq(vibeChecks.status, "scheduled"),
                eq(vibeChecks.status, "active"),
            )
        )
        .orderBy(desc(vibeChecks.startedAt), desc(vibeChecks.scheduledAt), desc(vibeChecks.createdAt));

    return Promise.all(
        rows.map(async (check) => {
            const [profileA, profileB, dateMatch] = await Promise.all([
                db.query.profiles.findFirst({ where: eq(profiles.userId, check.user1Id), with: { user: true } }),
                db.query.profiles.findFirst({ where: eq(profiles.userId, check.user2Id), with: { user: true } }),
                db.query.dateMatches.findFirst({
                    where: or(
                        and(eq(dateMatches.userAId, check.user1Id), eq(dateMatches.userBId, check.user2Id)),
                        and(eq(dateMatches.userAId, check.user2Id), eq(dateMatches.userBId, check.user1Id)),
                    ),
                }),
            ]);

            return {
                ...check,
                createdAt: check.createdAt.toISOString(),
                scheduledAt: check.scheduledAt?.toISOString() ?? null,
                startedAt: check.startedAt?.toISOString() ?? null,
                endedAt: check.endedAt?.toISOString() ?? null,
                userA: {
                    id: check.user1Id,
                    firstName: profileA?.firstName ?? profileA?.user?.name?.split(" ")[0] ?? "Unknown",
                    email: profileA?.user?.email,
                    phone: profileA?.phoneNumber ?? profileA?.user?.phoneNumber,
                    location: profileA?.currentLocation,
                },
                userB: {
                    id: check.user2Id,
                    firstName: profileB?.firstName ?? profileB?.user?.name?.split(" ")[0] ?? "Unknown",
                    email: profileB?.user?.email,
                    phone: profileB?.phoneNumber ?? profileB?.user?.phoneNumber,
                    location: profileB?.currentLocation,
                },
                dateMatchId: dateMatch?.id ?? null,
                dateMatchStatus: dateMatch?.status ?? null,
                callCompleted: dateMatch?.callCompleted ?? false,
            };
        })
    );
}

export async function getAdminDateHistory() {
    await requireAdmin();

    const rows = await db
        .select()
        .from(dateMatches)
        .where(
            or(
                eq(dateMatches.status, "attended"),
                eq(dateMatches.status, "cancelled"),
                eq(dateMatches.status, "no_show")
            )
        )
        .orderBy(desc(dateMatches.scheduledAt), desc(dateMatches.createdAt));

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
                scheduledAt: dm.scheduledAt?.toISOString() ?? null,
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

export async function getAdminDateLocations(includeInactive = false) {
    await requireAdmin();

    const baseQuery = db
        .select()
        .from(dateLocations);

    const rows = includeInactive
        ? await baseQuery.orderBy(desc(dateLocations.createdAt))
        : await baseQuery.where(eq(dateLocations.isActive, true)).orderBy(desc(dateLocations.createdAt));

    return rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    }));
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
    const locationId = formData.get("locationId") as string;
    const scheduledAt = formData.get("scheduledAt") as string;

    if (!matchId || !locationId || !scheduledAt) {
        throw new Error("Missing required fields");
    }

    const dm = await db.query.dateMatches.findFirst({ where: eq(dateMatches.id, matchId) });
    if (!dm) throw new Error("Date match not found");

    const location = await db.query.dateLocations.findFirst({
        where: and(eq(dateLocations.id, locationId), eq(dateLocations.isActive, true)),
    });
    if (!location) throw new Error("Location not found");

    await db.update(dateMatches)
        .set({
            status: "scheduled",
            locationId: location.id,
            venueName: location.name,
            venueAddress: location.address,
            scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
            // Mirror the payment state to `confirmed` for rows that went
            // through the paid flow. Legacy rows stay at `not_required`.
            paymentState: dm.paymentState === "being_arranged"
                ? "confirmed"
                : dm.paymentState ?? "not_required",
        })
        .where(eq(dateMatches.id, matchId));

    logEvent(EVENT_TYPES.DATE_SCHEDULED, null, { matchId, venueName: location.name, locationId }).catch(() => {});

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
    const body = `${location.name}, ${location.address} — ${dateStr}`;

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
    revalidatePath("/admin/history");
    revalidatePath("/admin/locations");
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
    revalidatePath("/admin/history");
    revalidatePath("/admin");
}

export async function createDateLocation(formData: FormData) {
    await requireAdmin();

    const name = String(formData.get("name") ?? "").trim();
    const address = String(formData.get("address") ?? "").trim();
    const vibeValue = String(formData.get("vibe") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim();

    if (!name || !address) {
        throw new Error("Location name and address are required");
    }

    const vibe =
        vibeValue === "coffee" || vibeValue === "walk" || vibeValue === "dinner" || vibeValue === "hangout"
            ? vibeValue
            : null;

    await db.insert(dateLocations).values({
        name,
        address,
        vibe,
        notes: notes || null,
        isActive: true,
    });

    revalidatePath("/admin/locations");
    revalidatePath("/admin/pending-dates");
}

export async function toggleDateLocation(locationId: string, nextActive: boolean) {
    await requireAdmin();

    await db
        .update(dateLocations)
        .set({ isActive: nextActive })
        .where(eq(dateLocations.id, locationId));

    revalidatePath("/admin/locations");
    revalidatePath("/admin/pending-dates");
}

export async function updateDateLocation(formData: FormData) {
    await requireAdmin();

    const locationId = String(formData.get("locationId") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    const address = String(formData.get("address") ?? "").trim();
    const vibeValue = String(formData.get("vibe") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim();

    if (!locationId || !name || !address) {
        throw new Error("Location id, name, and address are required");
    }

    const vibe =
        vibeValue === "coffee" || vibeValue === "walk" || vibeValue === "dinner" || vibeValue === "hangout"
            ? vibeValue
            : null;

    await db
        .update(dateLocations)
        .set({
            name,
            address,
            vibe,
            notes: notes || null,
        })
        .where(eq(dateLocations.id, locationId));

    revalidatePath("/admin/locations");
    revalidatePath("/admin/pending-dates");
    revalidatePath("/admin/scheduled-dates");
}

export async function deleteDateLocation(locationId: string) {
    await requireAdmin();

    if (!locationId) {
        throw new Error("Location id is required");
    }

    await db.delete(dateLocations).where(eq(dateLocations.id, locationId));

    revalidatePath("/admin/locations");
    revalidatePath("/admin/pending-dates");
    revalidatePath("/admin/scheduled-dates");
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
    type TimeSeriesPoint = {
        date: string;
        date_request_sent: number;
        date_request_accepted: number;
        date_scheduled: number;
        date_attended: number;
        feedback_submitted: number;
    };
    const result: TimeSeriesPoint[] = [];
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

const FLAG_METADATA: Record<
    string,
    { label: string; description: string }
> = {
    [APP_FEATURE_KEYS.demoLoginEnabled]: {
        label: "Demo Login",
        description:
            "Controls whether the Apple review demo button appears on the mobile login screen and whether the demo auth endpoint accepts sign-ins.",
    },
    [APP_FEATURE_KEYS.paymentsEnabled]: {
        label: "Payments — Date Coordination Fee",
        description:
            "Master switch for the KES 200 pay-per-date flow. When OFF, every date bypasses the paywall and flows straight from post-call confirmation to admin scheduling (legacy behaviour). When ON, both users must pay before we arrange the date.",
    },
};

const SUPPORTED_FLAG_KEYS = Object.values(APP_FEATURE_KEYS) as string[];

export async function getAdminFeatureFlags() {
    await requireAdmin();

    const rows = await db.select().from(appFeatureFlags);
    const byKey = new Map(rows.map((row) => [row.key, row]));

    return SUPPORTED_FLAG_KEYS.map((key) => ({
        key,
        label: FLAG_METADATA[key]?.label ?? key,
        description: FLAG_METADATA[key]?.description ?? "",
        enabled: byKey.get(key)?.enabled ?? false,
        updatedAt: byKey.get(key)?.updatedAt?.toISOString() ?? null,
    }));
}

export async function setAdminFeatureFlag(key: string, enabled: boolean) {
    const session = await requireAdmin();

    if (!SUPPORTED_FLAG_KEYS.includes(key)) {
        throw new Error("Unsupported feature flag");
    }

    await db
        .insert(appFeatureFlags)
        .values({
            key,
            enabled,
            updatedByUserId: session.user.id,
            description: FLAG_METADATA[key]?.description ?? null,
        })
        .onConflictDoUpdate({
            target: appFeatureFlags.key,
            set: {
                enabled,
                updatedByUserId: session.user.id,
                updatedAt: new Date(),
            },
        });

    revalidatePath("/admin/feature-flags");
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

// ─── Payments (docs/payment.md §13) ─────────────────────────────────────────

export interface AdminMatchPaymentRow {
    id: string;
    userId: string;
    firstName: string;
    amountCents: number;
    currency: string;
    provider: "revenuecat" | "credit" | "manual";
    status: "pending" | "paid" | "failed" | "refunded" | "credited";
    paidAt: string | null;
    refundedAt: string | null;
    refundReason: string | null;
    productId: string;
    revenuecatTransactionId: string | null;
    creditBalanceCents: number;
}

export interface AdminMatchPaymentsSummary {
    dateMatchId: string;
    paymentState: string;
    paymentDueBy: string | null;
    rows: AdminMatchPaymentRow[];
}

/**
 * Pulls every payment row attached to a single date match plus each user's
 * current credit balance. Admins use this to decide whether to refund a
 * charge, grant a goodwill credit, or confirm an off-platform make-good.
 */
export async function getAdminMatchPayments(
    dateMatchId: string,
): Promise<AdminMatchPaymentsSummary | null> {
    await requireAdmin();

    const match = await db.query.dateMatches.findFirst({
        where: eq(dateMatches.id, dateMatchId),
    });
    if (!match) return null;

    const payments = await db
        .select()
        .from(datePayments)
        .where(eq(datePayments.dateMatchId, dateMatchId))
        .orderBy(desc(datePayments.createdAt));

    const userIds = Array.from(new Set([match.userAId, match.userBId]));
    const profileRows = await db
        .select({ userId: profiles.userId, firstName: profiles.firstName })
        .from(profiles)
        .where(inArray(profiles.userId, userIds));

    const nameByUserId = new Map(profileRows.map((r) => [r.userId, r.firstName]));

    const balances = await Promise.all(
        userIds.map(async (uid) => ({
            userId: uid,
            balance: await getUserCreditBalanceCents(uid),
        })),
    );
    const balanceByUserId = new Map(balances.map((b) => [b.userId, b.balance]));

    // Build a row per user — even if they haven't paid yet, so the admin
    // panel can show "not paid" state and a "grant credit" affordance.
    const rows: AdminMatchPaymentRow[] = [];
    for (const uid of userIds) {
        const payment = payments.find((p) => p.userId === uid);
        rows.push({
            id: payment?.id ?? `placeholder-${uid}`,
            userId: uid,
            firstName: nameByUserId.get(uid) ?? "User",
            amountCents: payment?.amountCents ?? 0,
            currency: payment?.currency ?? "KES",
            provider: payment?.provider ?? "revenuecat",
            status: payment?.status ?? "pending",
            paidAt: payment?.paidAt?.toISOString() ?? null,
            refundedAt: payment?.refundedAt?.toISOString() ?? null,
            refundReason: payment?.refundReason ?? null,
            productId: payment?.productId ?? "",
            revenuecatTransactionId: payment?.revenuecatTransactionId ?? null,
            creditBalanceCents: balanceByUserId.get(uid) ?? 0,
        });
    }

    return {
        dateMatchId,
        paymentState: match.paymentState ?? "not_required",
        paymentDueBy: match.paymentDueBy?.toISOString() ?? null,
        rows,
    };
}

/**
 * Marks a `date_payments` row as refunded. Store-side refunds for IAP must
 * still be issued through App Store / Play Console — this action only records
 * the decision on our side and (optionally) issues a make-good credit.
 *
 * Docs: `payment.md §13`.
 */
export async function refundDatePayment(input: {
    paymentId: string;
    reason: string;
    grantCredit?: boolean;
}) {
    const session = await requireAdmin();

    const payment = await db.query.datePayments.findFirst({
        where: eq(datePayments.id, input.paymentId),
    });
    if (!payment) throw new Error("Payment not found");
    if (payment.status === "refunded") {
        throw new Error("Payment is already refunded");
    }
    if (payment.status !== "paid" && payment.status !== "credited") {
        throw new Error("Only paid or credited payments can be refunded");
    }

    const now = new Date();

    await db
        .update(datePayments)
        .set({
            status: "refunded",
            refundedAt: now,
            refundReason: input.reason.slice(0, 500),
            updatedAt: now,
        })
        .where(eq(datePayments.id, payment.id));

    // Reflect the refund on the match itself so the user-facing list updates.
    await db
        .update(dateMatches)
        .set({ paymentState: "refunded" })
        .where(eq(dateMatches.id, payment.dateMatchId));

    // Make-good credit (mirrors `grantPartnerDidNotPayCredit` but tagged
    // `admin_refund` so we can account for it separately in reports).
    if (input.grantCredit) {
        await db.insert(userCredits).values({
            userId: payment.userId,
            amountCents: payment.amountCents,
            currency: payment.currency,
            reason: "admin_refund",
            dateMatchId: payment.dateMatchId,
            adminUserId: session.user.id,
        });

        // Best-effort push — don't fail the action if the user has no token.
        const u = await db.query.user.findFirst({ where: eq(user.id, payment.userId) });
        if (u?.pushToken) {
            await sendPushNotification(u.pushToken, {
                title: "Refund issued",
                body: `You received KES ${(payment.amountCents / 100).toFixed(0)} in StrathSpace credit.`,
                data: { type: NOTIFICATION_TYPES.CREDIT_GRANTED },
            }).catch(() => {});
        }
    }

    logEvent(EVENT_TYPES.PAYMENT_REFUNDED, session.user.id, {
        paymentId: payment.id,
        dateMatchId: payment.dateMatchId,
        userId: payment.userId,
        amountCents: payment.amountCents,
        grantCredit: !!input.grantCredit,
        reason: input.reason,
    }).catch(() => {});

    revalidatePath("/admin/pending-dates");
    revalidatePath("/admin/scheduled-dates");
    revalidatePath("/admin/history");
    revalidatePath("/admin/on-call");
}

/**
 * Drops goodwill / promo / make-good credit into a user's ledger. Amount is
 * in KES cents so the client never has to worry about currency math.
 *
 * Reasons mirror the `user_credits.reason` enum exactly.
 */
export async function grantUserCredit(input: {
    userId: string;
    amountCents: number;
    reason: "goodwill" | "promo" | "admin_refund" | "partner_did_not_pay";
    dateMatchId?: string | null;
    notifyUser?: boolean;
}) {
    const session = await requireAdmin();

    if (!Number.isFinite(input.amountCents) || input.amountCents <= 0) {
        throw new Error("Amount must be a positive number");
    }
    if (input.amountCents > 100_00 * 50) {
        // Safety cap: no accidental KES 50_000 credits from a typo.
        throw new Error("Amount exceeds admin grant limit");
    }

    const u = await db.query.user.findFirst({ where: eq(user.id, input.userId) });
    if (!u) throw new Error("User not found");

    await db.insert(userCredits).values({
        userId: input.userId,
        amountCents: input.amountCents,
        currency: "KES",
        reason: input.reason,
        dateMatchId: input.dateMatchId ?? null,
        adminUserId: session.user.id,
    });

    if (input.notifyUser && u.pushToken) {
        await sendPushNotification(u.pushToken, {
            title: "You received StrathSpace credit",
            body: `KES ${(input.amountCents / 100).toFixed(0)} was added to your account.`,
            data: { type: NOTIFICATION_TYPES.CREDIT_GRANTED },
        }).catch(() => {});
    }

    logEvent(EVENT_TYPES.CREDIT_GRANTED, session.user.id, {
        targetUserId: input.userId,
        amountCents: input.amountCents,
        reason: input.reason,
        dateMatchId: input.dateMatchId ?? null,
    }).catch(() => {});

    revalidatePath("/admin/pending-dates");
    revalidatePath("/admin/scheduled-dates");
    revalidatePath("/admin/history");
}
