import { and, eq, gte, inArray, isNull, or, sql } from "drizzle-orm";

import db from "@/db/drizzle";
import {
    candidatePairs,
    matchmakerIntents,
    profiles,
    profileIntelligence,
    profileIntelligenceJobs,
    recommendationEvents,
    user,
    userMatchInterests,
    userMatchSignals,
    type MatchmakerIntent,
    type NewProfileIntelligence,
    type ProfileIntelligence,
    type ProfileIntelligenceJob,
} from "@/db/schema";
import {
    calculateActivityScore,
    calculateBehaviorSignalScores,
    calculateCandidateStrengthScore,
    clampProfileIntelligenceScore,
} from "@/lib/services/profile-intelligence-scoring";
import {
    requestProfileAnalysis,
    type WorkerProfilePayload,
    type WorkerProfileAnalyzeResponse,
} from "@/lib/services/profile-intelligence-worker-client";

export type ProfileIntelligenceJobType = "profile_analyze" | "profile_backfill" | "profile_refresh";
export type ProfileIntelligenceJobStatus = "pending" | "processing" | "completed" | "failed";

export type CandidateStrengthInput = Parameters<typeof calculateCandidateStrengthScore>[0];

export type ProfileIntelligenceJobInput = {
    userId?: string | null;
    jobType: ProfileIntelligenceJobType;
    metadata?: Record<string, unknown>;
    maxAttempts?: number;
};

export type ProfileIntelligenceBackfillOptions = {
    limit?: number;
    offset?: number;
    userId?: string;
    enqueueOnly?: boolean;
    includePaused?: boolean;
    onlyStale?: boolean;
    staleAfterDays?: number;
};

export type ProfileIntelligenceBackfillResult = {
    totalCandidates: number;
    processed: number;
    succeeded: number;
    failed: number;
    queued: number;
    hasMore: boolean;
    nextOffset: number | null;
    results: Array<{
        userId: string;
        status: "ok" | "queued" | "error" | "skipped";
        jobId?: string;
        error?: string;
    }>;
};

export type ProfileIntelligenceJobRunResult = {
    claimed: number;
    succeeded: number;
    failed: number;
    results: Array<{
        jobId: string;
        userId: string | null;
        status: "completed" | "failed";
        error?: string;
    }>;
};

function clampScore(value: number | null | undefined) {
    return clampProfileIntelligenceScore(value);
}

function asStringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

export { calculateActivityScore, calculateCandidateStrengthScore };

export function normalizeProfileIntelligenceInput(
    input: Omit<NewProfileIntelligence, "candidateStrengthScore"> & {
        candidateStrengthScore?: number | null;
    },
): NewProfileIntelligence {
    const normalized = {
        ...input,
        photoPresentationScore: clampScore(input.photoPresentationScore),
        profileCompletenessScore: clampScore(input.profileCompletenessScore),
        activityScore: clampScore(input.activityScore),
        responseScore: clampScore(input.responseScore),
        inboundInterestScore: clampScore(input.inboundInterestScore),
        mutualConversionScore: clampScore(input.mutualConversionScore),
    };

    return {
        ...normalized,
        candidateStrengthScore: clampScore(
            input.candidateStrengthScore ??
            calculateCandidateStrengthScore(normalized),
        ),
        metadata: input.metadata ?? {},
        updatedAt: new Date(),
    };
}

export function nextJobState(
    job: Pick<ProfileIntelligenceJob, "attempts" | "maxAttempts">,
    outcome: "processing" | "completed" | "failed",
    error?: string,
): {
    status: ProfileIntelligenceJobStatus;
    attempts: number;
    lockedAt: Date | null;
    completedAt: Date | null;
    lastError: string | null;
    updatedAt: Date;
} {
    const now = new Date();
    if (outcome === "processing") {
        return {
            status: "processing",
            attempts: job.attempts + 1,
            lockedAt: now,
            completedAt: null,
            lastError: null,
            updatedAt: now,
        };
    }

    if (outcome === "completed") {
        return {
            status: "completed",
            attempts: job.attempts,
            lockedAt: null,
            completedAt: now,
            lastError: null,
            updatedAt: now,
        };
    }

    const attempts = Math.max(job.attempts, 1);
    return {
        status: attempts >= job.maxAttempts ? "failed" : "pending",
        attempts,
        lockedAt: null,
        completedAt: null,
        lastError: error ?? "Profile intelligence job failed",
        updatedAt: now,
    };
}

export function isProfileIntelligenceStale(input: {
    lastAnalyzedAt?: Date | string | null;
    lastProfileChangeAt?: Date | string | null;
    staleAfterDays?: number;
    now?: Date;
}) {
    const now = input.now ?? new Date();
    const staleAfterDays = Math.max(1, input.staleAfterDays ?? 7);
    if (!input.lastAnalyzedAt) return true;

    const analyzedAt = input.lastAnalyzedAt instanceof Date
        ? input.lastAnalyzedAt
        : new Date(input.lastAnalyzedAt);
    if (!Number.isFinite(analyzedAt.getTime())) return true;

    if (input.lastProfileChangeAt) {
        const changedAt = input.lastProfileChangeAt instanceof Date
            ? input.lastProfileChangeAt
            : new Date(input.lastProfileChangeAt);
        if (Number.isFinite(changedAt.getTime()) && changedAt > analyzedAt) {
            return true;
        }
    }

    return now.getTime() - analyzedAt.getTime() > staleAfterDays * 24 * 60 * 60 * 1000;
}

export function buildWorkerProfilePayload(profile: typeof profiles.$inferSelect): WorkerProfilePayload {
    const photos = asStringArray(profile.photos);
    return {
        userId: profile.userId,
        firstName: profile.firstName,
        age: profile.age,
        gender: profile.gender,
        university: profile.university,
        course: profile.course,
        yearOfStudy: profile.yearOfStudy,
        bio: profile.bio,
        aboutMe: profile.aboutMe,
        lookingFor: profile.lookingFor,
        interests: asStringArray(profile.interests),
        qualities: asStringArray(profile.qualities),
        prompts: Array.isArray(profile.prompts) ? profile.prompts : [],
        personalityAnswers: isRecord(profile.personalityAnswers) ? profile.personalityAnswers : {},
        lifestyleAnswers: isRecord(profile.lifestyleAnswers) ? profile.lifestyleAnswers : {},
        photoUrl: profile.profilePhoto ?? photos[0] ?? null,
        photos,
    };
}

export function profileCompletenessScore(profile: typeof profiles.$inferSelect) {
    const photos = asStringArray(profile.photos);
    const fields = [
        profile.profileCompleted || profile.isComplete,
        profile.firstName,
        profile.age,
        profile.gender,
        profile.course,
        profile.university,
        profile.lookingFor,
        profile.aboutMe || profile.bio,
        asStringArray(profile.interests).length > 0,
        profile.profilePhoto || photos.length > 0,
    ];
    return clampScore((fields.filter(Boolean).length / fields.length) * 100);
}

type BehaviorSignalCounts = {
    shownCount: number;
    viewsReceivedCount: number;
    likesReceivedCount: number;
    recentLikesReceivedCount: number;
    mutualMatchesCount: number;
};

function numberFromCount(value: unknown) {
    const numeric = typeof value === "number" ? value : Number(value ?? 0);
    return Number.isFinite(numeric) ? numeric : 0;
}

function metadataRecord(value: unknown): Record<string, unknown> {
    return isRecord(value) ? value : {};
}

async function getBehaviorSignalCounts(userId: string, since: Date): Promise<BehaviorSignalCounts> {
    const [receivedRecommendationRows, receivedInterestRows, mutualPairRows] = await Promise.all([
        db
            .select({
                shownCount: sql<number>`count(*) filter (where ${recommendationEvents.decision} in ('shown', 'viewed', 'open_to_meet', 'passed', 'ignored'))::int`,
                viewsReceivedCount: sql<number>`count(*) filter (where ${recommendationEvents.decision} = 'viewed')::int`,
                likesReceivedCount: sql<number>`count(*) filter (where ${recommendationEvents.decision} = 'open_to_meet')::int`,
                recentLikesReceivedCount: sql<number>`count(*) filter (where ${recommendationEvents.decision} = 'open_to_meet' and ${recommendationEvents.decidedAt} >= ${since})::int`,
            })
            .from(recommendationEvents)
            .where(eq(recommendationEvents.candidateUserId, userId)),
        db
            .select({
                likesReceivedCount: sql<number>`count(*)::int`,
                recentLikesReceivedCount: sql<number>`count(*) filter (where ${userMatchInterests.decidedAt} >= ${since})::int`,
            })
            .from(userMatchInterests)
            .where(and(eq(userMatchInterests.candidateUserId, userId), eq(userMatchInterests.decision, "open_to_meet"))),
        db
            .select({ mutualMatchesCount: sql<number>`count(*)::int` })
            .from(candidatePairs)
            .where(
                and(
                    eq(candidatePairs.status, "mutual"),
                    or(eq(candidatePairs.userAId, userId), eq(candidatePairs.userBId, userId)),
                ),
            ),
    ]);

    const recommendationCounts = receivedRecommendationRows[0];
    const interestCounts = receivedInterestRows[0];
    return {
        shownCount: numberFromCount(recommendationCounts?.shownCount),
        viewsReceivedCount: numberFromCount(recommendationCounts?.viewsReceivedCount),
        likesReceivedCount: Math.max(
            numberFromCount(recommendationCounts?.likesReceivedCount),
            numberFromCount(interestCounts?.likesReceivedCount),
        ),
        recentLikesReceivedCount: Math.max(
            numberFromCount(recommendationCounts?.recentLikesReceivedCount),
            numberFromCount(interestCounts?.recentLikesReceivedCount),
        ),
        mutualMatchesCount: numberFromCount(mutualPairRows[0]?.mutualMatchesCount),
    };
}

export async function calculateProfileBehaviorSignals(userId: string, options: { now?: Date; sinceDays?: number } = {}) {
    const now = options.now ?? new Date();
    const sinceDays = Math.max(1, options.sinceDays ?? 30);
    const since = new Date(now.getTime() - sinceDays * 24 * 60 * 60 * 1000);

    const [profile, account, signal, existing, counts] = await Promise.all([
        db.query.profiles.findFirst({ where: eq(profiles.userId, userId) }),
        db.query.user.findFirst({ where: eq(user.id, userId) }),
        db.query.userMatchSignals.findFirst({ where: eq(userMatchSignals.userId, userId) }),
        db.query.profileIntelligence.findFirst({ where: eq(profileIntelligence.userId, userId) }),
        getBehaviorSignalCounts(userId, since),
    ]);

    const lastSeenAt = account?.lastActive ?? profile?.lastActive ?? signal?.lastActiveAt ?? null;
    const profileCompleteness = profile
        ? profileCompletenessScore(profile)
        : existing?.profileCompletenessScore ?? 0;
    const photoPresentationScore = existing?.photoPresentationScore ?? signal?.photoQualityScore ?? 0;
    const scores = calculateBehaviorSignalScores({
        lastActiveAt: lastSeenAt,
        openToMeetCount: signal?.openToMeetCount ?? 0,
        passCount: signal?.passCount ?? 0,
        noResponseCount: signal?.noResponseCount ?? 0,
        ghostingPenalty: signal?.ghostingPenalty ?? 0,
        likesReceivedCount: counts.likesReceivedCount,
        viewsReceivedCount: counts.viewsReceivedCount,
        recentLikesReceivedCount: counts.recentLikesReceivedCount,
        shownCount: counts.shownCount,
        mutualMatchesCount: counts.mutualMatchesCount,
        profileCompletenessScore: profileCompleteness,
        photoPresentationScore,
        now,
    });

    return {
        ...scores,
        lastSeenAt,
        profileCompletenessScore: profileCompleteness,
        photoPresentationScore,
        metadata: {
            behaviorSignalsVersion: "profile_behavior_signals_v1",
            refreshedAt: now.toISOString(),
            lookbackDays: sinceDays,
            counts,
        },
    };
}

export async function refreshProfileBehaviorSignals(userId: string, options: { now?: Date; sinceDays?: number } = {}) {
    const signals = await calculateProfileBehaviorSignals(userId, options);
    const existing = await db.query.profileIntelligence.findFirst({
        where: eq(profileIntelligence.userId, userId),
    });
    const mergedMetadata = {
        ...metadataRecord(existing?.metadata),
        behaviorSignals: signals.metadata,
    };
    const now = options.now ?? new Date();

    const [record] = await db
        .insert(profileIntelligence)
        .values({
            userId,
            activityScore: signals.activityScore,
            responseScore: signals.responseScore,
            inboundInterestScore: signals.inboundInterestScore,
            mutualConversionScore: signals.mutualConversionScore,
            candidateStrengthScore: signals.candidateStrengthScore,
            profileCompletenessScore: signals.profileCompletenessScore,
            photoPresentationScore: signals.photoPresentationScore,
            lastSeenAt: signals.lastSeenAt,
            metadata: mergedMetadata,
            updatedAt: now,
        })
        .onConflictDoUpdate({
            target: profileIntelligence.userId,
            set: {
                activityScore: signals.activityScore,
                responseScore: signals.responseScore,
                inboundInterestScore: signals.inboundInterestScore,
                mutualConversionScore: signals.mutualConversionScore,
                candidateStrengthScore: signals.candidateStrengthScore,
                profileCompletenessScore: signals.profileCompletenessScore,
                photoPresentationScore: signals.photoPresentationScore,
                lastSeenAt: signals.lastSeenAt,
                metadata: mergedMetadata,
                updatedAt: now,
            },
        })
        .returning();

    return record;
}

export async function refreshProfileBehaviorSignalsForUsers(userIds: string[], options: { now?: Date; sinceDays?: number } = {}) {
    const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
    const results: Array<{ userId: string; status: "ok" | "error"; error?: string }> = [];

    for (const userId of uniqueUserIds) {
        try {
            await refreshProfileBehaviorSignals(userId, options);
            results.push({ userId, status: "ok" });
        } catch (error) {
            results.push({
                userId,
                status: "error",
                error: error instanceof Error ? error.message : "unknown_error",
            });
        }
    }

    return results;
}

export async function upsertProfileActivitySignal(userId: string, lastActiveAt = new Date()) {
    const activeScore = calculateActivityScore(lastActiveAt);
    await db
        .insert(userMatchSignals)
        .values({ userId, lastActiveAt, activeScore, updatedAt: new Date() })
        .onConflictDoUpdate({
            target: userMatchSignals.userId,
            set: { lastActiveAt, activeScore, updatedAt: new Date() },
        });

    return refreshProfileBehaviorSignals(userId, { now: lastActiveAt });
}

export function mapWorkerAnalysisToProfileIntelligence(input: {
    userId: string;
    profile: typeof profiles.$inferSelect;
    analysis: WorkerProfileAnalyzeResponse;
    lastSeenAt?: Date | null;
}) {
    const now = new Date();
    return normalizeProfileIntelligenceInput({
        userId: input.userId,
        profileSummary: input.analysis.profileSummary,
        searchText: input.analysis.searchText,
        textEmbedding: input.analysis.textEmbedding,
        visualEmbedding: input.analysis.visualEmbedding ?? undefined,
        photoPresentationScore: input.analysis.photoPresentation.photoPresentationScore,
        profileCompletenessScore: profileCompletenessScore(input.profile),
        lastSeenAt: input.lastSeenAt ?? input.profile.lastActive ?? null,
        lastProfileChangeAt: input.profile.updatedAt,
        lastAnalyzedAt: now,
        analysisVersion: input.analysis.analysisVersion,
        metadata: {
            summaryProvider: input.analysis.textEmbeddingProvider,
            summaryModel: input.analysis.textEmbeddingModel,
            photoPresentation: input.analysis.photoPresentation,
            visualEmbeddingProvider: input.analysis.visualEmbeddingProvider,
            visualEmbeddingModel: input.analysis.visualEmbeddingModel,
        },
    });
}

export async function upsertProfileIntelligence(
    input: Omit<NewProfileIntelligence, "candidateStrengthScore"> & {
        candidateStrengthScore?: number | null;
    },
): Promise<ProfileIntelligence> {
    const values = normalizeProfileIntelligenceInput(input);
    const [record] = await db
        .insert(profileIntelligence)
        .values(values)
        .onConflictDoUpdate({
            target: profileIntelligence.userId,
            set: {
                profileSummary: values.profileSummary,
                searchText: values.searchText,
                textEmbedding: values.textEmbedding,
                visualEmbedding: values.visualEmbedding,
                photoPresentationScore: values.photoPresentationScore,
                profileCompletenessScore: values.profileCompletenessScore,
                activityScore: values.activityScore,
                responseScore: values.responseScore,
                inboundInterestScore: values.inboundInterestScore,
                mutualConversionScore: values.mutualConversionScore,
                candidateStrengthScore: values.candidateStrengthScore,
                lastSeenAt: values.lastSeenAt,
                lastProfileChangeAt: values.lastProfileChangeAt,
                lastAnalyzedAt: values.lastAnalyzedAt,
                analysisVersion: values.analysisVersion,
                metadata: values.metadata,
                updatedAt: new Date(),
            },
        })
        .returning();

    return record;
}

export async function enqueueProfileIntelligenceJob(input: ProfileIntelligenceJobInput): Promise<ProfileIntelligenceJob> {
    const [job] = await db
        .insert(profileIntelligenceJobs)
        .values({
            userId: input.userId,
            jobType: input.jobType,
            status: "pending",
            maxAttempts: input.maxAttempts ?? 3,
            metadata: input.metadata ?? {},
        })
        .returning();

    return job;
}

export async function ensureProfileIntelligenceJob(input: ProfileIntelligenceJobInput): Promise<ProfileIntelligenceJob> {
    if (input.userId) {
        const existing = await db.query.profileIntelligenceJobs.findFirst({
            where: and(
                eq(profileIntelligenceJobs.userId, input.userId),
                eq(profileIntelligenceJobs.jobType, input.jobType),
                inArray(profileIntelligenceJobs.status, ["pending", "processing"]),
            ),
            orderBy: (table, { desc }) => [desc(table.createdAt)],
        });
        if (existing) return existing;
    }

    return enqueueProfileIntelligenceJob(input);
}

export async function markProfileIntelligenceJobProcessing(job: Pick<ProfileIntelligenceJob, "id" | "attempts" | "maxAttempts">) {
    const [updated] = await db
        .update(profileIntelligenceJobs)
        .set(nextJobState(job, "processing"))
        .where(eq(profileIntelligenceJobs.id, job.id))
        .returning();

    return updated;
}

export async function markProfileIntelligenceJobComplete(job: Pick<ProfileIntelligenceJob, "id" | "attempts" | "maxAttempts">) {
    const [updated] = await db
        .update(profileIntelligenceJobs)
        .set(nextJobState(job, "completed"))
        .where(eq(profileIntelligenceJobs.id, job.id))
        .returning();

    return updated;
}

export async function markProfileIntelligenceJobFailed(
    job: Pick<ProfileIntelligenceJob, "id" | "attempts" | "maxAttempts">,
    error?: string,
) {
    const [updated] = await db
        .update(profileIntelligenceJobs)
        .set(nextJobState(job, "failed", error))
        .where(eq(profileIntelligenceJobs.id, job.id))
        .returning();

    return updated;
}

async function getEligibleProfileRows(options: ProfileIntelligenceBackfillOptions) {
    if (options.userId) {
        const rows = await db
            .select({ profile: profiles, account: user, intelligence: profileIntelligence })
            .from(profiles)
            .innerJoin(user, eq(user.id, profiles.userId))
            .leftJoin(profileIntelligence, eq(profileIntelligence.userId, profiles.userId))
            .where(eq(profiles.userId, options.userId));
        return rows;
    }

    const filters = [
        or(eq(profiles.profileCompleted, true), eq(profiles.isComplete, true)),
        isNull(user.deletedAt),
        or(eq(profiles.isVisible, true), isNull(profiles.isVisible)),
        eq(profiles.incognitoMode, false),
        eq(profiles.role, "user"),
        eq(user.role, "user"),
    ];

    if (!options.includePaused) {
        filters.push(eq(profiles.discoveryPaused, false));
    }

    return db
        .select({ profile: profiles, account: user, intelligence: profileIntelligence })
        .from(profiles)
        .innerJoin(user, eq(user.id, profiles.userId))
        .leftJoin(profileIntelligence, eq(profileIntelligence.userId, profiles.userId))
        .where(and(...filters));
}

export async function listProfileIntelligenceBackfillCandidates(options: ProfileIntelligenceBackfillOptions = {}) {
    const allRows = await getEligibleProfileRows(options);
    const staleAfterDays = options.staleAfterDays ?? 7;
    const filtered = options.onlyStale
        ? allRows.filter((row) => isProfileIntelligenceStale({
            lastAnalyzedAt: row.intelligence?.lastAnalyzedAt,
            lastProfileChangeAt: row.profile.updatedAt,
            staleAfterDays,
        }))
        : allRows;

    const offset = Math.max(options.offset ?? 0, 0);
    const limit = Math.min(Math.max(options.limit ?? 25, 1), 100);
    return {
        totalCandidates: filtered.length,
        rows: filtered.slice(offset, offset + limit),
        offset,
        limit,
    };
}

export async function analyzeProfileIntelligenceForUser(userId: string): Promise<ProfileIntelligence> {
    const row = await db.query.profiles.findFirst({
        where: eq(profiles.userId, userId),
    });

    if (!row) {
        throw new Error(`Profile not found for user ${userId}`);
    }

    const analysis = await requestProfileAnalysis(buildWorkerProfilePayload(row));
    if (!analysis) {
        throw new Error("Profile intelligence worker is not configured.");
    }

    const account = await db.query.user.findFirst({
        where: eq(user.id, userId),
    });

    return upsertProfileIntelligence(
        mapWorkerAnalysisToProfileIntelligence({
            userId,
            profile: row,
            analysis,
            lastSeenAt: account?.lastActive ?? row.lastActive ?? null,
        }),
    );
}

export async function backfillProfileIntelligence(
    options: ProfileIntelligenceBackfillOptions = {},
): Promise<ProfileIntelligenceBackfillResult> {
    const { totalCandidates, rows, offset, limit } = await listProfileIntelligenceBackfillCandidates(options);
    const results: ProfileIntelligenceBackfillResult["results"] = [];
    let succeeded = 0;
    let failed = 0;
    let queued = 0;

    for (const row of rows) {
        if (options.enqueueOnly) {
            const job = await ensureProfileIntelligenceJob({
                userId: row.profile.userId,
                jobType: options.userId ? "profile_analyze" : "profile_backfill",
                metadata: { source: "backfill", profileId: row.profile.id },
            });
            queued += 1;
            results.push({ userId: row.profile.userId, status: "queued", jobId: job.id });
            continue;
        }

        try {
            const analysis = await requestProfileAnalysis(buildWorkerProfilePayload(row.profile));
            if (!analysis) {
                const job = await ensureProfileIntelligenceJob({
                    userId: row.profile.userId,
                    jobType: options.userId ? "profile_analyze" : "profile_backfill",
                    metadata: { source: "backfill_unconfigured_worker", profileId: row.profile.id },
                });
                queued += 1;
                results.push({ userId: row.profile.userId, status: "queued", jobId: job.id });
                continue;
            }

            await upsertProfileIntelligence(
                mapWorkerAnalysisToProfileIntelligence({
                    userId: row.profile.userId,
                    profile: row.profile,
                    analysis,
                    lastSeenAt: row.account.lastActive ?? row.profile.lastActive ?? null,
                }),
            );
            succeeded += 1;
            results.push({ userId: row.profile.userId, status: "ok" });
        } catch (error) {
            failed += 1;
            results.push({
                userId: row.profile.userId,
                status: "error",
                error: error instanceof Error ? error.message : "unknown_error",
            });
        }
    }

    const processed = rows.length;
    const nextOffset = offset + processed < totalCandidates ? offset + processed : null;
    return {
        totalCandidates,
        processed,
        succeeded,
        failed,
        queued,
        hasMore: nextOffset !== null && processed === limit,
        nextOffset,
        results,
    };
}

export async function backfillAllProfileIntelligence(
    options: ProfileIntelligenceBackfillOptions & {
        onBatchComplete?: (result: ProfileIntelligenceBackfillResult, batchNumber: number, offset: number) => void;
    } = {},
) {
    let offset = Math.max(options.offset ?? 0, 0);
    let batchNumber = 0;
    let totalProcessed = 0;
    let totalSucceeded = 0;
    let totalFailed = 0;
    let totalQueued = 0;
    let lastResult: ProfileIntelligenceBackfillResult = {
        totalCandidates: 0,
        processed: 0,
        succeeded: 0,
        failed: 0,
        queued: 0,
        hasMore: false,
        nextOffset: null,
        results: [],
    };

    while (true) {
        batchNumber += 1;
        lastResult = await backfillProfileIntelligence({ ...options, offset });
        options.onBatchComplete?.(lastResult, batchNumber, offset);
        totalProcessed += lastResult.processed;
        totalSucceeded += lastResult.succeeded;
        totalFailed += lastResult.failed;
        totalQueued += lastResult.queued;

        if (!lastResult.hasMore || lastResult.nextOffset === null || lastResult.processed === 0) {
            break;
        }
        offset = lastResult.nextOffset;
    }

    return {
        batches: batchNumber,
        totalProcessed,
        totalSucceeded,
        totalFailed,
        totalQueued,
        lastResult,
    };
}

export async function runProfileIntelligenceJobs(options: { limit?: number } = {}): Promise<ProfileIntelligenceJobRunResult> {
    const limit = Math.min(Math.max(options.limit ?? 10, 1), 50);
    const jobs = await db.query.profileIntelligenceJobs.findMany({
        where: eq(profileIntelligenceJobs.status, "pending"),
        orderBy: (table, { asc }) => [asc(table.createdAt)],
        limit,
    });

    const results: ProfileIntelligenceJobRunResult["results"] = [];
    let succeeded = 0;
    let failed = 0;

    for (const job of jobs) {
        const processing = await markProfileIntelligenceJobProcessing(job);
        try {
            if (!processing.userId) {
                throw new Error("Profile intelligence job is missing userId.");
            }
            await analyzeProfileIntelligenceForUser(processing.userId);
            await markProfileIntelligenceJobComplete(processing);
            succeeded += 1;
            results.push({ jobId: processing.id, userId: processing.userId, status: "completed" });
        } catch (error) {
            await markProfileIntelligenceJobFailed(
                processing,
                error instanceof Error ? error.message : "unknown_error",
            );
            failed += 1;
            results.push({
                jobId: processing.id,
                userId: processing.userId,
                status: "failed",
                error: error instanceof Error ? error.message : "unknown_error",
            });
        }
    }

    return {
        claimed: jobs.length,
        succeeded,
        failed,
        results,
    };
}

export async function recordMatchmakerIntent(input: {
    userId: string;
    rawText: string;
    parsedIntent?: Record<string, unknown>;
    intentEmbedding?: number[];
    metadata?: Record<string, unknown>;
}): Promise<MatchmakerIntent> {
    const [intent] = await db
        .insert(matchmakerIntents)
        .values({
            userId: input.userId,
            rawText: input.rawText,
            parsedIntent: input.parsedIntent ?? {},
            intentEmbedding: input.intentEmbedding,
            metadata: input.metadata ?? {},
        })
        .returning();

    return intent;
}
