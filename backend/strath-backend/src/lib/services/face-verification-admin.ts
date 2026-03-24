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

import { faceVerificationSessions, profiles, user } from "@/db/schema";
import { db } from "@/lib/db";
import {
    FACE_VERIFICATION_STATUSES,
    getFaceVerificationCronBatchSize,
    getFaceVerificationProcessingMode,
} from "@/lib/services/face-verification-policy";

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
        statusCounts,
        recentStatusCounts,
        completionMetricsRow,
        oldestProcessingSession,
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
        db.query.faceVerificationSessions.findFirst({
            where: eq(faceVerificationSessions.status, FACE_VERIFICATION_STATUSES.PROCESSING),
            orderBy: [asc(faceVerificationSessions.startedAt)],
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

    return {
        configuration: {
            processingMode: getFaceVerificationProcessingMode(),
            cronBatchSize: getFaceVerificationCronBatchSize(),
        },
        totals: {
            totalSessions: totalSessionsRow[0]?.count ?? 0,
            queueDepth: queueDepthRow[0]?.count ?? 0,
            pendingCapture: pendingCaptureRow[0]?.count ?? 0,
            staleProcessing: staleProcessingRow[0]?.count ?? 0,
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
