import { and, asc, eq, lt, sql } from "drizzle-orm";

import db from "@/db/drizzle";
import {
    profilePhotoAnalysis,
    profilePhotoEmbeddings,
    profiles,
    user,
    userMatchSignals,
} from "@/db/schema";

export type PhotoIntelligenceAlert = {
    severity: "info" | "warning" | "critical";
    message: string;
};

export type MatchImpactProxy = {
    label: string;
    decisions: number;
    interested: number;
    interestedRate: number | null;
};

export type LowQualityProfileRow = {
    userId: string;
    photoQualityScore: number;
    hasUsableProfilePhoto: boolean;
    firstName: string | null;
    email: string | null;
};

export type NeedsReviewPhotoRow = {
    analysisId: string;
    userId: string;
    photoUrl: string;
    qualityScore: number;
    moderationReason: string | null;
    firstName: string | null;
    email: string | null;
};

export type PhotoIntelligenceOverview = {
    generatedAt: string;
    systemStatus: "healthy" | "warning" | "critical";
    alerts: PhotoIntelligenceAlert[];
    coverage: {
        eligibleProfiles: number;
        profilesAnalyzed: number;
        analysisCoveragePct: number;
        usablePhotoCount: number;
        usablePhotoRatePct: number;
        avgPhotoQualityScore: number;
        qualityBelow30: number;
        quality30To44: number;
        quality45To69: number;
        quality70Plus: number;
        lowQualityProfiles: number;
        needsReviewPhotos: number;
        unanalyzedAssets: number;
        usersWithEmbeddings: number;
        usersWithAnalysis: number;
        embeddingCoveragePct: number;
        hasAnalysisData: boolean;
    };
    learning: {
        usersWithPreferenceSignals: number;
        usersWithLikedCentroid: number;
        confidenceCold: number;
        confidenceWarming: number;
        confidenceMature: number;
        confidenceMaturePct: number;
        visualLikes7d: number;
        visualPasses7d: number;
        visualViews7d: number;
        visualLikes30d: number;
        visualPasses30d: number;
        preferenceUpdates7d: number;
        isLearningActive: boolean;
        hasLearningData: boolean;
    };
    matchImpact: {
        proxies: MatchImpactProxy[];
        mutualMatchesToday: number;
        mutualMatches7d: number;
        hasRecommendationData: boolean;
    };
    embeddingProviders: Array<{ provider: string; model: string; count: number }>;
    interactionTimeSeries: Array<{ date: string; likes: number; passes: number }>;
    lowQualityProfiles: LowQualityProfileRow[];
    needsReviewPhotos: NeedsReviewPhotoRow[];
    knownGaps: Array<{ label: string; reason: string }>;
};

function num(value: unknown, fallback = 0): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function pct(numerator: number, denominator: number): number {
    if (denominator <= 0) return 0;
    return Math.round((numerator / denominator) * 1000) / 10;
}

function rate(interested: number, decisions: number): number | null {
    if (decisions <= 0) return null;
    return Math.round((interested / decisions) * 1000) / 10;
}

function buildSystemStatus(input: {
    analysisCoveragePct: number;
    unanalyzedAssets: number;
    needsReviewPhotos: number;
    isLearningActive: boolean;
}): { status: PhotoIntelligenceOverview["systemStatus"]; alerts: PhotoIntelligenceAlert[] } {
    const alerts: PhotoIntelligenceAlert[] = [];

    if (input.unanalyzedAssets >= 20) {
        alerts.push({
            severity: "critical",
            message: `${input.unanalyzedAssets} profile photo assets have not been analyzed yet.`,
        });
    } else if (input.unanalyzedAssets > 0) {
        alerts.push({
            severity: "warning",
            message: `${input.unanalyzedAssets} photo assets still need first-time analysis.`,
        });
    }

    if (input.analysisCoveragePct < 50) {
        alerts.push({
            severity: "critical",
            message: `Only ${input.analysisCoveragePct}% of eligible profiles have completed photo analysis.`,
        });
    } else if (input.analysisCoveragePct < 80) {
        alerts.push({
            severity: "warning",
            message: `Photo analysis coverage is ${input.analysisCoveragePct}% — target is 80%+.`,
        });
    }

    if (input.needsReviewPhotos >= 10) {
        alerts.push({
            severity: "warning",
            message: `${input.needsReviewPhotos} photos are waiting in the moderation review queue.`,
        });
    }

    if (!input.isLearningActive) {
        alerts.push({
            severity: "info",
            message: "No visual preference centroid updates in the last 7 days — self-improving loop may be idle.",
        });
    }

    const status: PhotoIntelligenceOverview["systemStatus"] = alerts.some((a) => a.severity === "critical")
        ? "critical"
        : alerts.some((a) => a.severity === "warning")
            ? "warning"
            : "healthy";

    return { status, alerts };
}

export async function getPhotoIntelligenceAdminOverview(): Promise<PhotoIntelligenceOverview> {
    const [
        coverageResult,
        learningResult,
        matchImpactResult,
        providerResult,
        timeSeriesResult,
        lowQualityRows,
        needsReviewRows,
    ] = await Promise.all([
        db.execute(sql`
            with eligible as (
                select count(*)::int as eligible_profiles
                from profiles p
                join "user" u on u.id = p.user_id
                where u.deleted_at is null
                  and coalesce(p.profile_completed, false) = true
                  and coalesce(u.role, 'user') <> 'admin'
            ),
            signals as (
                select
                    count(*) filter (where photo_analysis_completed = true)::int as profiles_analyzed,
                    count(*) filter (where photo_analysis_completed = true and has_usable_profile_photo = true)::int as usable_photo_count,
                    coalesce(round(avg(photo_quality_score) filter (where photo_analysis_completed = true)), 0)::int as avg_photo_quality_score,
                    count(*) filter (where photo_analysis_completed = true and photo_quality_score < 30)::int as quality_below_30,
                    count(*) filter (where photo_analysis_completed = true and photo_quality_score >= 30 and photo_quality_score < 45)::int as quality_30_to_44,
                    count(*) filter (where photo_analysis_completed = true and photo_quality_score >= 45 and photo_quality_score < 70)::int as quality_45_to_69,
                    count(*) filter (where photo_analysis_completed = true and photo_quality_score >= 70)::int as quality_70_plus,
                    count(*) filter (where photo_analysis_completed = true and photo_quality_score < 45)::int as low_quality_profiles
                from user_match_signals
            ),
            moderation as (
                select count(*)::int as needs_review_photos
                from profile_photo_analysis
                where moderation_status = 'needs_review'
            ),
            assets as (
                select count(*) filter (where last_analyzed_at is null)::int as unanalyzed_assets
                from profile_photo_assets
            ),
            embeddings as (
                select
                    count(distinct user_id)::int as users_with_embeddings
                from profile_photo_embeddings
            ),
            analysis_users as (
                select count(distinct user_id)::int as users_with_analysis
                from profile_photo_analysis
            )
            select
                e.eligible_profiles,
                s.profiles_analyzed,
                s.usable_photo_count,
                s.avg_photo_quality_score,
                s.quality_below_30,
                s.quality_30_to_44,
                s.quality_45_to_69,
                s.quality_70_plus,
                s.low_quality_profiles,
                m.needs_review_photos,
                a.unanalyzed_assets,
                emb.users_with_embeddings,
                au.users_with_analysis
            from eligible e
            cross join signals s
            cross join moderation m
            cross join assets a
            cross join embeddings emb
            cross join analysis_users au
        `),
        db.execute(sql`
            with prefs as (
                select
                    count(*)::int as users_with_preference_signals,
                    count(*) filter (where liked_embedding_centroid is not null)::int as users_with_liked_centroid,
                    count(*) filter (where preference_confidence between 0 and 10)::int as confidence_cold,
                    count(*) filter (where preference_confidence between 11 and 45)::int as confidence_warming,
                    count(*) filter (where preference_confidence >= 46)::int as confidence_mature,
                    count(*) filter (where updated_at >= now() - interval '7 days')::int as preference_updates_7d
                from user_visual_preference_signals
            ),
            interactions as (
                select
                    count(*) filter (where event_type = 'profile_like' and created_at >= now() - interval '7 days')::int as visual_likes_7d,
                    count(*) filter (where event_type = 'profile_pass' and created_at >= now() - interval '7 days')::int as visual_passes_7d,
                    count(*) filter (where event_type = 'profile_view' and created_at >= now() - interval '7 days')::int as visual_views_7d,
                    count(*) filter (where event_type = 'profile_like' and created_at >= now() - interval '30 days')::int as visual_likes_30d,
                    count(*) filter (where event_type = 'profile_pass' and created_at >= now() - interval '30 days')::int as visual_passes_30d
                from profile_interaction_events
            )
            select p.*, i.*
            from prefs p
            cross join interactions i
        `),
        db.execute(sql`
            with base_events as (
                select
                    re.decision,
                    cms.photo_quality_score as candidate_photo_quality,
                    vms.visual_preference_confidence as viewer_confidence,
                    p.created_at as viewer_profile_created_at
                from recommendation_events re
                left join user_match_signals cms on cms.user_id = re.candidate_user_id
                left join user_match_signals vms on vms.user_id = re.viewer_user_id
                left join profiles p on p.user_id = re.viewer_user_id
                where re.source = 'daily_recommendations'
                  and re.shown_at >= now() - interval '30 days'
                  and re.decision in ('open_to_meet', 'passed')
            ),
            mutuals as (
                select
                    count(*) filter (
                        where (created_at at time zone 'Africa/Nairobi')::date = (now() at time zone 'Africa/Nairobi')::date
                    )::int as mutual_matches_today,
                    count(*) filter (where created_at >= now() - interval '7 days')::int as mutual_matches_7d
                from mutual_matches
            )
            select
                coalesce((
                    select count(*)::int from base_events
                    where candidate_photo_quality >= 45
                ), 0) as usable_candidate_decisions,
                coalesce((
                    select count(*) filter (where decision = 'open_to_meet')::int from base_events
                    where candidate_photo_quality >= 45
                ), 0) as usable_candidate_interested,
                coalesce((
                    select count(*)::int from base_events
                    where candidate_photo_quality < 45 or candidate_photo_quality is null
                ), 0) as low_candidate_decisions,
                coalesce((
                    select count(*) filter (where decision = 'open_to_meet')::int from base_events
                    where candidate_photo_quality < 45 or candidate_photo_quality is null
                ), 0) as low_candidate_interested,
                coalesce((
                    select count(*)::int from base_events
                    where viewer_confidence >= 45
                ), 0) as warm_viewer_decisions,
                coalesce((
                    select count(*) filter (where decision = 'open_to_meet')::int from base_events
                    where viewer_confidence >= 45
                ), 0) as warm_viewer_interested,
                coalesce((
                    select count(*)::int from base_events
                    where viewer_confidence < 45 or viewer_confidence is null
                ), 0) as cold_viewer_decisions,
                coalesce((
                    select count(*) filter (where decision = 'open_to_meet')::int from base_events
                    where viewer_confidence < 45 or viewer_confidence is null
                ), 0) as cold_viewer_interested,
                coalesce((
                    select count(*)::int from base_events
                    where viewer_profile_created_at >= now() - interval '7 days'
                ), 0) as new_viewer_decisions,
                coalesce((
                    select count(*) filter (where decision = 'open_to_meet')::int from base_events
                    where viewer_profile_created_at >= now() - interval '7 days'
                ), 0) as new_viewer_interested,
                coalesce((
                    select count(*)::int from base_events
                    where viewer_profile_created_at < now() - interval '7 days'
                ), 0) as returning_viewer_decisions,
                coalesce((
                    select count(*) filter (where decision = 'open_to_meet')::int from base_events
                    where viewer_profile_created_at < now() - interval '7 days'
                ), 0) as returning_viewer_interested,
                (select mutual_matches_today from mutuals) as mutual_matches_today,
                (select mutual_matches_7d from mutuals) as mutual_matches_7d,
                coalesce((select count(*)::int from recommendation_events where source = 'daily_recommendations' and shown_at >= now() - interval '30 days'), 0) as recommendation_events_30d
        `),
        db.execute(sql`
            select provider, model, count(*)::int as count
            from profile_photo_embeddings
            group by provider, model
            order by count desc
            limit 10
        `),
        db.execute(sql`
            select
                to_char((created_at at time zone 'Africa/Nairobi')::date, 'YYYY-MM-DD') as day,
                count(*) filter (where event_type = 'profile_like')::int as likes,
                count(*) filter (where event_type = 'profile_pass')::int as passes
            from profile_interaction_events
            where created_at >= now() - interval '30 days'
              and event_type in ('profile_like', 'profile_pass')
            group by 1
            order by 1 asc
        `),
        db
            .select({
                userId: userMatchSignals.userId,
                photoQualityScore: userMatchSignals.photoQualityScore,
                hasUsableProfilePhoto: userMatchSignals.hasUsableProfilePhoto,
                firstName: profiles.firstName,
                email: user.email,
            })
            .from(userMatchSignals)
            .innerJoin(profiles, eq(profiles.userId, userMatchSignals.userId))
            .innerJoin(user, eq(user.id, userMatchSignals.userId))
            .where(
                and(
                    eq(userMatchSignals.photoAnalysisCompleted, true),
                    lt(userMatchSignals.photoQualityScore, 45),
                ),
            )
            .orderBy(asc(userMatchSignals.photoQualityScore))
            .limit(20),
        db
            .select({
                analysisId: profilePhotoAnalysis.id,
                userId: profilePhotoAnalysis.userId,
                photoUrl: profilePhotoAnalysis.photoUrl,
                qualityScore: profilePhotoAnalysis.qualityScore,
                moderationReason: profilePhotoAnalysis.moderationReason,
                firstName: profiles.firstName,
                email: user.email,
            })
            .from(profilePhotoAnalysis)
            .innerJoin(profiles, eq(profiles.userId, profilePhotoAnalysis.userId))
            .innerJoin(user, eq(user.id, profilePhotoAnalysis.userId))
            .where(eq(profilePhotoAnalysis.moderationStatus, "needs_review"))
            .limit(20),
    ]);

    const coverageRow = coverageResult.rows?.[0] ?? {};
    const learningRow = learningResult.rows?.[0] ?? {};
    const matchRow = matchImpactResult.rows?.[0] ?? {};

    const eligibleProfiles = num(coverageRow.eligible_profiles);
    const profilesAnalyzed = num(coverageRow.profiles_analyzed);
    const usablePhotoCount = num(coverageRow.usable_photo_count);
    const usersWithEmbeddings = num(coverageRow.users_with_embeddings);
    const usersWithAnalysis = num(coverageRow.users_with_analysis);

    const analysisCoveragePct = pct(profilesAnalyzed, eligibleProfiles);
    const usablePhotoRatePct = pct(usablePhotoCount, profilesAnalyzed);
    const embeddingCoveragePct = pct(usersWithEmbeddings, Math.max(usersWithAnalysis, 1));

    const confidenceMature = num(learningRow.confidence_mature);
    const usersWithPreferenceSignals = num(learningRow.users_with_preference_signals);
    const preferenceUpdates7d = num(learningRow.preference_updates_7d);
    const confidenceMaturePct = pct(confidenceMature, Math.max(usersWithPreferenceSignals, 1));

    const proxies: MatchImpactProxy[] = [
        {
            label: "Candidate photo usable (score 45+)",
            decisions: num(matchRow.usable_candidate_decisions),
            interested: num(matchRow.usable_candidate_interested),
            interestedRate: rate(
                num(matchRow.usable_candidate_interested),
                num(matchRow.usable_candidate_decisions),
            ),
        },
        {
            label: "Candidate photo low quality (<45)",
            decisions: num(matchRow.low_candidate_decisions),
            interested: num(matchRow.low_candidate_interested),
            interestedRate: rate(
                num(matchRow.low_candidate_interested),
                num(matchRow.low_candidate_decisions),
            ),
        },
        {
            label: "Viewer preference mature (confidence 45+)",
            decisions: num(matchRow.warm_viewer_decisions),
            interested: num(matchRow.warm_viewer_interested),
            interestedRate: rate(
                num(matchRow.warm_viewer_interested),
                num(matchRow.warm_viewer_decisions),
            ),
        },
        {
            label: "Viewer preference cold start (<45)",
            decisions: num(matchRow.cold_viewer_decisions),
            interested: num(matchRow.cold_viewer_interested),
            interestedRate: rate(
                num(matchRow.cold_viewer_interested),
                num(matchRow.cold_viewer_decisions),
            ),
        },
        {
            label: "First-week viewers (<7d on platform)",
            decisions: num(matchRow.new_viewer_decisions),
            interested: num(matchRow.new_viewer_interested),
            interestedRate: rate(
                num(matchRow.new_viewer_interested),
                num(matchRow.new_viewer_decisions),
            ),
        },
        {
            label: "Returning viewers (7d+ on platform)",
            decisions: num(matchRow.returning_viewer_decisions),
            interested: num(matchRow.returning_viewer_interested),
            interestedRate: rate(
                num(matchRow.returning_viewer_interested),
                num(matchRow.returning_viewer_decisions),
            ),
        },
    ];

    const { status, alerts } = buildSystemStatus({
        analysisCoveragePct,
        unanalyzedAssets: num(coverageRow.unanalyzed_assets),
        needsReviewPhotos: num(coverageRow.needs_review_photos),
        isLearningActive: preferenceUpdates7d > 0,
    });

    const hasAnalysisData = profilesAnalyzed > 0 || usersWithAnalysis > 0;
    const hasLearningData =
        usersWithPreferenceSignals > 0 || num(learningRow.visual_likes_30d) > 0;
    const hasRecommendationData = num(matchRow.recommendation_events_30d) > 0;

    return {
        generatedAt: new Date().toISOString(),
        systemStatus: status,
        alerts,
        coverage: {
            eligibleProfiles,
            profilesAnalyzed,
            analysisCoveragePct,
            usablePhotoCount,
            usablePhotoRatePct,
            avgPhotoQualityScore: num(coverageRow.avg_photo_quality_score),
            qualityBelow30: num(coverageRow.quality_below_30),
            quality30To44: num(coverageRow.quality_30_to_44),
            quality45To69: num(coverageRow.quality_45_to_69),
            quality70Plus: num(coverageRow.quality_70_plus),
            lowQualityProfiles: num(coverageRow.low_quality_profiles),
            needsReviewPhotos: num(coverageRow.needs_review_photos),
            unanalyzedAssets: num(coverageRow.unanalyzed_assets),
            usersWithEmbeddings,
            usersWithAnalysis,
            embeddingCoveragePct,
            hasAnalysisData,
        },
        learning: {
            usersWithPreferenceSignals,
            usersWithLikedCentroid: num(learningRow.users_with_liked_centroid),
            confidenceCold: num(learningRow.confidence_cold),
            confidenceWarming: num(learningRow.confidence_warming),
            confidenceMature,
            confidenceMaturePct,
            visualLikes7d: num(learningRow.visual_likes_7d),
            visualPasses7d: num(learningRow.visual_passes_7d),
            visualViews7d: num(learningRow.visual_views_7d),
            visualLikes30d: num(learningRow.visual_likes_30d),
            visualPasses30d: num(learningRow.visual_passes_30d),
            preferenceUpdates7d,
            isLearningActive: preferenceUpdates7d > 0,
            hasLearningData,
        },
        matchImpact: {
            proxies,
            mutualMatchesToday: num(matchRow.mutual_matches_today),
            mutualMatches7d: num(matchRow.mutual_matches_7d),
            hasRecommendationData,
        },
        embeddingProviders: (providerResult.rows ?? []).map((row) => ({
            provider: String(row.provider ?? "unknown"),
            model: String(row.model ?? "unknown"),
            count: num(row.count),
        })),
        interactionTimeSeries: (timeSeriesResult.rows ?? []).map((row) => ({
            date: String(row.day ?? ""),
            likes: num(row.likes),
            passes: num(row.passes),
        })),
        lowQualityProfiles: lowQualityRows.map((row) => ({
            userId: row.userId,
            photoQualityScore: row.photoQualityScore,
            hasUsableProfilePhoto: row.hasUsableProfilePhoto,
            firstName: row.firstName,
            email: row.email,
        })),
        needsReviewPhotos: needsReviewRows.map((row) => ({
            analysisId: row.analysisId,
            userId: row.userId,
            photoUrl: row.photoUrl,
            qualityScore: row.qualityScore,
            moderationReason: row.moderationReason,
            firstName: row.firstName,
            email: row.email,
        })),
        knownGaps: [
            {
                label: "Before/after A/B test",
                reason: "Phase 5 monitoring not built — no controlled experiment yet.",
            },
            {
                label: "Per-recommendation photo scores",
                reason: "recommendation_events does not store photoQualityScore or photoPreferenceScore.",
            },
            {
                label: "Visual diversity score",
                reason: "calculatePhotoDiversityScore exists but ranking still uses a fixed 50.",
            },
            {
                label: "User-facing improvement tips",
                reason: "Mobile does not surface photo quality tips yet.",
            },
        ],
    };
}
