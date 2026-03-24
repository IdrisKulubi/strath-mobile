import {
    and,
    asc,
    desc,
    eq,
    gte,
    inArray,
    isNotNull,
    lte,
    or,
    sql,
} from "drizzle-orm";

import { faceVerificationJobs, faceVerificationSessions, profilePhotoAssets, profiles, user } from "@/db/schema";
import { db } from "@/lib/db";
import {
    FACE_VERIFICATION_STATUSES,
    getFaceVerificationComparisonConcurrency,
    getFaceVerificationCronBatchSize,
    getFaceVerificationWorkerBatchSize,
    getFaceVerificationWorkerConcurrency,
    getFaceVerificationProcessingMode,
} from "@/lib/services/face-verification-policy";
import {
    FACE_VERIFICATION_JOB_STATUSES,
    FACE_VERIFICATION_JOB_TYPES,
} from "@/lib/services/face-verification-queue";

const ATTENTION_STATUSES = [
    FACE_VERIFICATION_STATUSES.MANUAL_REVIEW,
    FACE_VERIFICATION_STATUSES.RETRY_REQUIRED,
    FACE_VERIFICATION_STATUSES.FAILED,
] as const;

const COMPLETED_STATUSES = [
    FACE_VERIFICATION_STATUSES.VERIFIED,
    FACE_VERIFICATION_STATUSES.RETRY_REQUIRED,
    FACE_VERIFICATION_STATUSES.MANUAL_REVIEW,
    FACE_VERIFICATION_STATUSES.FAILED,
    FACE_VERIFICATION_STATUSES.BLOCKED,
] as const;

export async function getFaceVerificationAdminOverview(limit = 20) {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const safeLimit = Math.max(1, Math.min(limit, 100));

    const [
        totalSessionsRow,
        queueDepthRow,
        pendingCaptureRow,
        staleProcessingRow,
        queueJobMetricsRow,
        statusCounts,
        recentStatusCounts,
        completionMetricsRow,
        jobPerformanceRow,
        photoAssetMetricsRow,
        oldestProcessingSession,
        oldestPendingJob,
        recentAttentionSessions,
        recentProcessedSessions,
    ] = await Promise.all([
        db
            .select({ count: sql<number>`count(*)::int` })
            .from(faceVerificationSessions),
        db
            .select({ count: sql<number>`count(*)::int` })
            .from(faceVerificationSessions)
            .where(eq(faceVerificationSessions.status, FACE_VERIFICATION_STATUSES.PROCESSING)),
        db
            .select({ count: sql<number>`count(*)::int` })
            .from(faceVerificationSessions)
            .where(eq(faceVerificationSessions.status, FACE_VERIFICATION_STATUSES.PENDING_CAPTURE)),
        db
            .select({ count: sql<number>`count(*)::int` })
            .from(faceVerificationSessions)
            .where(
                and(
                    eq(faceVerificationSessions.status, FACE_VERIFICATION_STATUSES.PROCESSING),
                    lte(faceVerificationSessions.expiresAt, now),
                ),
            ),
        db.execute(sql`
            select
                count(*) filter (where ${faceVerificationJobs.status} = ${FACE_VERIFICATION_JOB_STATUSES.PENDING})::int as pending_jobs,
                count(*) filter (where ${faceVerificationJobs.status} = ${FACE_VERIFICATION_JOB_STATUSES.PROCESSING})::int as processing_jobs,
                count(*) filter (where ${faceVerificationJobs.status} = ${FACE_VERIFICATION_JOB_STATUSES.FAILED})::int as failed_jobs,
                count(*) filter (where ${faceVerificationJobs.jobType} = ${FACE_VERIFICATION_JOB_TYPES.AUDIT_PROFILE_PHOTO}
                    and ${faceVerificationJobs.status} in (${FACE_VERIFICATION_JOB_STATUSES.PENDING}, ${FACE_VERIFICATION_JOB_STATUSES.PROCESSING}))::int as pending_photo_audits
            from ${faceVerificationJobs}
        `),
        db
            .select({
                status: faceVerificationSessions.status,
                count: sql<number>`count(*)::int`,
            })
            .from(faceVerificationSessions)
            .groupBy(faceVerificationSessions.status),
        db
            .select({
                status: faceVerificationSessions.status,
                count: sql<number>`count(*)::int`,
            })
            .from(faceVerificationSessions)
            .where(gte(faceVerificationSessions.createdAt, last24Hours))
            .groupBy(faceVerificationSessions.status),
        db
            .select({
                completedCount: sql<number>`count(*)::int`,
                avgDurationSeconds:
                    sql<number | null>`round(avg(extract(epoch from (${faceVerificationSessions.completedAt} - ${faceVerificationSessions.startedAt}))))::int`,
                maxDurationSeconds:
                    sql<number | null>`max(round(extract(epoch from (${faceVerificationSessions.completedAt} - ${faceVerificationSessions.startedAt})))::int)`,
            })
            .from(faceVerificationSessions)
            .where(
                and(
                    inArray(faceVerificationSessions.status, COMPLETED_STATUSES),
                    isNotNull(faceVerificationSessions.completedAt),
                    gte(faceVerificationSessions.completedAt, last24Hours),
                ),
            ),
        db.execute(sql`
            select
                count(*) filter (
                    where ${faceVerificationJobs.status} = ${FACE_VERIFICATION_JOB_STATUSES.COMPLETED}
                    and ${faceVerificationJobs.completedAt} >= ${last24Hours}
                )::int as completed_jobs_last_24h,
                round(avg(
                    extract(epoch from (${faceVerificationJobs.lockedAt} - ${faceVerificationJobs.createdAt}))
                ))::int as avg_queue_wait_seconds,
                round(avg(
                    extract(epoch from (${faceVerificationJobs.completedAt} - ${faceVerificationJobs.lockedAt}))
                ))::int as avg_job_runtime_seconds
            from ${faceVerificationJobs}
            where ${faceVerificationJobs.completedAt} is not null
        `),
        db.execute(sql`
            select
                count(*)::int as total_assets,
                count(*) filter (where ${profilePhotoAssets.verificationReady} = true)::int as verification_ready_assets,
                count(*) filter (
                    where ${profilePhotoAssets.verificationReady} = false
                    and ${profilePhotoAssets.lastAnalyzedAt} is not null
                )::int as assets_needing_refresh,
                count(*) filter (where ${profilePhotoAssets.lastAnalyzedAt} is null)::int as unanalyzed_assets
            from ${profilePhotoAssets}
        `),
        db.query.faceVerificationSessions.findFirst({
            where: eq(faceVerificationSessions.status, FACE_VERIFICATION_STATUSES.PROCESSING),
            orderBy: [asc(faceVerificationSessions.startedAt)],
        }),
        db.query.faceVerificationJobs.findFirst({
            where: eq(faceVerificationJobs.status, FACE_VERIFICATION_JOB_STATUSES.PENDING),
            orderBy: [asc(faceVerificationJobs.createdAt)],
        }),
        db
            .select({
                sessionId: faceVerificationSessions.id,
                userId: faceVerificationSessions.userId,
                status: faceVerificationSessions.status,
                attemptNumber: faceVerificationSessions.attemptNumber,
                failureReasons: faceVerificationSessions.failureReasons,
                expiresAt: faceVerificationSessions.expiresAt,
                startedAt: faceVerificationSessions.startedAt,
                completedAt: faceVerificationSessions.completedAt,
                updatedAt: faceVerificationSessions.updatedAt,
                email: user.email,
                name: user.name,
                firstName: profiles.firstName,
                lastName: profiles.lastName,
            })
            .from(faceVerificationSessions)
            .innerJoin(user, eq(faceVerificationSessions.userId, user.id))
            .leftJoin(profiles, eq(faceVerificationSessions.userId, profiles.userId))
            .where(
                or(
                    inArray(faceVerificationSessions.status, ATTENTION_STATUSES),
                    and(
                        eq(faceVerificationSessions.status, FACE_VERIFICATION_STATUSES.PROCESSING),
                        lte(faceVerificationSessions.expiresAt, now),
                    ),
                ),
            )
            .orderBy(desc(faceVerificationSessions.updatedAt))
            .limit(safeLimit),
        db
            .select({
                sessionId: faceVerificationSessions.id,
                userId: faceVerificationSessions.userId,
                status: faceVerificationSessions.status,
                attemptNumber: faceVerificationSessions.attemptNumber,
                startedAt: faceVerificationSessions.startedAt,
                completedAt: faceVerificationSessions.completedAt,
                updatedAt: faceVerificationSessions.updatedAt,
                email: user.email,
                name: user.name,
                firstName: profiles.firstName,
                lastName: profiles.lastName,
            })
            .from(faceVerificationSessions)
            .innerJoin(user, eq(faceVerificationSessions.userId, user.id))
            .leftJoin(profiles, eq(faceVerificationSessions.userId, profiles.userId))
            .where(inArray(faceVerificationSessions.status, COMPLETED_STATUSES))
            .orderBy(desc(faceVerificationSessions.updatedAt))
            .limit(safeLimit),
    ]);

    const allTimeByStatus = buildStatusCountMap(statusCounts);
    const last24HoursByStatus = buildStatusCountMap(recentStatusCounts);
    const queueJobMetrics = (queueJobMetricsRow.rows?.[0] as {
        pending_jobs?: number;
        processing_jobs?: number;
        failed_jobs?: number;
        pending_photo_audits?: number;
    } | undefined) ?? {};
    const jobPerformance = (jobPerformanceRow.rows?.[0] as {
        completed_jobs_last_24h?: number;
        avg_queue_wait_seconds?: number | null;
        avg_job_runtime_seconds?: number | null;
    } | undefined) ?? {};
    const photoAssetMetrics = (photoAssetMetricsRow.rows?.[0] as {
        total_assets?: number;
        verification_ready_assets?: number;
        assets_needing_refresh?: number;
        unanalyzed_assets?: number;
    } | undefined) ?? {};

    return {
        configuration: {
            processingMode: getFaceVerificationProcessingMode(),
            cronBatchSize: getFaceVerificationCronBatchSize(),
            workerBatchSize: getFaceVerificationWorkerBatchSize(),
            workerConcurrency: getFaceVerificationWorkerConcurrency(),
            comparisonConcurrency: getFaceVerificationComparisonConcurrency(),
        },
        totals: {
            totalSessions: totalSessionsRow[0]?.count ?? 0,
            queueDepth: queueDepthRow[0]?.count ?? 0,
            pendingCapture: pendingCaptureRow[0]?.count ?? 0,
            staleProcessing: staleProcessingRow[0]?.count ?? 0,
            pendingJobs: queueJobMetrics.pending_jobs ?? 0,
            processingJobs: queueJobMetrics.processing_jobs ?? 0,
            failedJobs: queueJobMetrics.failed_jobs ?? 0,
            pendingPhotoAudits: queueJobMetrics.pending_photo_audits ?? 0,
            attentionRequired:
                (allTimeByStatus[FACE_VERIFICATION_STATUSES.MANUAL_REVIEW] ?? 0) +
                (allTimeByStatus[FACE_VERIFICATION_STATUSES.RETRY_REQUIRED] ?? 0) +
                (allTimeByStatus[FACE_VERIFICATION_STATUSES.FAILED] ?? 0),
        },
        counts: {
            allTimeByStatus,
            last24HoursByStatus,
        },
        performance: {
            completedLast24Hours: completionMetricsRow[0]?.completedCount ?? 0,
            avgDurationSeconds: completionMetricsRow[0]?.avgDurationSeconds ?? null,
            maxDurationSeconds: completionMetricsRow[0]?.maxDurationSeconds ?? null,
            oldestProcessingStartedAt: oldestProcessingSession?.startedAt ?? null,
            completedJobsLast24Hours: jobPerformance.completed_jobs_last_24h ?? 0,
            avgQueueWaitSeconds: jobPerformance.avg_queue_wait_seconds ?? null,
            avgJobRuntimeSeconds: jobPerformance.avg_job_runtime_seconds ?? null,
            oldestPendingJobCreatedAt: oldestPendingJob?.createdAt ?? null,
        },
        assets: {
            totalAssets: photoAssetMetrics.total_assets ?? 0,
            verificationReadyAssets: photoAssetMetrics.verification_ready_assets ?? 0,
            assetsNeedingRefresh: photoAssetMetrics.assets_needing_refresh ?? 0,
            unanalyzedAssets: photoAssetMetrics.unanalyzed_assets ?? 0,
        },
        attentionSessions: recentAttentionSessions.map((session) => ({
            ...session,
            displayName: buildDisplayName(session.firstName, session.lastName, session.name),
            isExpiredProcessing:
                session.status === FACE_VERIFICATION_STATUSES.PROCESSING &&
                session.expiresAt.getTime() <= now.getTime(),
        })),
        recentProcessedSessions: recentProcessedSessions.map((session) => ({
            ...session,
            displayName: buildDisplayName(session.firstName, session.lastName, session.name),
            durationSeconds:
                session.completedAt
                    ? Math.max(
                          0,
                          Math.round(
                              (session.completedAt.getTime() - session.startedAt.getTime()) / 1000,
                          ),
                      )
                    : null,
        })),
        alerts: buildFaceVerificationAlerts({
            staleProcessing: staleProcessingRow[0]?.count ?? 0,
            pendingJobs: queueJobMetrics.pending_jobs ?? 0,
            failedJobs: queueJobMetrics.failed_jobs ?? 0,
            pendingPhotoAudits: queueJobMetrics.pending_photo_audits ?? 0,
            avgQueueWaitSeconds: jobPerformance.avg_queue_wait_seconds ?? null,
            assetsNeedingRefresh: photoAssetMetrics.assets_needing_refresh ?? 0,
            unanalyzedAssets: photoAssetMetrics.unanalyzed_assets ?? 0,
        }),
        generatedAt: now.toISOString(),
    };
}

function buildStatusCountMap(
    rows: Array<{
        status: string;
        count: number;
    }>,
) {
    return rows.reduce<Record<string, number>>((acc, row) => {
        acc[row.status] = row.count;
        return acc;
    }, {});
}

function buildDisplayName(
    firstName: string | null,
    lastName: string | null,
    fallbackName: string | null,
) {
    const profileName = [firstName, lastName].filter(Boolean).join(" ").trim();
    return profileName || fallbackName || "Unknown user";
}

function buildFaceVerificationAlerts(input: {
    staleProcessing: number;
    pendingJobs: number;
    failedJobs: number;
    pendingPhotoAudits: number;
    avgQueueWaitSeconds: number | null;
    assetsNeedingRefresh: number;
    unanalyzedAssets: number;
}) {
    const alerts: Array<{
        severity: "info" | "warning" | "critical";
        code: string;
        message: string;
    }> = [];

    if (input.staleProcessing > 0) {
        alerts.push({
            severity: "critical",
            code: "stale_processing",
            message: `${input.staleProcessing} verification sessions are stuck in processing.`,
        });
    }

    if (input.pendingJobs >= 25) {
        alerts.push({
            severity: "warning",
            code: "queue_backlog",
            message: `${input.pendingJobs} jobs are waiting in the verification queue.`,
        });
    }

    if (input.avgQueueWaitSeconds !== null && input.avgQueueWaitSeconds >= 60) {
        alerts.push({
            severity: "warning",
            code: "queue_latency",
            message: `Average queue wait is ${input.avgQueueWaitSeconds}s. Worker capacity may need to increase.`,
        });
    }

    if (input.failedJobs > 0) {
        alerts.push({
            severity: "warning",
            code: "failed_jobs",
            message: `${input.failedJobs} verification jobs are in a failed state and need review.`,
        });
    }

    if (input.pendingPhotoAudits >= 20 || input.unanalyzedAssets >= 20) {
        alerts.push({
            severity: "info",
            code: "photo_audit_backlog",
            message: `${Math.max(input.pendingPhotoAudits, input.unanalyzedAssets)} profile photos are still waiting for audit coverage.`,
        });
    }

    if (input.assetsNeedingRefresh > 0) {
        alerts.push({
            severity: "info",
            code: "photos_need_refresh",
            message: `${input.assetsNeedingRefresh} uploaded profile photos were analyzed but are not verification-ready.`,
        });
    }

    return alerts;
}
