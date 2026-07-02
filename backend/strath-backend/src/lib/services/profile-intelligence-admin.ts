import { and, eq, gte, sql } from "drizzle-orm";

import db from "@/db/drizzle";
import {
    candidatePairs,
    dailyShortlists,
    matchmakerIntents,
    mutualMatches,
    profiles,
    profileIntelligence,
    profileIntelligenceJobs,
    recommendationEvents,
    user,
    userMatchInterests,
} from "@/db/schema";
import { nairobiDayKey } from "@/lib/matching/candidate-pool-policy";

export type ProfileIntelligenceAlert = {
    severity: "info" | "warning" | "critical";
    message: string;
};

export type ProfileIntelligenceAdminOverview = {
    generatedAt: string;
    systemStatus: "healthy" | "warning" | "critical";
    alerts: ProfileIntelligenceAlert[];
    coverage: {
        eligibleProfiles: number;
        intelligenceRecords: number;
        coveragePct: number;
        staleRecords: number;
        stalePct: number;
        avgCandidateStrength: number;
        avgActivityScore: number;
        avgResponseScore: number;
        failedJobs: number;
        pendingJobs: number;
        processingJobs: number;
        matchmakerRequests7d: number;
    };
    dailyRecommendations: {
        shortlistDay: string;
        viewersWithShortlist: number;
        activeUsersShown: number;
        dormantUsersShown: number;
        shortlistOverFiveCount: number;
        decisions: number;
        decisionRatePct: number;
        openToMeetCount: number;
        openToMeetRatePct: number;
        reciprocalMatchesToday: number;
        incomingInterestWaitingCount: number;
    };
    rolling30d: {
        decisions: number;
        openToMeetCount: number;
        openToMeetRatePct: number;
        reciprocalMatchRatePct: number;
        mutualMatches: number;
        averageTimeToFirstMutualHours: number | null;
    };
    tuning: {
        profileIntelligenceWeightEnabled: boolean;
        scoringMode: "profile_intelligence" | "legacy";
        staleAfterDays: number;
        activeUserThreshold: number;
    };
};

export function num(value: unknown, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

export function pct(numerator: number, denominator: number) {
    if (denominator <= 0) return 0;
    return Math.round((numerator / denominator) * 1000) / 10;
}

export function buildProfileIntelligenceAlerts(input: {
    coveragePct: number;
    stalePct: number;
    failedJobs: number;
    pendingJobs: number;
    dormantUsersShown: number;
    shortlistOverFiveCount: number;
}): { status: ProfileIntelligenceAdminOverview["systemStatus"]; alerts: ProfileIntelligenceAlert[] } {
    const alerts: ProfileIntelligenceAlert[] = [];

    if (input.coveragePct < 50) {
        alerts.push({ severity: "critical", message: `Profile intelligence coverage is only ${input.coveragePct}%.` });
    } else if (input.coveragePct < 80) {
        alerts.push({ severity: "warning", message: `Profile intelligence coverage is ${input.coveragePct}%; target is 80%+.` });
    }

    if (input.stalePct >= 30) {
        alerts.push({ severity: "critical", message: `${input.stalePct}% of intelligence records are stale.` });
    } else if (input.stalePct >= 10) {
        alerts.push({ severity: "warning", message: `${input.stalePct}% of intelligence records are stale.` });
    }

    if (input.failedJobs > 0) {
        alerts.push({ severity: input.failedJobs >= 10 ? "critical" : "warning", message: `${input.failedJobs} profile intelligence jobs failed.` });
    }
    if (input.pendingJobs >= 100) {
        alerts.push({ severity: "warning", message: `${input.pendingJobs} profile intelligence jobs are pending.` });
    }
    if (input.dormantUsersShown > 0) {
        alerts.push({ severity: "info", message: `${input.dormantUsersShown} dormant users are in today's shortlists.` });
    }
    if (input.shortlistOverFiveCount > 0) {
        alerts.push({ severity: "warning", message: `${input.shortlistOverFiveCount} users have more than five daily shortlist rows.` });
    }

    const status = alerts.some((alert) => alert.severity === "critical")
        ? "critical"
        : alerts.some((alert) => alert.severity === "warning")
            ? "warning"
            : "healthy";

    return { status, alerts };
}

function getStaleAfterDays() {
    const value = Number(process.env.PROFILE_INTELLIGENCE_STALE_AFTER_DAYS ?? 7);
    return Number.isFinite(value) && value >= 1 ? Math.floor(value) : 7;
}

function profileIntelligenceWeightEnabled() {
    return process.env.PROFILE_INTELLIGENCE_RANKING_ENABLED !== "false";
}

async function getEligibleProfileCount() {
    const [row] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(profiles)
        .innerJoin(user, eq(user.id, profiles.userId))
        .where(and(
            eq(profiles.role, "user"),
            eq(user.role, "user"),
            sql`${user.deletedAt} is null`,
            sql`(${profiles.profileCompleted} = true or ${profiles.isComplete} = true)`,
            sql`coalesce(${profiles.isVisible}, true) = true`,
            sql`coalesce(${profiles.discoveryPaused}, false) = false`,
            sql`coalesce(${profiles.incognitoMode}, false) = false`,
        ));
    return num(row?.count);
}

export async function getProfileIntelligenceAdminOverview(): Promise<ProfileIntelligenceAdminOverview> {
    const now = new Date();
    const staleAfterDays = getStaleAfterDays();
    const staleBefore = new Date(now.getTime() - staleAfterDays * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const shortlistDay = nairobiDayKey(now);

    const [
        eligibleProfiles,
        coverageRows,
        jobRows,
        matchmakerRows,
        dailyRows,
        decisionRows,
        rollingRows,
        mutualRows,
        incomingRows,
        timeToFirstMutualRows,
    ] = await Promise.all([
        getEligibleProfileCount(),
        db.select({
            intelligenceRecords: sql<number>`count(*)::int`,
            staleRecords: sql<number>`count(*) filter (where ${profileIntelligence.lastAnalyzedAt} is null or ${profileIntelligence.lastAnalyzedAt} < ${staleBefore})::int`,
            avgCandidateStrength: sql<number>`coalesce(round(avg(${profileIntelligence.candidateStrengthScore})), 0)::int`,
            avgActivityScore: sql<number>`coalesce(round(avg(${profileIntelligence.activityScore})), 0)::int`,
            avgResponseScore: sql<number>`coalesce(round(avg(${profileIntelligence.responseScore})), 0)::int`,
        }).from(profileIntelligence),
        db.select({
            failedJobs: sql<number>`count(*) filter (where ${profileIntelligenceJobs.status} = 'failed')::int`,
            pendingJobs: sql<number>`count(*) filter (where ${profileIntelligenceJobs.status} = 'pending')::int`,
            processingJobs: sql<number>`count(*) filter (where ${profileIntelligenceJobs.status} = 'processing')::int`,
        }).from(profileIntelligenceJobs),
        db.select({ count: sql<number>`count(*)::int` })
            .from(matchmakerIntents)
            .where(gte(matchmakerIntents.createdAt, sevenDaysAgo)),
        db.select({
            viewersWithShortlist: sql<number>`count(distinct ${dailyShortlists.viewerUserId})::int`,
            activeUsersShown: sql<number>`count(*) filter (where coalesce(${profileIntelligence.activityScore}, 0) >= 60)::int`,
            dormantUsersShown: sql<number>`count(*) filter (where coalesce(${profileIntelligence.activityScore}, 0) < 45)::int`,
            shortlistOverFiveCount: sql<number>`coalesce(sum(case when shortlist_count > 5 then 1 else 0 end), 0)::int`,
        }).from(sql`(
            select ${dailyShortlists.viewerUserId} as viewer_user_id,
                   ${dailyShortlists.candidateUserId} as candidate_user_id,
                   count(*) over (partition by ${dailyShortlists.viewerUserId}) as shortlist_count
            from ${dailyShortlists}
            where ${dailyShortlists.shortlistDay} = ${shortlistDay}
        ) as todays_shortlists`)
            .leftJoin(profileIntelligence, sql`${profileIntelligence.userId} = todays_shortlists.candidate_user_id`),
        db.select({
            decisions: sql<number>`count(*) filter (where ${recommendationEvents.decision} in ('viewed', 'open_to_meet', 'passed', 'ignored'))::int`,
            shown: sql<number>`count(*)::int`,
            openToMeetCount: sql<number>`count(*) filter (where ${recommendationEvents.decision} = 'open_to_meet')::int`,
        }).from(recommendationEvents).where(gte(recommendationEvents.shownAt, new Date(now.getTime() - 24 * 60 * 60 * 1000))),
        db.select({
            decisions: sql<number>`count(*) filter (where ${recommendationEvents.decision} in ('open_to_meet', 'passed', 'ignored'))::int`,
            openToMeetCount: sql<number>`count(*) filter (where ${recommendationEvents.decision} = 'open_to_meet')::int`,
        }).from(recommendationEvents).where(gte(recommendationEvents.shownAt, thirtyDaysAgo)),
        db.select({ mutualMatches: sql<number>`count(*)::int` })
            .from(mutualMatches)
            .where(gte(mutualMatches.createdAt, thirtyDaysAgo)),
        db.select({ incomingInterestWaitingCount: sql<number>`count(*)::int` })
            .from(userMatchInterests)
            .where(and(eq(userMatchInterests.decision, "open_to_meet"), sql`${userMatchInterests.matchedCandidatePairId} is null`)),
        db.select({
            averageHours: sql<number>`avg(extract(epoch from (${mutualMatches.createdAt} - ${candidatePairs.createdAt})) / 3600)`,
        })
            .from(mutualMatches)
            .innerJoin(candidatePairs, eq(candidatePairs.id, mutualMatches.candidatePairId))
            .where(gte(mutualMatches.createdAt, thirtyDaysAgo)),
    ]);

    const coverage = coverageRows[0];
    const jobs = jobRows[0];
    const daily = dailyRows[0];
    const decisions = decisionRows[0];
    const rolling = rollingRows[0];
    const mutual = mutualRows[0];
    const incoming = incomingRows[0];
    const timeToFirstMutual = timeToFirstMutualRows[0];

    const intelligenceRecords = num(coverage?.intelligenceRecords);
    const staleRecords = num(coverage?.staleRecords);
    const failedJobs = num(jobs?.failedJobs);
    const pendingJobs = num(jobs?.pendingJobs);
    const dormantUsersShown = num(daily?.dormantUsersShown);
    const shortlistOverFiveCount = num(daily?.shortlistOverFiveCount);
    const coveragePct = pct(intelligenceRecords, eligibleProfiles);
    const stalePct = pct(staleRecords, intelligenceRecords);
    const alertState = buildProfileIntelligenceAlerts({
        coveragePct,
        stalePct,
        failedJobs,
        pendingJobs,
        dormantUsersShown,
        shortlistOverFiveCount,
    });
    const decisionCount = num(decisions?.decisions);
    const shownCount = num(decisions?.shown);
    const openToMeetCount = num(decisions?.openToMeetCount);
    const rollingDecisions = num(rolling?.decisions);
    const rollingOpenToMeet = num(rolling?.openToMeetCount);
    const mutualMatchCount = num(mutual?.mutualMatches);

    return {
        generatedAt: now.toISOString(),
        systemStatus: alertState.status,
        alerts: alertState.alerts,
        coverage: {
            eligibleProfiles,
            intelligenceRecords,
            coveragePct,
            staleRecords,
            stalePct,
            avgCandidateStrength: num(coverage?.avgCandidateStrength),
            avgActivityScore: num(coverage?.avgActivityScore),
            avgResponseScore: num(coverage?.avgResponseScore),
            failedJobs,
            pendingJobs,
            processingJobs: num(jobs?.processingJobs),
            matchmakerRequests7d: num(matchmakerRows[0]?.count),
        },
        dailyRecommendations: {
            shortlistDay,
            viewersWithShortlist: num(daily?.viewersWithShortlist),
            activeUsersShown: num(daily?.activeUsersShown),
            dormantUsersShown,
            shortlistOverFiveCount,
            decisions: decisionCount,
            decisionRatePct: pct(decisionCount, shownCount),
            openToMeetCount,
            openToMeetRatePct: pct(openToMeetCount, decisionCount),
            reciprocalMatchesToday: num(mutualRows[0]?.mutualMatches),
            incomingInterestWaitingCount: num(incoming?.incomingInterestWaitingCount),
        },
        rolling30d: {
            decisions: rollingDecisions,
            openToMeetCount: rollingOpenToMeet,
            openToMeetRatePct: pct(rollingOpenToMeet, rollingDecisions),
            reciprocalMatchRatePct: pct(mutualMatchCount, rollingOpenToMeet),
            mutualMatches: mutualMatchCount,
            averageTimeToFirstMutualHours: timeToFirstMutual?.averageHours == null
                ? null
                : Math.round(num(timeToFirstMutual.averageHours) * 10) / 10,
        },
        tuning: {
            profileIntelligenceWeightEnabled: profileIntelligenceWeightEnabled(),
            scoringMode: profileIntelligenceWeightEnabled() ? "profile_intelligence" : "legacy",
            staleAfterDays,
            activeUserThreshold: 60,
        },
    };
}
