"use server";

import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { analyticsEvents, mutualMatches, profiles, user } from "@/db/schema";
import { and, desc, eq, gte, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";

export interface PushNotificationDailyPoint {
    date: string;
    push_token_registered: number;
    push_pre_prompt_accepted: number;
    push_pre_prompt_dismissed: number;
}

export interface AdminPushNotificationUserRow {
    id: string;
    name: string;
    email: string | null;
    hasPush: boolean;
    lastActive: string | null;
    profileCompleted: boolean;
    inSlotFlow: boolean;
    inMutualMatch: boolean;
}

export interface AdminPushNotificationInsights {
    snapshot: {
        totalActiveUsers: number;
        pushEnabled: number;
        pushAdoptionPct: number;
        eligibleProfiles: number;
        eligibleWithPush: number;
        eligibleAdoptionPct: number;
        mutualMatchUsers: number;
        mutualMatchWithPush: number;
        slotFlowUsers: number;
        slotFlowWithPush: number;
        prePromptAccepted: number;
        prePromptDismissed: number;
        tokenRegistrationsLast7d: number;
        promptToRegisterPct: number;
    };
    timeSeries: PushNotificationDailyPoint[];
    recentUsers: AdminPushNotificationUserRow[];
}

function pct(numerator: number, denominator: number): number {
    if (denominator <= 0) return 0;
    return Math.round((numerator / denominator) * 100);
}

export async function getAdminPushNotificationInsights(
    days = 30,
): Promise<AdminPushNotificationInsights> {
    await requireAdmin();

    const since = new Date();
    since.setUTCDate(since.getUTCDate() - days);
    since.setUTCHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);

    const snapshotResult = await db.execute(sql`
        with active_users as (
            select id, push_token
            from "user"
            where deleted_at is null
              and coalesce(role, 'user') <> 'admin'
        ),
        eligible as (
            select p.user_id
            from profiles p
            inner join active_users u on u.id = p.user_id
            where coalesce(p.profile_completed, false) = true
        ),
        mutual_users as (
            select distinct mm.user_a_id as user_id
            from mutual_matches mm
            where mm.status in ('mutual', 'being_arranged', 'upcoming')
            union
            select distinct mm.user_b_id
            from mutual_matches mm
            where mm.status in ('mutual', 'being_arranged', 'upcoming')
        ),
        slot_users as (
            select distinct mm.user_a_id as user_id
            from mutual_matches mm
            where mm.slot_confirm_by is not null
            union
            select distinct mm.user_b_id
            from mutual_matches mm
            where mm.slot_confirm_by is not null
        )
        select
            (select count(*)::int from active_users) as total_active_users,
            (select count(*)::int from active_users where push_token is not null and length(trim(push_token)) > 0) as push_enabled,
            (select count(*)::int from eligible) as eligible_profiles,
            (select count(*)::int from eligible e inner join active_users u on u.id = e.user_id where u.push_token is not null and length(trim(u.push_token)) > 0) as eligible_with_push,
            (select count(*)::int from mutual_users) as mutual_match_users,
            (select count(*)::int from mutual_users m inner join active_users u on u.id = m.user_id where u.push_token is not null and length(trim(u.push_token)) > 0) as mutual_match_with_push,
            (select count(*)::int from slot_users) as slot_flow_users,
            (select count(*)::int from slot_users s inner join active_users u on u.id = s.user_id where u.push_token is not null and length(trim(u.push_token)) > 0) as slot_flow_with_push
    `);

    const snapshotRow = snapshotResult.rows?.[0] as {
        total_active_users: number;
        push_enabled: number;
        eligible_profiles: number;
        eligible_with_push: number;
        mutual_match_users: number;
        mutual_match_with_push: number;
        slot_flow_users: number;
        slot_flow_with_push: number;
    } | undefined;

    const promptStats = await db
        .select({
            outcome: sql<string>`${analyticsEvents.metadata}->>'outcome'`,
            cnt: sql<number>`count(*)::int`,
        })
        .from(analyticsEvents)
        .where(
            and(
                eq(analyticsEvents.eventType, "push_pre_prompt"),
                gte(analyticsEvents.createdAt, since),
            ),
        )
        .groupBy(sql`${analyticsEvents.metadata}->>'outcome'`);

    let prePromptAccepted = 0;
    let prePromptDismissed = 0;
    for (const row of promptStats) {
        if (row.outcome === "accepted") prePromptAccepted = row.cnt;
        if (row.outcome === "dismissed") prePromptDismissed = row.cnt;
    }

    const [{ tokenRegistrationsLast7d }] = await db
        .select({ tokenRegistrationsLast7d: sql<number>`count(*)::int` })
        .from(analyticsEvents)
        .where(
            and(
                eq(analyticsEvents.eventType, "push_token_registered"),
                gte(analyticsEvents.createdAt, sevenDaysAgo),
            ),
        );

    const eventRows = await db
        .select({
            day: sql<string>`date_trunc('day', ${analyticsEvents.createdAt})::date::text`,
            eventType: analyticsEvents.eventType,
            outcome: sql<string | null>`${analyticsEvents.metadata}->>'outcome'`,
            cnt: sql<number>`count(*)::int`,
        })
        .from(analyticsEvents)
        .where(
            and(
                gte(analyticsEvents.createdAt, since),
                or(
                    eq(analyticsEvents.eventType, "push_token_registered"),
                    eq(analyticsEvents.eventType, "push_pre_prompt"),
                ),
            ),
        )
        .groupBy(
            sql`date_trunc('day', ${analyticsEvents.createdAt})::date::text`,
            analyticsEvents.eventType,
            sql`${analyticsEvents.metadata}->>'outcome'`,
        )
        .orderBy(sql`date_trunc('day', ${analyticsEvents.createdAt})::date::text`);

    const byDay: Record<string, PushNotificationDailyPoint> = {};
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setUTCDate(d.getUTCDate() - i);
        const key = d.toISOString().slice(0, 10);
        byDay[key] = {
            date: key,
            push_token_registered: 0,
            push_pre_prompt_accepted: 0,
            push_pre_prompt_dismissed: 0,
        };
    }

    for (const row of eventRows) {
        const point = byDay[row.day];
        if (!point) continue;
        if (row.eventType === "push_token_registered") {
            point.push_token_registered += row.cnt;
        }
        if (row.eventType === "push_pre_prompt" && row.outcome === "accepted") {
            point.push_pre_prompt_accepted += row.cnt;
        }
        if (row.eventType === "push_pre_prompt" && row.outcome === "dismissed") {
            point.push_pre_prompt_dismissed += row.cnt;
        }
    }

    const timeSeries = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));

    const recentUserRows = await db
        .select({
            id: user.id,
            name: user.name,
            email: user.email,
            pushToken: user.pushToken,
            lastActive: user.lastActive,
            profileCompleted: profiles.profileCompleted,
        })
        .from(user)
        .leftJoin(profiles, eq(profiles.userId, user.id))
        .where(
            and(
                isNull(user.deletedAt),
                sql`coalesce(${user.role}, 'user') <> 'admin'`,
            ),
        )
        .orderBy(desc(user.lastActive))
        .limit(80);

    const userIds = recentUserRows.map((row) => row.id);
    const mutualSet = new Set<string>();
    const slotSet = new Set<string>();

    if (userIds.length > 0) {
        const activeMutualStatuses = ["mutual", "being_arranged", "upcoming"] as const;

        const mutualPairs = await db
            .select({
                userAId: mutualMatches.userAId,
                userBId: mutualMatches.userBId,
            })
            .from(mutualMatches)
            .where(
                and(
                    inArray(mutualMatches.status, [...activeMutualStatuses]),
                    or(
                        inArray(mutualMatches.userAId, userIds),
                        inArray(mutualMatches.userBId, userIds),
                    ),
                ),
            );

        for (const pair of mutualPairs) {
            if (userIds.includes(pair.userAId)) mutualSet.add(pair.userAId);
            if (userIds.includes(pair.userBId)) mutualSet.add(pair.userBId);
        }

        const slotPairs = await db
            .select({
                userAId: mutualMatches.userAId,
                userBId: mutualMatches.userBId,
            })
            .from(mutualMatches)
            .where(
                and(
                    isNotNull(mutualMatches.slotConfirmBy),
                    or(
                        inArray(mutualMatches.userAId, userIds),
                        inArray(mutualMatches.userBId, userIds),
                    ),
                ),
            );

        for (const pair of slotPairs) {
            if (userIds.includes(pair.userAId)) slotSet.add(pair.userAId);
            if (userIds.includes(pair.userBId)) slotSet.add(pair.userBId);
        }
    }

    const recentUsers: AdminPushNotificationUserRow[] = recentUserRows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        hasPush: Boolean(row.pushToken && row.pushToken.trim().length > 0),
        lastActive: row.lastActive?.toISOString() ?? null,
        profileCompleted: Boolean(row.profileCompleted),
        inMutualMatch: mutualSet.has(row.id),
        inSlotFlow: slotSet.has(row.id),
    }));

    const totalActiveUsers = snapshotRow?.total_active_users ?? 0;
    const pushEnabled = snapshotRow?.push_enabled ?? 0;
    const eligibleProfiles = snapshotRow?.eligible_profiles ?? 0;
    const eligibleWithPush = snapshotRow?.eligible_with_push ?? 0;

    return {
        snapshot: {
            totalActiveUsers,
            pushEnabled,
            pushAdoptionPct: pct(pushEnabled, totalActiveUsers),
            eligibleProfiles,
            eligibleWithPush,
            eligibleAdoptionPct: pct(eligibleWithPush, eligibleProfiles),
            mutualMatchUsers: snapshotRow?.mutual_match_users ?? 0,
            mutualMatchWithPush: snapshotRow?.mutual_match_with_push ?? 0,
            slotFlowUsers: snapshotRow?.slot_flow_users ?? 0,
            slotFlowWithPush: snapshotRow?.slot_flow_with_push ?? 0,
            prePromptAccepted,
            prePromptDismissed,
            tokenRegistrationsLast7d: tokenRegistrationsLast7d ?? 0,
            promptToRegisterPct: pct(tokenRegistrationsLast7d ?? 0, prePromptAccepted),
        },
        timeSeries,
        recentUsers,
    };
}
