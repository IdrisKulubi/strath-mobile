import { and, eq, gte, sql } from "drizzle-orm";

import db from "@/db/drizzle";
import {
    candidatePairs,
    dailyShortlists,
    analyticsEvents,
    matchmakerIntents,
    matchmakerMessages,
    matchmakerSessionResults,
    matchmakerSessions,
    matchmakerShortlists,
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
    matchmakerQuality: {
        sessions7d: number;
        searches7d: number;
        candidatesShown7d: number;
        repeatedCandidateRatePct: number;
        interestedCount7d: number;
        interestedRatePct: number;
        passCount7d: number;
        passRatePct: number;
        mutualMatchCreationRatePct: number;
        averageClarifyingTurns: number;
        llmFallbackRatePct: number;
        feedbackReasons7d: number;
        quotaReached7d: number;
        shortlists7d: number;
        partialShortlists7d: number;
        shortlistSize1Count7d: number;
        shortlistSize2Count7d: number;
        shortlistSize3Count7d: number;
        creditMismatchCount7d: number;
        shortlistErrors7d: number;
        explanationCoveragePct: number;
        candidateOnlyFeedback7d: number;
        confirmedFutureLearning7d: number;
        undo7d: number;
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
        matchmakerSessionRows,
        matchmakerResultRows,
        matchmakerDecisionRows,
        matchmakerMessageRows,
        matchmakerAnalyticsRows,
        matchmakerShortlistRows,
        matchmakerRepeatRows,
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
            viewersWithShortlist: sql<number>`count(distinct todays_shortlists.viewer_user_id)::int`,
            activeUsersShown: sql<number>`count(*) filter (where coalesce(${profileIntelligence.activityScore}, 0) >= 60)::int`,
            dormantUsersShown: sql<number>`count(*) filter (where coalesce(${profileIntelligence.activityScore}, 0) < 45)::int`,
            shortlistOverFiveCount: sql<number>`count(distinct todays_shortlists.viewer_user_id) filter (where todays_shortlists.shortlist_count > 5)::int`,
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
        db.select({
            sessions7d: sql<number>`count(*)::int`,
        })
            .from(matchmakerSessions)
            .where(gte(matchmakerSessions.createdAt, sevenDaysAgo)),
        db.select({
            searches7d: sql<number>`count(*)::int`,
            distinctCandidates7d: sql<number>`count(distinct ${matchmakerSessionResults.candidateUserId})::int`,
            candidatesShown7d: sql<number>`count(*)::int`,
        })
            .from(matchmakerSessionResults)
            .where(gte(matchmakerSessionResults.createdAt, sevenDaysAgo)),
        db.select({
            decisions7d: sql<number>`count(*) filter (where ${recommendationEvents.decision} in ('open_to_meet', 'passed'))::int`,
            interestedCount7d: sql<number>`count(*) filter (where ${recommendationEvents.decision} = 'open_to_meet')::int`,
            passCount7d: sql<number>`count(*) filter (where ${recommendationEvents.decision} = 'passed')::int`,
            mutualCreated7d: sql<number>`count(*) filter (where ${recommendationEvents.createdCandidatePairId} is not null)::int`,
        })
            .from(recommendationEvents)
            .where(and(eq(recommendationEvents.source, "matchmaker"), gte(recommendationEvents.shownAt, sevenDaysAgo))),
        db.select({
            clarifyingTurns7d: sql<number>`count(*) filter (where ${matchmakerMessages.kind} = 'clarifying_question')::int`,
            llmTurns7d: sql<number>`count(*) filter (where ${matchmakerMessages.metadata}->>'provider' is not null)::int`,
            llmFallbacks7d: sql<number>`count(*) filter (where ${matchmakerMessages.metadata}->>'fallbackUsed' = 'true')::int`,
        })
            .from(matchmakerMessages)
            .where(gte(matchmakerMessages.createdAt, sevenDaysAgo)),
        db.select({
            feedbackReasons7d: sql<number>`count(*) filter (where ${analyticsEvents.eventType} = 'matchmaker_feedback_reason_selected')::int`,
            quotaReached7d: sql<number>`count(*) filter (where ${analyticsEvents.eventType} = 'matchmaker_quota_reached')::int`,
            shortlistErrors7d: sql<number>`count(*) filter (where ${analyticsEvents.eventType} = 'matchmaker_shortlist_failed')::int`,
            candidateOnlyFeedback7d: sql<number>`count(*) filter (where ${analyticsEvents.eventType} = 'matchmaker_feedback_candidate_only')::int`,
            confirmedFutureLearning7d: sql<number>`count(*) filter (where ${analyticsEvents.eventType} = 'matchmaker_feedback_learning_confirmed')::int`,
            undo7d: sql<number>`count(*) filter (where ${analyticsEvents.eventType} = 'matchmaker_brief_undone')::int`,
        })
            .from(analyticsEvents)
            .where(gte(analyticsEvents.createdAt, sevenDaysAgo)),
        db.select({
            shortlists7d: sql<number>`count(*)::int`,
            partialShortlists7d: sql<number>`count(*) filter (where coalesce((${matchmakerShortlists.metadata}->>'resultSize')::int, 0) < 3)::int`,
            shortlistSize1Count7d: sql<number>`count(*) filter (where (${matchmakerShortlists.metadata}->>'resultSize')::int = 1)::int`,
            shortlistSize2Count7d: sql<number>`count(*) filter (where (${matchmakerShortlists.metadata}->>'resultSize')::int = 2)::int`,
            shortlistSize3Count7d: sql<number>`count(*) filter (where (${matchmakerShortlists.metadata}->>'resultSize')::int = 3)::int`,
            creditMismatchCount7d: sql<number>`count(*) filter (where ${matchmakerShortlists.status} = 'presented' and ${matchmakerShortlists.creditConsumed} = false)::int`,
        }).from(matchmakerShortlists).where(gte(matchmakerShortlists.createdAt, sevenDaysAgo)),
        db.select({
            repeatedRows: sql<number>`coalesce(sum(greatest(repeat_rows.shown_count - 1, 0)), 0)::int`,
            totalRows: sql<number>`coalesce(sum(repeat_rows.shown_count), 0)::int`,
            explainedRows: sql<number>`coalesce(sum(repeat_rows.explained_count), 0)::int`,
        }).from(sql`(
            select ${matchmakerSessionResults.sessionId} as session_id,
                   ${matchmakerSessionResults.candidateUserId} as candidate_user_id,
                   count(*)::int as shown_count,
                   count(*) filter (where jsonb_array_length(${matchmakerSessionResults.fitReasons}) > 0)::int as explained_count
            from ${matchmakerSessionResults}
            where ${matchmakerSessionResults.createdAt} >= ${sevenDaysAgo}
              and ${matchmakerSessionResults.shortlistId} is not null
            group by ${matchmakerSessionResults.sessionId}, ${matchmakerSessionResults.candidateUserId}
        ) as repeat_rows`),
    ]);

    const coverage = coverageRows[0];
    const jobs = jobRows[0];
    const daily = dailyRows[0];
    const decisions = decisionRows[0];
    const rolling = rollingRows[0];
    const mutual = mutualRows[0];
    const incoming = incomingRows[0];
    const timeToFirstMutual = timeToFirstMutualRows[0];
    const matchmakerSessionMetrics = matchmakerSessionRows[0];
    const matchmakerResultMetrics = matchmakerResultRows[0];
    const matchmakerDecisionMetrics = matchmakerDecisionRows[0];
    const matchmakerMessageMetrics = matchmakerMessageRows[0];
    const matchmakerAnalyticsMetrics = matchmakerAnalyticsRows[0];
    const matchmakerShortlistMetrics = matchmakerShortlistRows[0];
    const matchmakerRepeatMetrics = matchmakerRepeatRows[0];

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
    const matchmakerSessions7d = num(matchmakerSessionMetrics?.sessions7d);
    const matchmakerSearches7d = num(matchmakerResultMetrics?.searches7d);
    const matchmakerCandidatesShown7d = num(matchmakerResultMetrics?.candidatesShown7d);
    const matchmakerDecisions7d = num(matchmakerDecisionMetrics?.decisions7d);
    const matchmakerInterested7d = num(matchmakerDecisionMetrics?.interestedCount7d);
    const matchmakerPass7d = num(matchmakerDecisionMetrics?.passCount7d);
    const matchmakerMutualCreated7d = num(matchmakerDecisionMetrics?.mutualCreated7d);
    const clarifyingTurns7d = num(matchmakerMessageMetrics?.clarifyingTurns7d);
    const llmTurns7d = num(matchmakerMessageMetrics?.llmTurns7d);
    const llmFallbacks7d = num(matchmakerMessageMetrics?.llmFallbacks7d);

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
        matchmakerQuality: {
            sessions7d: matchmakerSessions7d,
            searches7d: matchmakerSearches7d,
            candidatesShown7d: matchmakerCandidatesShown7d,
            repeatedCandidateRatePct: pct(num(matchmakerRepeatMetrics?.repeatedRows), num(matchmakerRepeatMetrics?.totalRows)),
            interestedCount7d: matchmakerInterested7d,
            interestedRatePct: pct(matchmakerInterested7d, matchmakerDecisions7d),
            passCount7d: matchmakerPass7d,
            passRatePct: pct(matchmakerPass7d, matchmakerDecisions7d),
            mutualMatchCreationRatePct: pct(matchmakerMutualCreated7d, matchmakerInterested7d),
            averageClarifyingTurns: matchmakerSessions7d <= 0
                ? 0
                : Math.round((clarifyingTurns7d / matchmakerSessions7d) * 10) / 10,
            llmFallbackRatePct: pct(llmFallbacks7d, llmTurns7d),
            feedbackReasons7d: num(matchmakerAnalyticsMetrics?.feedbackReasons7d),
            quotaReached7d: num(matchmakerAnalyticsMetrics?.quotaReached7d),
            shortlists7d: num(matchmakerShortlistMetrics?.shortlists7d),
            partialShortlists7d: num(matchmakerShortlistMetrics?.partialShortlists7d),
            shortlistSize1Count7d: num(matchmakerShortlistMetrics?.shortlistSize1Count7d),
            shortlistSize2Count7d: num(matchmakerShortlistMetrics?.shortlistSize2Count7d),
            shortlistSize3Count7d: num(matchmakerShortlistMetrics?.shortlistSize3Count7d),
            creditMismatchCount7d: num(matchmakerShortlistMetrics?.creditMismatchCount7d),
            shortlistErrors7d: num(matchmakerAnalyticsMetrics?.shortlistErrors7d),
            explanationCoveragePct: pct(num(matchmakerRepeatMetrics?.explainedRows), num(matchmakerRepeatMetrics?.totalRows)),
            candidateOnlyFeedback7d: num(matchmakerAnalyticsMetrics?.candidateOnlyFeedback7d),
            confirmedFutureLearning7d: num(matchmakerAnalyticsMetrics?.confirmedFutureLearning7d),
            undo7d: num(matchmakerAnalyticsMetrics?.undo7d),
        },
        tuning: {
            profileIntelligenceWeightEnabled: profileIntelligenceWeightEnabled(),
            scoringMode: profileIntelligenceWeightEnabled() ? "profile_intelligence" : "legacy",
            staleAfterDays,
            activeUserThreshold: 60,
        },
    };
}
