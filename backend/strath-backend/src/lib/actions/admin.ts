"use server";

import { getAdminUserSummaryFromMap, loadAdminUserSummaries } from "@/lib/admin-user-summary";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import {
    user,
    profiles,
    dateRequests,
    dateMatches,
    dateFeedback,
    candidatePairs,
    mutualMatches,
    analyticsEvents,
    dateLocations,
    appFeatureFlags,
    adminBroadcasts,
    candidatePairHistory,
} from "@/db/schema";
import { eq, desc, count, and, or, gte, sql, isNotNull, isNull, inArray, ne } from "drizzle-orm";
import { logEvent, EVENT_TYPES } from "@/lib/analytics";
import { revalidatePath } from "next/cache";
import { sendPushNotification } from "@/lib/notifications";
import { NOTIFICATION_TYPES } from "@/lib/notification-types";
import { APP_FEATURE_KEYS, parseSignupCapConfig, type SignupCapConfig } from "@/lib/feature-flags";
import {
    admitEveryoneFromWaitlist,
    admitOrWaitlist,
    getAdmissionStats,
    releaseFromWaitlist,
    type GenderBucket,
} from "@/lib/services/admission-service";
import { bridgeMutualToBeingArranged, syncMutualMatchFromDateMatch } from "@/lib/services/mutual-match-service";
import { formatNairobiDateTime, parseNairobiDateTimeLocal } from "@/lib/nairobi-datetime";
import { Expo, type ExpoPushMessage } from "expo-server-sdk";

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
        db.select({
            totalRequestsAllTime: sql<number>`coalesce(sum((case when ${candidatePairs.aDecision} <> 'pending' then 1 else 0 end) + (case when ${candidatePairs.bDecision} <> 'pending' then 1 else 0 end)), 0)::int`,
        }).from(candidatePairs),
        db.select({
            requestsToday: sql<number>`coalesce(sum((case when ${candidatePairs.aDecision} <> 'pending' then 1 else 0 end) + (case when ${candidatePairs.bDecision} <> 'pending' then 1 else 0 end)), 0)::int`,
        }).from(candidatePairs).where(gte(candidatePairs.updatedAt, todayStart)),
        db.select({ totalAccepted: count() }).from(mutualMatches),
        db.select({
            totalDeclined: sql<number>`coalesce(sum((case when ${candidatePairs.aDecision} = 'passed' then 1 else 0 end) + (case when ${candidatePairs.bDecision} = 'passed' then 1 else 0 end)), 0)::int`,
        }).from(candidatePairs),
        db.select({ pendingSetup: count() }).from(dateMatches).where(
            eq(dateMatches.status, "pending_setup"),
        ),
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

    const [legacyRequests, pairs, mutuals, archivedPairRows] = await Promise.all([
        db.select().from(dateRequests).orderBy(desc(dateRequests.createdAt)),
        db.select().from(candidatePairs).orderBy(desc(candidatePairs.updatedAt)),
        db.select().from(mutualMatches).orderBy(desc(mutualMatches.createdAt)),
        db
            .select({ pairId: candidatePairHistory.pairId })
            .from(candidatePairHistory)
            .where(sql`${candidatePairHistory.metadata}->>'source' = 'admin_activity_archive'`),
    ]);
    const archivedPairIds = new Set(archivedPairRows.map((row) => row.pairId));
    const visiblePairs = pairs.filter((pair) => !archivedPairIds.has(pair.id));
    const visibleMutuals = mutuals.filter((match) => !archivedPairIds.has(match.candidatePairId));

    const userSummaries = await loadAdminUserSummaries([
        ...legacyRequests.flatMap((request) => [request.fromUserId, request.toUserId]),
        ...visiblePairs.flatMap((pair) => [pair.userAId, pair.userBId]),
        ...visibleMutuals.flatMap((match) => [match.userAId, match.userBId]),
    ]);

    function decisionMeta(decision: "open_to_meet" | "passed", pairStatus: string) {
        if (decision === "open_to_meet") {
            return {
                kind: "open_to_meet" as const,
                label: pairStatus === "active" ? "Interested" : "Interest ended",
            };
        }
        return { kind: "passed" as const, label: "Passed" };
    }

    const legacyRows = legacyRequests.map((request) => ({
        id: `legacy-${request.id}`,
        pairId: null,
        mutualMatchId: null,
        source: "legacy_request" as const,
        kind: "legacy_request" as const,
        label: "Direct invite",
        status: request.status,
        decision: null,
        pairStatus: null,
        compatibilityScore: null,
        matchReasons: [] as string[],
        message: request.message,
        vibe: request.vibe,
        createdAt: request.createdAt.toISOString(),
        updatedAt: request.updatedAt.toISOString(),
        fromUser: getAdminUserSummaryFromMap(userSummaries, request.fromUserId),
        toUser: getAdminUserSummaryFromMap(userSummaries, request.toUserId),
    }));

    const decisionRows = visiblePairs.flatMap((pair) => {
        const rows = [];
        if (pair.aDecision !== "pending") {
            const meta = decisionMeta(pair.aDecision, pair.status);
            rows.push({
                id: `pair-${pair.id}-a`,
                pairId: pair.id,
                mutualMatchId: null,
                source: "candidate_pair" as const,
                kind: meta.kind,
                label: meta.label,
                status: pair.aDecision,
                decision: pair.aDecision,
                pairStatus: pair.status,
                compatibilityScore: pair.compatibilityScore,
                matchReasons: pair.matchReasons,
                message: null,
                vibe: null,
                createdAt: pair.createdAt.toISOString(),
                updatedAt: pair.updatedAt.toISOString(),
                fromUser: getAdminUserSummaryFromMap(userSummaries, pair.userAId),
                toUser: getAdminUserSummaryFromMap(userSummaries, pair.userBId),
            });
        }
        if (pair.bDecision !== "pending") {
            const meta = decisionMeta(pair.bDecision, pair.status);
            rows.push({
                id: `pair-${pair.id}-b`,
                pairId: pair.id,
                mutualMatchId: null,
                source: "candidate_pair" as const,
                kind: meta.kind,
                label: meta.label,
                status: pair.bDecision,
                decision: pair.bDecision,
                pairStatus: pair.status,
                compatibilityScore: pair.compatibilityScore,
                matchReasons: pair.matchReasons,
                message: null,
                vibe: null,
                createdAt: pair.createdAt.toISOString(),
                updatedAt: pair.updatedAt.toISOString(),
                fromUser: getAdminUserSummaryFromMap(userSummaries, pair.userBId),
                toUser: getAdminUserSummaryFromMap(userSummaries, pair.userAId),
            });
        }
        return rows;
    });

    const mutualRows = visibleMutuals.map((match) => ({
        id: `mutual-${match.id}`,
        pairId: match.candidatePairId,
        mutualMatchId: match.id,
        source: "mutual_match" as const,
        kind: "mutual_match" as const,
        label: match.status === "cancelled" || match.status === "expired" ? "Mutual ended" : "Mutual match",
        status: match.status,
        decision: "accepted",
        pairStatus: match.status,
        compatibilityScore: null,
        matchReasons: [] as string[],
        message: null,
        vibe: null,
        createdAt: match.createdAt.toISOString(),
        updatedAt: match.updatedAt.toISOString(),
        fromUser: getAdminUserSummaryFromMap(userSummaries, match.userAId),
        toUser: getAdminUserSummaryFromMap(userSummaries, match.userBId),
    }));

    const rows = [...decisionRows, ...mutualRows, ...legacyRows].sort(
        (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
    );

    const filtered = statusFilter && statusFilter !== "all"
        ? rows.filter((row) => row.kind === statusFilter || row.status === statusFilter || row.pairStatus === statusFilter)
        : rows;

    return {
        rows: filtered,
        stats: {
            all: rows.length,
            openToMeet: decisionRows.filter((row) => row.kind === "open_to_meet").length,
            passed: decisionRows.filter((row) => row.kind === "passed").length,
            mutual: mutualRows.length,
            legacy: legacyRows.length,
            pendingPairs: visiblePairs.filter((pair) => pair.status === "active" && (pair.aDecision === "pending" || pair.bDecision === "pending")).length,
        },
    };
}

export async function archiveAdminMatchActivity(pairId: string) {
    const session = await requireAdmin();
    if (!pairId) throw new Error("Missing pair id");

    const pair = await db.query.candidatePairs.findFirst({
        where: eq(candidatePairs.id, pairId),
    });
    if (!pair) throw new Error("Candidate pair not found");

    await db.insert(candidatePairHistory).values({
        pairId,
        actorUserId: session.user.id,
        eventType: "closed",
        fromStatus: pair.status,
        toStatus: pair.status,
        metadata: {
            source: "admin_activity_archive",
            adminUserId: session.user.id,
        },
    });

    revalidatePath("/admin/date-requests");
    return { ok: true };
}

type DailyDiscoveryHealthRow = {
    eligibleProfiles: number;
    viewersWithShortlist: number;
    usersWithoutShortlist: number;
    shownEvents: number;
    exactlyFive: number;
    underFive: number;
    overFive: number;
    decisions: number;
    interested: number;
    passed: number;
    viewed: number;
    unmatchedOpenInterests: number;
    incomingInterestWaiting: number;
    reciprocalMatchesToday: number;
    activeManualCuratedPairs: number;
};

export async function getAdminDailyDiscoveryHealth() {
    await requireAdmin();

    const result = await db.execute(sql`
        with eligible_profiles as (
            select count(*)::int as eligible_profiles
            from profiles p
            join "user" u on u.id = p.user_id
            where u.deleted_at is null
              and coalesce(p.profile_completed, false) = true
              and coalesce(p.is_visible, true) = true
              and coalesce(p.discovery_paused, false) = false
              and coalesce(p.incognito_mode, false) = false
              and coalesce(p.role, 'user') <> 'admin'
              and coalesce(u.role, 'user') <> 'admin'
        ),
        today_shown as (
            select viewer_user_id, candidate_user_id
            from recommendation_events
            where source = 'daily_recommendations'
              and decision = 'shown'
              and (shown_at at time zone 'Africa/Nairobi')::date = (now() at time zone 'Africa/Nairobi')::date
        ),
        viewer_counts as (
            select viewer_user_id, count(distinct candidate_user_id)::int as candidate_count
            from today_shown
            group by viewer_user_id
        ),
        today_events as (
            select decision
            from recommendation_events
            where source = 'daily_recommendations'
              and (shown_at at time zone 'Africa/Nairobi')::date = (now() at time zone 'Africa/Nairobi')::date
        ),
        open_interests as (
            select viewer_user_id, candidate_user_id, matched_candidate_pair_id
            from user_match_interests
            where decision = 'open_to_meet'
        ),
        waiting_open_interests as (
            select a.viewer_user_id, a.candidate_user_id
            from open_interests a
            left join user_match_interests b
              on b.viewer_user_id = a.candidate_user_id
             and b.candidate_user_id = a.viewer_user_id
            where a.matched_candidate_pair_id is null
              and b.id is null
        ),
        active_manual_curated as (
            select count(distinct cp.id)::int as active_manual_curated_pairs
            from candidate_pairs cp
            join candidate_pair_history cph on cph.pair_id = cp.id
            where cp.status = 'active'
              and cph.event_type = 'generated'
              and cph.metadata->>'source' = 'admin_curated'
        )
        select
            (select eligible_profiles from eligible_profiles) as "eligibleProfiles",
            coalesce((select count(*)::int from viewer_counts), 0) as "viewersWithShortlist",
            greatest((select eligible_profiles from eligible_profiles) - coalesce((select count(*)::int from viewer_counts), 0), 0)::int as "usersWithoutShortlist",
            coalesce((select count(*)::int from today_shown), 0) as "shownEvents",
            coalesce((select count(*)::int from viewer_counts where candidate_count = 5), 0) as "exactlyFive",
            coalesce((select count(*)::int from viewer_counts where candidate_count < 5), 0) as "underFive",
            coalesce((select count(*)::int from viewer_counts where candidate_count > 5), 0) as "overFive",
            coalesce((select count(*)::int from today_events where decision in ('open_to_meet', 'passed')), 0) as "decisions",
            coalesce((select count(*)::int from today_events where decision = 'open_to_meet'), 0) as "interested",
            coalesce((select count(*)::int from today_events where decision = 'passed'), 0) as "passed",
            coalesce((select count(*)::int from today_events where decision = 'viewed'), 0) as "viewed",
            coalesce((select count(*)::int from open_interests where matched_candidate_pair_id is null), 0) as "unmatchedOpenInterests",
            coalesce((select count(*)::int from waiting_open_interests), 0) as "incomingInterestWaiting",
            coalesce((
                select count(*)::int
                from mutual_matches
                where (created_at at time zone 'Africa/Nairobi')::date = (now() at time zone 'Africa/Nairobi')::date
            ), 0) as "reciprocalMatchesToday",
            coalesce((select active_manual_curated_pairs from active_manual_curated), 0) as "activeManualCuratedPairs"
    `);

    const row = result.rows?.[0] as Partial<DailyDiscoveryHealthRow> | undefined;
    const health: DailyDiscoveryHealthRow = {
        eligibleProfiles: Number(row?.eligibleProfiles ?? 0),
        viewersWithShortlist: Number(row?.viewersWithShortlist ?? 0),
        usersWithoutShortlist: Number(row?.usersWithoutShortlist ?? 0),
        shownEvents: Number(row?.shownEvents ?? 0),
        exactlyFive: Number(row?.exactlyFive ?? 0),
        underFive: Number(row?.underFive ?? 0),
        overFive: Number(row?.overFive ?? 0),
        decisions: Number(row?.decisions ?? 0),
        interested: Number(row?.interested ?? 0),
        passed: Number(row?.passed ?? 0),
        viewed: Number(row?.viewed ?? 0),
        unmatchedOpenInterests: Number(row?.unmatchedOpenInterests ?? 0),
        incomingInterestWaiting: Number(row?.incomingInterestWaiting ?? 0),
        reciprocalMatchesToday: Number(row?.reciprocalMatchesToday ?? 0),
        activeManualCuratedPairs: Number(row?.activeManualCuratedPairs ?? 0),
    };

    return {
        ...health,
        decisionRate: health.shownEvents > 0 ? Math.round((health.decisions / health.shownEvents) * 100) : 0,
        interestedRate: health.decisions > 0 ? Math.round((health.interested / health.decisions) * 100) : 0,
    };
}

export async function getAdminPhotoIntelligenceOverview() {
    await requireAdmin();
    const { getPhotoIntelligenceAdminOverview } = await import(
        "@/lib/services/photo-intelligence-admin"
    );
    return getPhotoIntelligenceAdminOverview();
}

export async function moveMutualMatchToArranging(mutualMatchId: string) {
    const session = await requireAdmin();
    if (!mutualMatchId) throw new Error("Missing mutual match id");

    const mutual = await db.query.mutualMatches.findFirst({
        where: eq(mutualMatches.id, mutualMatchId),
    });
    if (!mutual) throw new Error("Mutual match not found");

    const movableStatuses = ["mutual", "being_arranged"] as const;
    if (!movableStatuses.includes(mutual.status as (typeof movableStatuses)[number])) {
        throw new Error(`This match is already ${mutual.status.replace(/_/g, " ")} and cannot be moved to Arranging.`);
    }

    const bridgeResult = await bridgeMutualToBeingArranged({
        user1Id: mutual.userAId,
        user2Id: mutual.userBId,
        candidatePairId: mutual.candidatePairId,
        mutualMatchId: mutual.id,
    });
    if (!bridgeResult) throw new Error("Could not move this match to Arranging");
    const didMoveToArranging = mutual.status !== "being_arranged";

    if (mutual.candidatePairId && didMoveToArranging) {
        await db.insert(candidatePairHistory).values({
            pairId: mutual.candidatePairId,
            actorUserId: session.user.id,
            eventType: "bridged_to_date",
            fromStatus: "mutual",
            toStatus: "mutual",
            metadata: {
                source: "admin_move_to_arranging",
                adminUserId: session.user.id,
                mutualMatchId: mutual.id,
                dateMatchId: bridgeResult.dateMatchId,
                previousMutualStatus: mutual.status,
            },
        });
    }

    const [userA, userB, profileA, profileB] = await Promise.all([
        db.query.user.findFirst({ where: eq(user.id, mutual.userAId) }),
        db.query.user.findFirst({ where: eq(user.id, mutual.userBId) }),
        db.query.profiles.findFirst({ where: eq(profiles.userId, mutual.userAId) }),
        db.query.profiles.findFirst({ where: eq(profiles.userId, mutual.userBId) }),
    ]);

    const nameA = profileA?.firstName ?? userA?.name?.split(" ")[0] ?? "your match";
    const nameB = profileB?.firstName ?? userB?.name?.split(" ")[0] ?? "your match";

    if (didMoveToArranging) {
        const pushData = {
            type: NOTIFICATION_TYPES.DATE_ARRANGING,
            mutualMatchId: mutual.id,
            pairId: mutual.candidatePairId ?? undefined,
            dateId: bridgeResult.dateMatchId,
            route: "/(tabs)/dates",
        };

        await Promise.all([
            userA?.pushToken
                ? sendPushNotification(userA.pushToken, {
                      title: "We're arranging your date",
                      body: `Your match with ${nameB} is now with the team. We'll reach out soon with the plan.`,
                      data: pushData,
                  }).catch((error) => {
                      console.error("[admin.moveMutualMatchToArranging] push failed for userA", {
                          mutualMatchId: mutual.id,
                          userId: mutual.userAId,
                          error,
                      });
                  })
                : Promise.resolve(),
            userB?.pushToken
                ? sendPushNotification(userB.pushToken, {
                      title: "We're arranging your date",
                      body: `Your match with ${nameA} is now with the team. We'll reach out soon with the plan.`,
                      data: pushData,
                  }).catch((error) => {
                      console.error("[admin.moveMutualMatchToArranging] push failed for userB", {
                          mutualMatchId: mutual.id,
                          userId: mutual.userBId,
                          error,
                      });
                  })
                : Promise.resolve(),
        ]);
    }

    revalidatePath("/admin/date-requests");
    revalidatePath("/admin/pending-dates");
    revalidatePath("/admin");

    return { ok: true, dateMatchId: bridgeResult.dateMatchId };
}

export async function getAdminPendingDates() {
    await requireAdmin();

    const rows = await db
        .select()
        .from(dateMatches)
        .where(eq(dateMatches.status, "pending_setup"))
        .orderBy(desc(dateMatches.createdAt));

    const userSummaries = await loadAdminUserSummaries(
        rows.flatMap((dm) => [dm.userAId, dm.userBId]),
    );

    return rows.map((dm) => {
        const userA = getAdminUserSummaryFromMap(userSummaries, dm.userAId);
        const userB = getAdminUserSummaryFromMap(userSummaries, dm.userBId);

        return {
            ...dm,
            createdAt: dm.createdAt.toISOString(),
            userA: {
                id: dm.userAId,
                firstName: userA.firstName,
                profilePhoto: userA.profilePhoto,
                phone: userA.phone,
                email: userA.email,
                location: userA.location,
            },
            userB: {
                id: dm.userBId,
                firstName: userB.firstName,
                profilePhoto: userB.profilePhoto,
                phone: userB.phone,
                email: userB.email,
                location: userB.location,
            },
        };
    });
}

export async function getAdminScheduledDates() {
    await requireAdmin();

    const rows = await db
        .select()
        .from(dateMatches)
        .where(eq(dateMatches.status, "scheduled"))
        .orderBy(desc(dateMatches.scheduledAt), desc(dateMatches.createdAt));

    const [userSummaries, feedbackRows] = await Promise.all([
        loadAdminUserSummaries(rows.flatMap((dm) => [dm.userAId, dm.userBId])),
        rows.length > 0
            ? db.query.dateFeedback.findMany({
                  where: inArray(
                      dateFeedback.dateMatchId,
                      rows.map((dm) => dm.id),
                  ),
              })
            : Promise.resolve([]),
    ]);

    const feedbackByMatchId = new Map<string, typeof feedbackRows>();
    for (const feedback of feedbackRows) {
        const existing = feedbackByMatchId.get(feedback.dateMatchId) ?? [];
        existing.push(feedback);
        feedbackByMatchId.set(feedback.dateMatchId, existing);
    }

    return rows.map((dm) => {
        const userA = getAdminUserSummaryFromMap(userSummaries, dm.userAId);
        const userB = getAdminUserSummaryFromMap(userSummaries, dm.userBId);
        const matchFeedback = feedbackByMatchId.get(dm.id) ?? [];

        return {
            ...dm,
            createdAt: dm.createdAt.toISOString(),
            scheduledAt: dm.scheduledAt?.toISOString() ?? null,
            userA: {
                firstName: userA.firstName,
                profilePhoto: userA.profilePhoto,
            },
            userB: {
                firstName: userB.firstName,
                profilePhoto: userB.profilePhoto,
            },
            feedbackCount: matchFeedback.length,
            avgRating: matchFeedback.length > 0
                ? Math.round((matchFeedback.reduce((sum, item) => sum + item.rating, 0) / matchFeedback.length) * 10) / 10
                : null,
        };
    });
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

    const [userSummaries, feedbackRows] = await Promise.all([
        loadAdminUserSummaries(rows.flatMap((dm) => [dm.userAId, dm.userBId])),
        rows.length > 0
            ? db.query.dateFeedback.findMany({
                  where: inArray(
                      dateFeedback.dateMatchId,
                      rows.map((dm) => dm.id),
                  ),
              })
            : Promise.resolve([]),
    ]);

    const feedbackByMatchId = new Map<string, typeof feedbackRows>();
    for (const feedback of feedbackRows) {
        const existing = feedbackByMatchId.get(feedback.dateMatchId) ?? [];
        existing.push(feedback);
        feedbackByMatchId.set(feedback.dateMatchId, existing);
    }

    return rows.map((dm) => {
        const userA = getAdminUserSummaryFromMap(userSummaries, dm.userAId);
        const userB = getAdminUserSummaryFromMap(userSummaries, dm.userBId);
        const matchFeedback = feedbackByMatchId.get(dm.id) ?? [];

        return {
            ...dm,
            createdAt: dm.createdAt.toISOString(),
            scheduledAt: dm.scheduledAt?.toISOString() ?? null,
            userA: {
                firstName: userA.firstName,
                profilePhoto: userA.profilePhoto,
            },
            userB: {
                firstName: userB.firstName,
                profilePhoto: userB.profilePhoto,
            },
            feedbackCount: matchFeedback.length,
            avgRating: matchFeedback.length > 0
                ? Math.round((matchFeedback.reduce((sum, item) => sum + item.rating, 0) / matchFeedback.length) * 10) / 10
                : null,
        };
    });
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

    const [[{ total }], rows] = await Promise.all([
        db.select({ total: count() }).from(user),
        db
            .select()
            .from(user)
            .orderBy(desc(user.createdAt)),
    ]);

    const userIds = rows.map((u) => u.id);
    const addCount = (map: Map<string, number>, userId: string, value: number) => {
        map.set(userId, (map.get(userId) ?? 0) + value);
    };

    const [
        profileRows,
        sentAsA,
        sentAsB,
        receivedAsA,
        receivedAsB,
        matchesAsA,
        matchesAsB,
    ] = userIds.length > 0
        ? await Promise.all([
            db.select().from(profiles).where(inArray(profiles.userId, userIds)),
            db
                .select({ userId: candidatePairs.userAId, cnt: count() })
                .from(candidatePairs)
                .where(and(inArray(candidatePairs.userAId, userIds), ne(candidatePairs.aDecision, "pending")))
                .groupBy(candidatePairs.userAId),
            db
                .select({ userId: candidatePairs.userBId, cnt: count() })
                .from(candidatePairs)
                .where(and(inArray(candidatePairs.userBId, userIds), ne(candidatePairs.bDecision, "pending")))
                .groupBy(candidatePairs.userBId),
            db
                .select({ userId: candidatePairs.userAId, cnt: count() })
                .from(candidatePairs)
                .where(and(inArray(candidatePairs.userAId, userIds), ne(candidatePairs.bDecision, "pending")))
                .groupBy(candidatePairs.userAId),
            db
                .select({ userId: candidatePairs.userBId, cnt: count() })
                .from(candidatePairs)
                .where(and(inArray(candidatePairs.userBId, userIds), ne(candidatePairs.aDecision, "pending")))
                .groupBy(candidatePairs.userBId),
            db
                .select({ userId: dateMatches.userAId, cnt: count() })
                .from(dateMatches)
                .where(inArray(dateMatches.userAId, userIds))
                .groupBy(dateMatches.userAId),
            db
                .select({ userId: dateMatches.userBId, cnt: count() })
                .from(dateMatches)
                .where(inArray(dateMatches.userBId, userIds))
                .groupBy(dateMatches.userBId),
        ])
        : [[], [], [], [], [], [], []];

    const profileByUserId = new Map(profileRows.map((profile) => [profile.userId, profile]));
    const sentByUserId = new Map<string, number>();
    const receivedByUserId = new Map<string, number>();
    const matchesByUserId = new Map<string, number>();

    for (const row of sentAsA) addCount(sentByUserId, row.userId, row.cnt);
    for (const row of sentAsB) addCount(sentByUserId, row.userId, row.cnt);
    for (const row of receivedAsA) addCount(receivedByUserId, row.userId, row.cnt);
    for (const row of receivedAsB) addCount(receivedByUserId, row.userId, row.cnt);
    for (const row of matchesAsA) addCount(matchesByUserId, row.userId, row.cnt);
    for (const row of matchesAsB) addCount(matchesByUserId, row.userId, row.cnt);

    const items = rows.map((u) => {
            const profile = profileByUserId.get(u.id);
            return {
                id: u.id,
                name: u.name,
                email: u.email,
                role: u.role,
                createdAt: u.createdAt.toISOString(),
                lastActive: u.lastActive.toISOString(),
                deletedAt: u.deletedAt?.toISOString() ?? null,
                deletedReason: u.deletedReason ?? null,
                deletedByUserId: u.deletedByUserId ?? null,
                phoneNumber: profile?.phoneNumber ?? u.phoneNumber,
                profileComplete: profile?.profileCompleted ?? false,
                isComplete: profile?.isComplete ?? false,
                firstName: profile?.firstName ?? null,
                lastName: profile?.lastName ?? null,
                profilePhoto: profile?.profilePhoto ?? u.profilePhoto ?? u.image,
                photos: profile?.photos ?? [],
                age: profile?.age ?? null,
                gender: profile?.gender ?? null,
                bio: profile?.bio ?? null,
                aboutMe: profile?.aboutMe ?? null,
                course: profile?.course ?? null,
                university: profile?.university ?? null,
                yearOfStudy: profile?.yearOfStudy ?? null,
                education: profile?.education ?? null,
                lookingFor: profile?.lookingFor ?? null,
                currentLocation: profile?.currentLocation ?? null,
                locationPermissionStatus: profile?.locationPermissionStatus ?? null,
                interests: profile?.interests ?? [],
                qualities: profile?.qualities ?? [],
                prompts: profile?.prompts ?? [],
                faceVerificationStatus: profile?.faceVerificationStatus ?? null,
                faceVerifiedAt: profile?.faceVerifiedAt?.toISOString() ?? null,
                faceVerificationRetryCount: profile?.faceVerificationRetryCount ?? 0,
                waitlistStatus: profile?.waitlistStatus ?? null,
                waitlistPosition: profile?.waitlistPosition ?? null,
                admittedAt: profile?.admittedAt?.toISOString() ?? null,
                isVisible: profile?.isVisible ?? null,
                anonymous: profile?.anonymous ?? null,
                discoveryPaused: profile?.discoveryPaused ?? null,
                aiConsentGranted: profile?.aiConsentGranted ?? null,
                sentRequests: sentByUserId.get(u.id) ?? 0,
                receivedRequests: receivedByUserId.get(u.id) ?? 0,
                dateMatches: matchesByUserId.get(u.id) ?? 0,
            };
        });

    return {
        total,
        items,
    };
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

    const scheduledAtUtc = parseNairobiDateTimeLocal(scheduledAt);

    await db.update(dateMatches)
        .set({
            status: "scheduled",
            locationId: location.id,
            venueName: location.name,
            venueAddress: location.address,
            scheduledAt: scheduledAtUtc,
        })
        .where(eq(dateMatches.id, matchId));

    // Keep the bridged mutualMatches row (mobile source of truth) in sync — flips
    // Arranging -> Upcoming on the mobile Dates tab and updates the home hold card.
    await syncMutualMatchFromDateMatch(matchId).catch((error) => {
        console.error("[admin.scheduleDate] syncMutualMatchFromDateMatch failed", {
            matchId,
            error,
        });
    });

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
    const dateStr = formatNairobiDateTime(scheduledAtUtc, {
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

    const validStatuses = ["pending_setup", "scheduled", "attended", "cancelled", "no_show"] as const;
    type DateMatchStatus = (typeof validStatuses)[number];
    if (!validStatuses.includes(status as DateMatchStatus)) throw new Error("Invalid status");
    const nextStatus = status as DateMatchStatus;
    const dm = await db.query.dateMatches.findFirst({ where: eq(dateMatches.id, matchId) });
    if (!dm) throw new Error("Date match not found");

    const update: Partial<typeof dateMatches.$inferInsert> = { status: nextStatus };
    if (nextStatus === "pending_setup") {
        update.locationId = null;
        update.venueName = null;
        update.venueAddress = null;
        update.scheduledAt = null;
    }

    await db.update(dateMatches)
        .set(update)
        .where(eq(dateMatches.id, matchId));

    if ((nextStatus === "cancelled" || nextStatus === "no_show") && dm.candidatePairId) {
        const [pair] = await db.update(candidatePairs)
            .set({ status: "expired", updatedAt: new Date() })
            .where(eq(candidatePairs.id, dm.candidatePairId))
            .returning({ id: candidatePairs.id });

        if (pair) {
            await db.insert(candidatePairHistory).values({
                pairId: pair.id,
                eventType: "expired",
                toStatus: "expired",
                metadata: {
                    source: "admin_date_status",
                    dateMatchId: matchId,
                    status: nextStatus,
                },
            });
        }
    }

    // Mirror the new admin status onto the linked mutualMatches row so the mobile Dates
    // tabs (Arranging / Upcoming) and home hold card reflect attendance / cancellations.
    await syncMutualMatchFromDateMatch(matchId).catch((error) => {
        console.error("[admin.updateDateMatchStatus] syncMutualMatchFromDateMatch failed", {
            matchId,
            status,
            error,
        });
    });

    if (status === "attended") {
        logEvent(EVENT_TYPES.DATE_ATTENDED, null, { matchId }).catch(() => {});
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

    const existingDefault = await db.query.dateLocations.findFirst({
        where: and(eq(dateLocations.isActive, true), eq(dateLocations.isDefault, true)),
    });

    await db.insert(dateLocations).values({
        name,
        address,
        vibe,
        notes: notes || null,
        isActive: true,
        isDefault: !existingDefault,
    });

    revalidatePath("/admin/locations");
    revalidatePath("/admin/pending-dates");
}

export async function setDefaultDateLocation(locationId: string) {
    await requireAdmin();

    const location = await db.query.dateLocations.findFirst({
        where: eq(dateLocations.id, locationId),
    });
    if (!location) {
        throw new Error("Location not found");
    }
    if (!location.isActive) {
        throw new Error("Only active locations can be the default venue");
    }

    await db.transaction(async (tx) => {
        await tx
            .update(dateLocations)
            .set({ isDefault: false })
            .where(eq(dateLocations.isDefault, true));
        await tx
            .update(dateLocations)
            .set({ isDefault: true })
            .where(eq(dateLocations.id, locationId));
    });

    revalidatePath("/admin/locations");
    revalidatePath("/admin/pending-dates");
}

export async function toggleDateLocation(locationId: string, nextActive: boolean) {
    await requireAdmin();

    await db
        .update(dateLocations)
        .set({
            isActive: nextActive,
            ...(nextActive ? {} : { isDefault: false }),
        })
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

const FLAG_DESCRIPTIONS: Record<string, string> = {
    [APP_FEATURE_KEYS.demoLoginEnabled]:
        "Allow the demo login button and demo session endpoint for App Review.",
    [APP_FEATURE_KEYS.signupCapEnabled]:
        "Gate new signups behind per-gender capacity limits during soft launch.",
    [APP_FEATURE_KEYS.adminMatchPreviewEnabled]:
        "Let admin accounts receive daily discovery results for QA while keeping admins out of normal users' candidate pools.",
    [APP_FEATURE_KEYS.paymentsEnabled]:
        "Require KES 499 Date Setup Fee (Paystack) before slot confirmation. Default off.",
};

const FLAG_LABELS: Record<string, string> = {
    [APP_FEATURE_KEYS.demoLoginEnabled]: "Demo Login",
    [APP_FEATURE_KEYS.signupCapEnabled]: "Signup Cap (Soft Launch)",
    [APP_FEATURE_KEYS.adminMatchPreviewEnabled]: "Admin Match Preview",
    [APP_FEATURE_KEYS.paymentsEnabled]: "Date Setup Fee (Payments)",
};

const SUPPORTED_FLAG_KEYS = new Set<string>(Object.values(APP_FEATURE_KEYS));

export async function getAdminFeatureFlags() {
    await requireAdmin();

    const rows = await db.select().from(appFeatureFlags);
    const byKey = new Map(rows.map((row) => [row.key, row]));

    return Object.values(APP_FEATURE_KEYS).map((key) => {
        const row = byKey.get(key);
        return {
            key,
            label: FLAG_LABELS[key] ?? key,
            description: row?.description ?? FLAG_DESCRIPTIONS[key] ?? "",
            enabled: row?.enabled ?? false,
            config: row?.config ?? {},
            updatedAt: row?.updatedAt?.toISOString() ?? null,
        };
    });
}

export async function setAdminFeatureFlag(key: string, enabled: boolean) {
    const session = await requireAdmin();

    if (!SUPPORTED_FLAG_KEYS.has(key)) {
        throw new Error("Unsupported feature flag");
    }

    await db
        .insert(appFeatureFlags)
        .values({
            key,
            enabled,
            updatedByUserId: session.user.id,
            description: FLAG_DESCRIPTIONS[key] ?? null,
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

// ─── Signup cap (soft launch) ────────────────────────────────────────────────

export async function getAdminSignupCapStats() {
    await requireAdmin();
    return getAdmissionStats();
}

export async function getAdminWaitlistedProfiles() {
    await requireAdmin();

    const rows = await db
        .select({
            userId: user.id,
            name: user.name,
            email: user.email,
            phoneNumber: user.phoneNumber,
            firstName: profiles.firstName,
            lastName: profiles.lastName,
            profilePhoneNumber: profiles.phoneNumber,
            gender: profiles.gender,
            course: profiles.course,
            university: profiles.university,
            waitlistPosition: profiles.waitlistPosition,
            createdAt: user.createdAt,
        })
        .from(profiles)
        .innerJoin(user, eq(user.id, profiles.userId))
        .where(and(eq(profiles.waitlistStatus, "waitlisted"), isNull(user.deletedAt)))
        .orderBy(profiles.gender, profiles.waitlistPosition, user.createdAt);

    return rows.map((row) => ({
        userId: row.userId,
        name: [row.firstName, row.lastName].filter(Boolean).join(" ").trim() || row.name,
        email: row.email,
        phoneNumber: row.profilePhoneNumber ?? row.phoneNumber,
        gender: row.gender,
        course: row.course,
        university: row.university,
        waitlistPosition: row.waitlistPosition,
        createdAt: row.createdAt.toISOString(),
    }));
}

export async function updateAdminSignupCapConfig(formData: FormData) {
    const session = await requireAdmin();

    const parsed: SignupCapConfig = parseSignupCapConfig({
        maxMale: formData.get("maxMale"),
        maxFemale: formData.get("maxFemale"),
        maxOther: formData.get("maxOther"),
    });

    await db
        .insert(appFeatureFlags)
        .values({
            key: APP_FEATURE_KEYS.signupCapEnabled,
            enabled: false,
            description: FLAG_DESCRIPTIONS[APP_FEATURE_KEYS.signupCapEnabled],
            config: parsed as unknown as Record<string, unknown>,
            updatedByUserId: session.user.id,
        })
        .onConflictDoUpdate({
            target: appFeatureFlags.key,
            set: {
                config: parsed as unknown as Record<string, unknown>,
                updatedByUserId: session.user.id,
                updatedAt: new Date(),
            },
        });

    // If the cap was raised, try to release anyone now within the new limits.
    const stats = await getAdmissionStats();
    const buckets: GenderBucket[] = ["male", "female", "other"];
    for (const bucket of buckets) {
        const max =
            bucket === "male"
                ? parsed.maxMale
                : bucket === "female"
                ? parsed.maxFemale
                : parsed.maxOther;
        const admittedNow = stats.admitted[bucket];
        const headroom = Math.max(0, max - admittedNow);
        if (headroom > 0) {
            await releaseFromWaitlist(headroom, bucket).catch((err) => {
                console.error(`[admin] auto-release for ${bucket} failed:`, err);
            });
        }
    }

    revalidatePath("/admin/feature-flags");
}

export async function releaseAdminWaitlist(bucket: GenderBucket, countToRelease: number) {
    await requireAdmin();
    const n = Math.max(0, Math.min(countToRelease, 1000));
    const result = await releaseFromWaitlist(n, bucket);
    revalidatePath("/admin/feature-flags");
    return result;
}

export async function admitSpecificUserFromWaitlist(identifier: string) {
    await requireAdmin();

    const trimmed = identifier.trim();
    if (!trimmed) throw new Error("Email or user ID is required");

    const isEmail = trimmed.includes("@");
    const targetUser = await db.query.user.findFirst({
        where: isEmail ? eq(user.email, trimmed.toLowerCase()) : eq(user.id, trimmed),
    });

    if (!targetUser) {
        throw new Error(`No user found for "${trimmed}"`);
    }

    const targetProfile = await db.query.profiles.findFirst({
        where: eq(profiles.userId, targetUser.id),
    });

    if (!targetProfile) {
        throw new Error("User has no profile yet");
    }

    const now = new Date();
    await db
        .update(profiles)
        .set({
            waitlistStatus: "admitted",
            waitlistPosition: null,
            admittedAt: now,
            updatedAt: now,
        })
        .where(eq(profiles.userId, targetUser.id));

    if (targetUser.pushToken) {
        sendPushNotification(targetUser.pushToken, {
            title: "You're in",
            body: "A spot opened up on StrathSpace. We'll start curating your match.",
            data: { type: NOTIFICATION_TYPES.ADMITTED_FROM_WAITLIST },
        }).catch((err) => {
            console.error("[admin] Failed to notify specifically admitted user:", err);
        });
    }

    revalidatePath("/admin/feature-flags");
    revalidatePath("/admin/users");
    revalidatePath("/admin/matchmaking");

    return {
        email: targetUser.email,
        userId: targetUser.id,
        previousStatus: targetProfile.waitlistStatus,
        admittedAt: now.toISOString(),
    };
}

export async function openAppToEveryone() {
    const session = await requireAdmin();

    // Turn the cap flag off.
    await db
        .insert(appFeatureFlags)
        .values({
            key: APP_FEATURE_KEYS.signupCapEnabled,
            enabled: false,
            description: FLAG_DESCRIPTIONS[APP_FEATURE_KEYS.signupCapEnabled],
            updatedByUserId: session.user.id,
        })
        .onConflictDoUpdate({
            target: appFeatureFlags.key,
            set: {
                enabled: false,
                updatedByUserId: session.user.id,
                updatedAt: new Date(),
            },
        });

    const released = await admitEveryoneFromWaitlist();
    revalidatePath("/admin/feature-flags");
    return released;
}

// ─── Admin broadcast push notifications ──────────────────────────────────────

export type BroadcastAudience =
    | "everyone"
    | "admitted"
    | "waitlisted"
    | "guys"
    | "ladies"
    | "other";

function audienceWhereClause(audience: BroadcastAudience) {
    switch (audience) {
        case "admitted":
            return eq(profiles.waitlistStatus, "admitted");
        case "waitlisted":
            return eq(profiles.waitlistStatus, "waitlisted");
        case "guys":
            return eq(profiles.gender, "male");
        case "ladies":
            return eq(profiles.gender, "female");
        case "other":
            return sql`(${profiles.gender} IS NULL OR ${profiles.gender} NOT IN ('male','female'))`;
        case "everyone":
        default:
            return undefined;
    }
}

export async function getAdminBroadcastAudienceCount(audience: BroadcastAudience) {
    await requireAdmin();

    const base = db
        .select({ cnt: count() })
        .from(user)
        .innerJoin(profiles, eq(profiles.userId, user.id))
        .where(and(isNotNull(user.pushToken), audienceWhereClause(audience)));

    const [{ cnt }] = await base;
    return cnt;
}

export async function sendAdminBroadcast(formData: FormData) {
    const session = await requireAdmin();

    const title = String(formData.get("title") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
    const audience = (String(formData.get("audience") ?? "everyone") as BroadcastAudience);

    if (!title) throw new Error("Title is required");
    if (!body) throw new Error("Message is required");

    const where = audienceWhereClause(audience);

    const recipients = await db
        .select({ pushToken: user.pushToken })
        .from(user)
        .innerJoin(profiles, eq(profiles.userId, user.id))
        .where(and(isNotNull(user.pushToken), where));

    const tokens = recipients
        .map((r) => r.pushToken)
        .filter((t): t is string => typeof t === "string" && Expo.isExpoPushToken(t));

    const expo = new Expo();
    const messages: ExpoPushMessage[] = tokens.map((to) => ({
        to,
        title,
        body,
        sound: "default",
        priority: "high",
        data: { type: NOTIFICATION_TYPES.ADMIN_ANNOUNCEMENT },
    }));

    const chunks = expo.chunkPushNotifications(messages);
    let successCount = 0;
    let failureCount = 0;

    for (const chunk of chunks) {
        try {
            const tickets = await expo.sendPushNotificationsAsync(chunk);
            for (const ticket of tickets) {
                if (ticket.status === "ok") successCount += 1;
                else failureCount += 1;
            }
        } catch (err) {
            console.error("[admin broadcast] chunk send failed:", err);
            failureCount += chunk.length;
        }
    }

    await db.insert(adminBroadcasts).values({
        title,
        body,
        audience,
        recipientCount: tokens.length,
        successCount,
        failureCount,
        sentByUserId: session.user.id,
    });

    revalidatePath("/admin/broadcast");

    return {
        recipientCount: tokens.length,
        successCount,
        failureCount,
    };
}

export async function getAdminBroadcastHistory(limit = 30) {
    await requireAdmin();
    const rows = await db
        .select()
        .from(adminBroadcasts)
        .orderBy(desc(adminBroadcasts.sentAt))
        .limit(limit);
    return rows.map((row) => ({
        ...row,
        sentAt: row.sentAt.toISOString(),
    }));
}

/**
 * Dev/testing helper: wipe a user's waitlist decision and re-run the admission
 * gate immediately. Useful for testing the waitlist flow without needing a
 * brand new account each time. Accepts either the user's email or user id.
 */
export async function resetUserAdmission(identifier: string) {
    await requireAdmin();

    const trimmed = identifier.trim();
    if (!trimmed) throw new Error("Email or user ID is required");

    const isEmail = trimmed.includes("@");
    const targetUser = await db.query.user.findFirst({
        where: isEmail ? eq(user.email, trimmed.toLowerCase()) : eq(user.id, trimmed),
    });

    if (!targetUser) {
        throw new Error(`No user found for "${trimmed}"`);
    }

    const targetProfile = await db.query.profiles.findFirst({
        where: eq(profiles.userId, targetUser.id),
        columns: { id: true, profileCompleted: true, isComplete: true },
    });

    if (!targetProfile) {
        throw new Error("User has no profile yet — nothing to reset");
    }

    // Wipe the waitlist decision.
    await db
        .update(profiles)
        .set({
            waitlistStatus: null,
            waitlistPosition: null,
            admittedAt: null,
            updatedAt: new Date(),
        })
        .where(eq(profiles.userId, targetUser.id));

    // If they've finished onboarding, re-run the gate so the new decision
    // reflects the current cap settings right away. Otherwise leave them
    // pending — they'll hit the gate naturally when they finish onboarding.
    const hasCompletedProfile =
        targetProfile.profileCompleted === true || targetProfile.isComplete === true;

    let admission: Awaited<ReturnType<typeof admitOrWaitlist>> | null = null;
    if (hasCompletedProfile) {
        admission = await admitOrWaitlist(targetUser.id);
    }

    revalidatePath("/admin/feature-flags");
    revalidatePath("/admin/users");

    return {
        email: targetUser.email,
        userId: targetUser.id,
        reRan: hasCompletedProfile,
        admission,
    };
}

export async function setUserRole(userId: string, role: "user" | "admin") {
    await requireAdmin();
    await db.update(user).set({ role }).where(eq(user.id, userId));
    await db.update(profiles).set({ role }).where(eq(profiles.userId, userId));
    revalidatePath("/admin/users");
}

export async function suspendUser(userId: string) {
    const session = await requireAdmin();
    await db.update(user).set({
        deletedAt: new Date(),
        deletedReason: "admin_suspended",
        deletedByUserId: session.user.id,
    }).where(eq(user.id, userId));
    revalidatePath("/admin/users");
}

export async function reinstateUser(userId: string) {
    await requireAdmin();
    await db.update(user).set({
        deletedAt: null,
        deletedReason: null,
        deletedByUserId: null,
    }).where(eq(user.id, userId));
    revalidatePath("/admin/users");
}
