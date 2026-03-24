import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { faceVerificationJobs, type FaceVerificationJob } from "@/db/schema";
import {
    getFaceVerificationJobLeaseSeconds,
    getFaceVerificationJobMaxAttempts,
    getFaceVerificationJobRetryDelaySeconds,
} from "@/lib/services/face-verification-policy";

export const FACE_VERIFICATION_JOB_TYPES = {
    PROCESS_SESSION: "process_face_verification_session",
    AUDIT_PROFILE_PHOTO: "audit_profile_photo_asset",
} as const;

export const FACE_VERIFICATION_JOB_STATUSES = {
    PENDING: "pending",
    PROCESSING: "processing",
    COMPLETED: "completed",
    FAILED: "failed",
} as const;

export async function ensureFaceVerificationSessionJob(sessionId: string, userId: string) {
    const existingJob = await db.query.faceVerificationJobs.findFirst({
        where: and(
            eq(faceVerificationJobs.jobType, FACE_VERIFICATION_JOB_TYPES.PROCESS_SESSION),
            eq(faceVerificationJobs.sessionId, sessionId),
            inArray(faceVerificationJobs.status, [
                FACE_VERIFICATION_JOB_STATUSES.PENDING,
                FACE_VERIFICATION_JOB_STATUSES.PROCESSING,
            ]),
        ),
    });

    if (existingJob) {
        return existingJob;
    }

    const [job] = await db
        .insert(faceVerificationJobs)
        .values({
            jobType: FACE_VERIFICATION_JOB_TYPES.PROCESS_SESSION,
            status: FACE_VERIFICATION_JOB_STATUSES.PENDING,
            userId,
            sessionId,
            priority: 10,
            maxAttempts: getFaceVerificationJobMaxAttempts(),
            payload: {},
            availableAt: new Date(),
        })
        .returning();

    return job;
}

export async function ensureProfilePhotoAuditJob(
    userId: string,
    assetKey: string,
    publicUrl?: string,
) {
    const existingJob = await db.query.faceVerificationJobs.findFirst({
        where: and(
            eq(faceVerificationJobs.jobType, FACE_VERIFICATION_JOB_TYPES.AUDIT_PROFILE_PHOTO),
            eq(faceVerificationJobs.assetKey, assetKey),
            inArray(faceVerificationJobs.status, [
                FACE_VERIFICATION_JOB_STATUSES.PENDING,
                FACE_VERIFICATION_JOB_STATUSES.PROCESSING,
            ]),
        ),
    });

    if (existingJob) {
        return existingJob;
    }

    const [job] = await db
        .insert(faceVerificationJobs)
        .values({
            jobType: FACE_VERIFICATION_JOB_TYPES.AUDIT_PROFILE_PHOTO,
            status: FACE_VERIFICATION_JOB_STATUSES.PENDING,
            userId,
            assetKey,
            priority: 50,
            maxAttempts: getFaceVerificationJobMaxAttempts(),
            payload: publicUrl ? { publicUrl } : {},
            availableAt: new Date(),
        })
        .returning();

    return job;
}

export async function claimFaceVerificationJobs(limit: number, workerId: string) {
    const safeLimit = Math.max(1, Math.min(limit, 100));
    const leaseSeconds = getFaceVerificationJobLeaseSeconds();

    const result = await db.execute(sql`
        with next_jobs as (
            select id
            from ${faceVerificationJobs}
            where (
                (${faceVerificationJobs.status} = ${FACE_VERIFICATION_JOB_STATUSES.PENDING}
                    and ${faceVerificationJobs.availableAt} <= now())
                or
                (${faceVerificationJobs.status} = ${FACE_VERIFICATION_JOB_STATUSES.PROCESSING}
                    and ${faceVerificationJobs.leaseExpiresAt} is not null
                    and ${faceVerificationJobs.leaseExpiresAt} <= now())
            )
            order by ${faceVerificationJobs.priority} asc, ${faceVerificationJobs.createdAt} asc
            limit ${safeLimit}
            for update skip locked
        )
        update ${faceVerificationJobs}
        set
            status = ${FACE_VERIFICATION_JOB_STATUSES.PROCESSING},
            attempts = ${faceVerificationJobs.attempts} + 1,
            locked_at = now(),
            lease_expires_at = now() + (${leaseSeconds} * interval '1 second'),
            claimed_by = ${workerId},
            updated_at = now()
        where ${faceVerificationJobs.id} in (select id from next_jobs)
        returning *
    `);

    return ((result.rows ?? []) as FaceVerificationJob[]).map((job) => ({
        ...job,
        createdAt: new Date(job.createdAt),
        updatedAt: new Date(job.updatedAt),
        availableAt: new Date(job.availableAt),
        lockedAt: job.lockedAt ? new Date(job.lockedAt) : null,
        leaseExpiresAt: job.leaseExpiresAt ? new Date(job.leaseExpiresAt) : null,
        completedAt: job.completedAt ? new Date(job.completedAt) : null,
    }));
}

export async function completeFaceVerificationJob(jobId: string) {
    await db
        .update(faceVerificationJobs)
        .set({
            status: FACE_VERIFICATION_JOB_STATUSES.COMPLETED,
            completedAt: new Date(),
            leaseExpiresAt: null,
            lockedAt: null,
            updatedAt: new Date(),
        })
        .where(eq(faceVerificationJobs.id, jobId));
}

export async function rescheduleFaceVerificationJob(job: FaceVerificationJob, error: unknown) {
    const nextAttempts = job.attempts;
    const lastError = error instanceof Error ? error.message : "unknown_error";

    if (nextAttempts >= job.maxAttempts) {
        await db
            .update(faceVerificationJobs)
            .set({
                status: FACE_VERIFICATION_JOB_STATUSES.FAILED,
                lastError,
                completedAt: new Date(),
                leaseExpiresAt: null,
                lockedAt: null,
                updatedAt: new Date(),
            })
            .where(eq(faceVerificationJobs.id, job.id));

        return;
    }

    const retryDelaySeconds = getFaceVerificationJobRetryDelaySeconds() * Math.max(1, nextAttempts);

    await db
        .update(faceVerificationJobs)
        .set({
            status: FACE_VERIFICATION_JOB_STATUSES.PENDING,
            availableAt: new Date(Date.now() + retryDelaySeconds * 1000),
            lastError,
            leaseExpiresAt: null,
            lockedAt: null,
            updatedAt: new Date(),
        })
        .where(eq(faceVerificationJobs.id, job.id));
}

export async function getFaceVerificationJobById(jobId: string) {
    return db.query.faceVerificationJobs.findFirst({
        where: eq(faceVerificationJobs.id, jobId),
    });
}

export async function getExistingActiveFaceVerificationJob(input: {
    jobType: string;
    sessionId?: string | null;
    assetKey?: string | null;
}) {
    const filters = [
        eq(faceVerificationJobs.jobType, input.jobType),
        inArray(faceVerificationJobs.status, [
            FACE_VERIFICATION_JOB_STATUSES.PENDING,
            FACE_VERIFICATION_JOB_STATUSES.PROCESSING,
        ]),
    ];

    if (input.sessionId) {
        filters.push(eq(faceVerificationJobs.sessionId, input.sessionId));
    }

    if (input.assetKey) {
        filters.push(eq(faceVerificationJobs.assetKey, input.assetKey));
    }

    return db.query.faceVerificationJobs.findFirst({
        where: and(...filters),
    });
}

export async function releaseProcessingFaceVerificationJobs(workerId: string) {
    await db
        .update(faceVerificationJobs)
        .set({
            status: FACE_VERIFICATION_JOB_STATUSES.PENDING,
            leaseExpiresAt: null,
            lockedAt: null,
            claimedBy: null,
            updatedAt: new Date(),
        })
        .where(
            and(
                eq(faceVerificationJobs.status, FACE_VERIFICATION_JOB_STATUSES.PROCESSING),
                eq(faceVerificationJobs.claimedBy, workerId),
            ),
        );
}

export async function getRetryableFaceVerificationJobCounts() {
    const result = await db.execute(sql`
        select
            count(*) filter (where ${faceVerificationJobs.status} = ${FACE_VERIFICATION_JOB_STATUSES.PENDING})::int as pending_count,
            count(*) filter (where ${faceVerificationJobs.status} = ${FACE_VERIFICATION_JOB_STATUSES.PROCESSING})::int as processing_count,
            count(*) filter (where ${faceVerificationJobs.status} = ${FACE_VERIFICATION_JOB_STATUSES.FAILED})::int as failed_count
        from ${faceVerificationJobs}
    `);

    return (result.rows?.[0] as
        | {
              pending_count?: number;
              processing_count?: number;
              failed_count?: number;
          }
        | undefined) ?? {};
}
