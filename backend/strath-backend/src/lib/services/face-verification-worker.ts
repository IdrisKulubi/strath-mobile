import {
    claimFaceVerificationJobs,
    completeFaceVerificationJob,
    FACE_VERIFICATION_JOB_TYPES,
    rescheduleFaceVerificationJob,
} from "@/lib/services/face-verification-queue";
import {
    getFaceVerificationWorkerBatchSize,
    getFaceVerificationWorkerConcurrency,
} from "@/lib/services/face-verification-policy";
import { processFaceVerificationSession } from "@/lib/services/face-verification-processor";
import { auditProfilePhotoAsset } from "@/lib/services/profile-photo-assets";

export async function processFaceVerificationJobBatch(input?: {
    batchSize?: number;
    workerId?: string;
}) {
    const workerId =
        input?.workerId ??
        `face-worker-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const claimedJobs = await claimFaceVerificationJobs(
        input?.batchSize ?? getFaceVerificationWorkerBatchSize(),
        workerId,
    );

    if (claimedJobs.length === 0) {
        return {
            workerId,
            claimedCount: 0,
            processedCount: 0,
            jobs: [],
        };
    }

    const results = await runWithConcurrency(
        claimedJobs,
        getFaceVerificationWorkerConcurrency(),
        async (job) => {
            try {
                if (job.jobType === FACE_VERIFICATION_JOB_TYPES.PROCESS_SESSION) {
                    if (!job.sessionId) {
                        throw new Error("Queued verification session job is missing a session id");
                    }

                    const session = await processFaceVerificationSession(job.sessionId);
                    await completeFaceVerificationJob(job.id);

                    return {
                        jobId: job.id,
                        jobType: job.jobType,
                        status: "completed",
                        sessionId: job.sessionId,
                        finalStatus: session?.status ?? "unknown",
                    };
                }

                if (job.jobType === FACE_VERIFICATION_JOB_TYPES.AUDIT_PROFILE_PHOTO) {
                    if (!job.assetKey) {
                        throw new Error("Queued profile photo audit job is missing an asset key");
                    }

                    const asset = await auditProfilePhotoAsset(job.assetKey);
                    await completeFaceVerificationJob(job.id);

                    return {
                        jobId: job.id,
                        jobType: job.jobType,
                        status: "completed",
                        assetKey: job.assetKey,
                        verificationReady: asset?.verificationReady ?? false,
                    };
                }

                throw new Error(`Unsupported face verification job type: ${job.jobType}`);
            } catch (error) {
                await rescheduleFaceVerificationJob(job, error);

                return {
                    jobId: job.id,
                    jobType: job.jobType,
                    status: "rescheduled",
                    error: error instanceof Error ? error.message : "unknown_error",
                };
            }
        },
    );

    return {
        workerId,
        claimedCount: claimedJobs.length,
        processedCount: results.length,
        jobs: results,
    };
}

async function runWithConcurrency<TInput, TOutput>(
    items: TInput[],
    concurrency: number,
    worker: (item: TInput, index: number) => Promise<TOutput>,
) {
    const safeConcurrency = Math.max(1, Math.min(concurrency, items.length || 1));
    const results = new Array<TOutput>(items.length);
    let nextIndex = 0;

    await Promise.all(
        Array.from({ length: safeConcurrency }, async () => {
            while (nextIndex < items.length) {
                const currentIndex = nextIndex;
                nextIndex += 1;
                results[currentIndex] = await worker(items[currentIndex], currentIndex);
            }
        }),
    );

    return results;
}
