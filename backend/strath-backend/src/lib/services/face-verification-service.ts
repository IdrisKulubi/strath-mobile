import { and, eq } from "drizzle-orm";

import {
    faceVerificationResults,
    faceVerificationSessions,
    profiles,
} from "@/db/schema";
import { db } from "@/lib/db";
import {
    FACE_VERIFICATION_STATUSES,
    canRetryFaceVerification,
    getFaceVerificationExpiryDate,
    getFaceVerificationMethod,
    getFaceVerificationThresholdVersion,
    isFaceVerificationActiveStatus,
    isFaceVerificationExpired,
} from "@/lib/services/face-verification-policy";
import {
    buildFaceVerificationSelfieKey,
    createFaceVerificationUploadTarget,
    extractR2ObjectKeyFromUrl,
    getRekognitionUnsupportedImageKeys,
} from "@/lib/services/face-verification-storage";
import { ensureFaceVerificationSessionJob } from "@/lib/services/face-verification-queue";
import { syncProfilePhotoAssetsForUser } from "@/lib/services/profile-photo-assets";
import type {
    CreateFaceVerificationSessionInput,
    CreateFaceVerificationUploadTargetsInput,
    RetryFaceVerificationSessionInput,
    SubmitFaceVerificationSessionInput,
} from "@/lib/validation/face-verification";

type UploadTarget = Awaited<ReturnType<typeof createFaceVerificationUploadTarget>> & {
    slot: CreateFaceVerificationUploadTargetsInput["uploads"][number]["slot"];
};

export async function getLatestFaceVerificationSession(userId: string) {
    return db.query.faceVerificationSessions.findFirst({
        where: eq(faceVerificationSessions.userId, userId),
        orderBy: (table, { desc: sortDesc }) => [sortDesc(table.createdAt)],
        with: {
            results: true,
        },
    });
}

export async function getFaceVerificationSessionByIdForUser(userId: string, sessionId: string) {
    return db.query.faceVerificationSessions.findFirst({
        where: and(
            eq(faceVerificationSessions.id, sessionId),
            eq(faceVerificationSessions.userId, userId),
        ),
        with: {
            results: true,
        },
    });
}

export async function createFaceVerificationSession(
    userId: string,
    input: CreateFaceVerificationSessionInput,
) {
    const latestSession = await db.query.faceVerificationSessions.findFirst({
        where: eq(faceVerificationSessions.userId, userId),
        orderBy: (table, { desc: sortDesc }) => [sortDesc(table.createdAt)],
    });

    if (latestSession && isFaceVerificationActiveStatus(latestSession.status) && isFaceVerificationExpired(latestSession.expiresAt)) {
        await expireActiveFaceVerificationSession(latestSession.id, latestSession.status);
    }

    const refreshedLatestSession = latestSession && isFaceVerificationExpired(latestSession.expiresAt)
        ? await db.query.faceVerificationSessions.findFirst({
              where: eq(faceVerificationSessions.userId, userId),
              orderBy: (table, { desc: sortDesc }) => [sortDesc(table.createdAt)],
          })
        : latestSession;

    if (refreshedLatestSession && isFaceVerificationActiveStatus(refreshedLatestSession.status) && !input.resetActiveSession) {
        return refreshedLatestSession;
    }

    if (refreshedLatestSession && isFaceVerificationActiveStatus(refreshedLatestSession.status) && input.resetActiveSession) {
        await db
            .update(faceVerificationSessions)
            .set({
                status: FACE_VERIFICATION_STATUSES.FAILED,
                completedAt: new Date(),
                updatedAt: new Date(),
                failureReasons: Array.from(new Set([...(refreshedLatestSession.failureReasons ?? []), "session_replaced"])),
            })
            .where(eq(faceVerificationSessions.id, refreshedLatestSession.id));
    }

    const attemptNumber = (refreshedLatestSession?.attemptNumber ?? 0) + 1;
    const expiresAt = getFaceVerificationExpiryDate();

    const [session] = await db
        .insert(faceVerificationSessions)
        .values({
            userId,
            status: FACE_VERIFICATION_STATUSES.PENDING_CAPTURE,
            attemptNumber,
            thresholdConfigVersion: getFaceVerificationThresholdVersion(),
            expiresAt,
            decisionSummary: {
                createdBy: "api",
            },
        })
        .returning();

    await updateProfileFaceVerificationSummary(userId, {
        faceVerificationStatus: FACE_VERIFICATION_STATUSES.PENDING_CAPTURE,
        faceVerificationRequired: true,
        faceVerificationRetryCount: Math.max(0, attemptNumber - 1),
    });

    return session;
}

export async function expireActiveFaceVerificationSession(
    sessionId: string,
    currentStatus: string,
) {
    const session = await db.query.faceVerificationSessions.findFirst({
        where: eq(faceVerificationSessions.id, sessionId),
    });

    if (!session || !isFaceVerificationActiveStatus(session.status)) {
        return session;
    }

    const timeoutReason =
        currentStatus === FACE_VERIFICATION_STATUSES.PROCESSING
            ? "processing_timeout"
            : "session_expired";

    const [updatedSession] = await db
        .update(faceVerificationSessions)
        .set({
            status: FACE_VERIFICATION_STATUSES.FAILED,
            completedAt: new Date(),
            updatedAt: new Date(),
            failureReasons: Array.from(new Set([...(session.failureReasons ?? []), timeoutReason])),
            decisionSummary: {
                ...session.decisionSummary,
                expiredAt: new Date().toISOString(),
                expiredFromStatus: session.status,
            },
        })
        .where(eq(faceVerificationSessions.id, session.id))
        .returning();

    await updateProfileFaceVerificationSummary(session.userId, {
        faceVerificationStatus: FACE_VERIFICATION_STATUSES.FAILED,
        faceVerificationMethod: getFaceVerificationMethod(),
        faceVerificationVersion: getFaceVerificationThresholdVersion(),
        faceVerificationRequired: true,
        faceVerificationRetryCount: Math.max(0, updatedSession.attemptNumber - 1),
        faceVerifiedAt: null,
    });

    return updatedSession;
}

export async function createFaceVerificationUploadTargets(
    userId: string,
    input: CreateFaceVerificationUploadTargetsInput,
) {
    const session = await requireMutableSession(userId, input.sessionId);

    const targets: UploadTarget[] = [];
    const nextKeys = [...session.selfieAssetKeys];

    for (const upload of input.uploads) {
        const key = buildFaceVerificationSelfieKey(userId, session.id, upload.slot, upload.contentType);
        const target = await createFaceVerificationUploadTarget(key, upload.contentType);
        targets.push({ ...target, slot: upload.slot });
        nextKeys.push(key);
    }

    const uniqueKeys = Array.from(new Set(nextKeys));

    const [updatedSession] = await db
        .update(faceVerificationSessions)
        .set({
            selfieAssetKeys: uniqueKeys,
            updatedAt: new Date(),
        })
        .where(eq(faceVerificationSessions.id, session.id))
        .returning();

    return {
        session: updatedSession,
        uploadTargets: targets,
    };
}

export async function submitFaceVerificationSession(
    userId: string,
    input: SubmitFaceVerificationSessionInput,
) {
    const session = await requireMutableSession(userId, input.sessionId);

    if (session.selfieAssetKeys.length === 0) {
        throw new Error("At least one selfie capture is required before submission.");
    }

    const unsupportedSelfies = getRekognitionUnsupportedImageKeys(session.selfieAssetKeys);
    if (unsupportedSelfies.length > 0) {
        throw new Error("Verification selfies must be uploaded as JPEG or PNG images.");
    }

    const extractedProfileAssetKeys = Array.from(
        new Set(
            input.profilePhotoUrls
                .map((url) => extractR2ObjectKeyFromUrl(url))
                .filter((value): value is string => !!value),
        ),
    );

    if (extractedProfileAssetKeys.length < 2) {
        throw new Error("Face verification needs at least 2 clear profile photos before you continue.");
    }

    await syncProfilePhotoAssetsForUser(userId, input.profilePhotoUrls);

    const [updatedSession] = await db
        .update(faceVerificationSessions)
        .set({
            status: FACE_VERIFICATION_STATUSES.PROCESSING,
            profileAssetKeys: extractedProfileAssetKeys,
            updatedAt: new Date(),
            decisionSummary: {
                ...session.decisionSummary,
                queuedAt: new Date().toISOString(),
                provider: "amazon-rekognition",
                providerMode: "comparefaces",
            },
            failureReasons: [],
        })
        .where(eq(faceVerificationSessions.id, session.id))
        .returning();

    await updateProfileFaceVerificationSummary(userId, {
        faceVerificationStatus: FACE_VERIFICATION_STATUSES.PROCESSING,
        faceVerificationMethod: getFaceVerificationMethod(),
        faceVerificationVersion: getFaceVerificationThresholdVersion(),
        faceVerificationRequired: true,
        faceVerificationRetryCount: Math.max(0, updatedSession.attemptNumber - 1),
    });

    await ensureFaceVerificationSessionJob(updatedSession.id, userId);

    return {
        session: updatedSession,
        queued: true,
    };
}

export async function retryFaceVerificationSession(
    userId: string,
    input: RetryFaceVerificationSessionInput,
) {
    const latestSession = input.sessionId
        ? await getFaceVerificationSessionByIdForUser(userId, input.sessionId)
        : await getLatestFaceVerificationSession(userId);

    if (!latestSession) {
        throw new Error("No verification session found to retry.");
    }

    if (!canRetryFaceVerification(latestSession.status, latestSession.attemptNumber)) {
        throw new Error("This verification session cannot be retried.");
    }

    return createFaceVerificationSession(userId, { resetActiveSession: true });
}

export async function queueFaceVerificationSessionForProcessing(sessionId: string) {
    const session = await db.query.faceVerificationSessions.findFirst({
        where: eq(faceVerificationSessions.id, sessionId),
    });

    if (!session) {
        throw new Error("Verification session not found.");
    }

    if (session.status === FACE_VERIFICATION_STATUSES.VERIFIED || session.status === FACE_VERIFICATION_STATUSES.BLOCKED) {
        throw new Error("This verification session cannot be reprocessed.");
    }

    const [updatedSession] = await db
        .update(faceVerificationSessions)
        .set({
            status: FACE_VERIFICATION_STATUSES.PROCESSING,
            completedAt: null,
            updatedAt: new Date(),
            decisionSummary: {
                ...session.decisionSummary,
                requeuedAt: new Date().toISOString(),
                requeuedBy: "admin",
            },
        })
        .where(eq(faceVerificationSessions.id, session.id))
        .returning();

    await updateProfileFaceVerificationSummary(session.userId, {
        faceVerificationStatus: FACE_VERIFICATION_STATUSES.PROCESSING,
        faceVerificationMethod: getFaceVerificationMethod(),
        faceVerificationVersion: getFaceVerificationThresholdVersion(),
        faceVerificationRequired: true,
        faceVerificationRetryCount: Math.max(0, updatedSession.attemptNumber - 1),
        faceVerifiedAt: null,
    });

    await ensureFaceVerificationSessionJob(updatedSession.id, session.userId);

    return updatedSession;
}

export async function markFaceVerificationSessionReviewed(
    sessionId: string,
    status: "verified" | "manual_review" | "failed" | "blocked",
    reason: string,
) {
    const session = await db.query.faceVerificationSessions.findFirst({
        where: eq(faceVerificationSessions.id, sessionId),
    });

    if (!session) {
        throw new Error("Verification session not found.");
    }

    const [updatedSession] = await db
        .update(faceVerificationSessions)
        .set({
            status,
            completedAt: new Date(),
            updatedAt: new Date(),
            failureReasons:
                status === FACE_VERIFICATION_STATUSES.VERIFIED
                    ? []
                    : Array.from(new Set([...(session.failureReasons ?? []), reason])),
            decisionSummary: {
                ...session.decisionSummary,
                reviewReason: reason,
                reviewedAt: new Date().toISOString(),
            },
        })
        .where(eq(faceVerificationSessions.id, sessionId))
        .returning();

    await updateProfileFaceVerificationSummary(session.userId, {
        faceVerificationStatus: status,
        faceVerificationMethod: getFaceVerificationMethod(),
        faceVerificationVersion: getFaceVerificationThresholdVersion(),
        faceVerificationRequired: true,
        faceVerificationRetryCount: Math.max(0, updatedSession.attemptNumber - 1),
        faceVerifiedAt: status === FACE_VERIFICATION_STATUSES.VERIFIED ? new Date() : null,
    });

    if (status !== FACE_VERIFICATION_STATUSES.VERIFIED) {
        await db.insert(faceVerificationResults).values({
            sessionId: updatedSession.id,
            sourceAssetKey: updatedSession.selfieAssetKeys[0] ?? "pending",
            targetAssetKey: updatedSession.profileAssetKeys[0] ?? "pending",
            decision: status,
            qualityFlags: [reason],
            rawProviderResponseRedacted: {
                reviewOnly: true,
            },
        });
    }

    return updatedSession;
}

async function requireMutableSession(userId: string, sessionId: string) {
    const session = await db.query.faceVerificationSessions.findFirst({
        where: and(
            eq(faceVerificationSessions.id, sessionId),
            eq(faceVerificationSessions.userId, userId),
        ),
    });

    if (!session) {
        throw new Error("Verification session not found.");
    }

    if (session.status !== FACE_VERIFICATION_STATUSES.PENDING_CAPTURE) {
        throw new Error(`Verification session is not accepting captures. Current status: ${session.status}`);
    }

    if (session.expiresAt <= new Date()) {
        throw new Error("Verification session has expired. Please start a new attempt.");
    }

    return session;
}

async function updateProfileFaceVerificationSummary(
    userId: string,
    updates: {
        faceVerificationStatus: string;
        faceVerificationMethod?: string;
        faceVerificationVersion?: string;
        faceVerificationRequired?: boolean;
        faceVerificationRetryCount?: number;
        faceVerifiedAt?: Date | null;
    },
) {
    const existingProfile = await db.query.profiles.findFirst({
        where: eq(profiles.userId, userId),
    });

    if (!existingProfile) {
        return null;
    }

    const [updatedProfile] = await db
        .update(profiles)
        .set({
            faceVerificationStatus: updates.faceVerificationStatus,
            faceVerificationMethod: updates.faceVerificationMethod ?? existingProfile.faceVerificationMethod,
            faceVerificationVersion: updates.faceVerificationVersion ?? existingProfile.faceVerificationVersion,
            faceVerificationRequired:
                updates.faceVerificationRequired ?? existingProfile.faceVerificationRequired,
            faceVerificationRetryCount:
                updates.faceVerificationRetryCount ?? existingProfile.faceVerificationRetryCount,
            faceVerifiedAt:
                updates.faceVerifiedAt === undefined ? existingProfile.faceVerifiedAt : updates.faceVerifiedAt,
            updatedAt: new Date(),
        })
        .where(eq(profiles.userId, userId))
        .returning();

    return updatedProfile;
}
