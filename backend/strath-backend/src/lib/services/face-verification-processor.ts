import { eq } from "drizzle-orm";

import {
    faceVerificationResults,
    faceVerificationSessions,
    profiles,
} from "@/db/schema";
import { db } from "@/lib/db";
import {
    FACE_VERIFICATION_STATUSES,
    getFaceVerificationAutoPassSimilarity,
    getFaceVerificationMethod,
    getFaceVerificationMinimumMatchCount,
    getFaceVerificationThresholdVersion,
} from "@/lib/services/face-verification-policy";
import { resolveFaceVerificationOutcome } from "@/lib/services/face-verification-decision";
import { compareFacesWithRekognition } from "@/lib/services/face-verification-provider-rekognition";
import { getFaceVerificationObjectBytes } from "@/lib/services/face-verification-storage";

export async function processFaceVerificationSession(sessionId: string) {
    const session = await db.query.faceVerificationSessions.findFirst({
        where: eq(faceVerificationSessions.id, sessionId),
        with: {
            results: true,
        },
    });

    if (!session) {
        throw new Error("Verification session not found.");
    }

    if (session.status !== FACE_VERIFICATION_STATUSES.PROCESSING) {
        throw new Error(`Verification session is not ready for processing. Current status: ${session.status}`);
    }

    if (session.selfieAssetKeys.length === 0 || session.profileAssetKeys.length < 2) {
        return finalizeFaceVerificationProcessing(session.userId, session.id, {
            status: FACE_VERIFICATION_STATUSES.RETRY_REQUIRED,
            failureReasons: ["missing_verification_assets"],
            decisionSummary: {
                processedAt: new Date().toISOString(),
                matchedPhotoCount: 0,
                comparedPhotoCount: session.profileAssetKeys.length,
            },
            results: [],
        });
    }

    const similarityThreshold = getFaceVerificationAutoPassSimilarity();
    const minimumMatchCount = getFaceVerificationMinimumMatchCount();

    try {
        const sourceAssetKey = session.selfieAssetKeys[0];
        const sourceBytes = await getFaceVerificationObjectBytes(sourceAssetKey);

        const comparisonResults: Array<{
            sourceAssetKey: string;
            targetAssetKey: string;
            similarity: number | null;
            faceConfidence: number | null;
            facesDetected: number;
            qualityFlags: string[];
            decision: string;
            rawProviderResponseRedacted: Record<string, unknown>;
        }> = [];

        for (const targetAssetKey of session.profileAssetKeys) {
            try {
                const targetBytes = await getFaceVerificationObjectBytes(targetAssetKey);
                const result = await compareFacesWithRekognition(
                    sourceBytes,
                    targetBytes,
                    similarityThreshold,
                );

                comparisonResults.push({
                    sourceAssetKey,
                    targetAssetKey,
                    similarity: result.similarity,
                    faceConfidence: result.faceConfidence,
                    facesDetected: result.facesDetected,
                    qualityFlags: result.qualityFlags,
                    decision:
                        (result.similarity ?? 0) >= similarityThreshold ? "matched" : "not_matched",
                    rawProviderResponseRedacted: result.rawProviderResponseRedacted,
                });
            } catch (error) {
                console.error("[FaceVerification] CompareFaces failed for target", targetAssetKey, error);
                comparisonResults.push({
                    sourceAssetKey,
                    targetAssetKey,
                    similarity: null,
                    faceConfidence: null,
                    facesDetected: 0,
                    qualityFlags: ["provider_error"],
                    decision: "error",
                    rawProviderResponseRedacted: {
                        providerError: error instanceof Error ? error.message : "unknown_error",
                    },
                });
            }
        }

        const outcome = resolveFaceVerificationOutcome({
            comparisonResults,
            minimumMatchCount,
            similarityThreshold,
        });

        return finalizeFaceVerificationProcessing(session.userId, session.id, {
            status: outcome.finalStatus,
            failureReasons: outcome.failureReasons,
            decisionSummary: {
                processedAt: new Date().toISOString(),
                ...outcome.decisionSummary,
            },
            results: comparisonResults,
        });
    } catch (error) {
        console.error("[FaceVerification] Processing failed", error);
        return finalizeFaceVerificationProcessing(session.userId, session.id, {
            status: FACE_VERIFICATION_STATUSES.MANUAL_REVIEW,
            failureReasons: ["processing_error"],
            decisionSummary: {
                processedAt: new Date().toISOString(),
                processorError: error instanceof Error ? error.message : "unknown_error",
            },
            results: [],
        });
    }
}

async function finalizeFaceVerificationProcessing(
    userId: string,
    sessionId: string,
    input: {
        status: string;
        failureReasons: string[];
        decisionSummary: Record<string, unknown>;
        results: Array<{
            sourceAssetKey: string;
            targetAssetKey: string;
            similarity: number | null;
            faceConfidence: number | null;
            facesDetected: number;
            qualityFlags: string[];
            decision: string;
            rawProviderResponseRedacted: Record<string, unknown>;
        }>;
    },
) {
    const [updatedSession] = await db
        .update(faceVerificationSessions)
        .set({
            status: input.status,
            completedAt: new Date(),
            updatedAt: new Date(),
            failureReasons: input.failureReasons,
            decisionSummary: {
                ...input.decisionSummary,
                thresholdVersion: getFaceVerificationThresholdVersion(),
            },
        })
        .where(eq(faceVerificationSessions.id, sessionId))
        .returning();

    await db.delete(faceVerificationResults).where(eq(faceVerificationResults.sessionId, sessionId));

    if (input.results.length > 0) {
        await db.insert(faceVerificationResults).values(
            input.results.map((result) => ({
                sessionId,
                sourceAssetKey: result.sourceAssetKey,
                targetAssetKey: result.targetAssetKey,
                similarity: result.similarity === null ? null : Math.round(result.similarity),
                faceConfidence: result.faceConfidence === null ? null : Math.round(result.faceConfidence),
                facesDetected: result.facesDetected,
                qualityFlags: result.qualityFlags,
                decision: result.decision,
                rawProviderResponseRedacted: result.rawProviderResponseRedacted,
            })),
        );
    }

    await updateProfileVerificationState(userId, {
        faceVerificationStatus: input.status,
        faceVerificationMethod: getFaceVerificationMethod(),
        faceVerificationVersion: getFaceVerificationThresholdVersion(),
        faceVerificationRetryCount: Math.max(0, updatedSession.attemptNumber - 1),
        faceVerifiedAt:
            input.status === FACE_VERIFICATION_STATUSES.VERIFIED ? new Date() : null,
    });

    return db.query.faceVerificationSessions.findFirst({
        where: eq(faceVerificationSessions.id, sessionId),
        with: {
            results: true,
        },
    });
}

async function updateProfileVerificationState(
    userId: string,
    updates: {
        faceVerificationStatus: string;
        faceVerificationMethod: string;
        faceVerificationVersion: string;
        faceVerificationRetryCount: number;
        faceVerifiedAt: Date | null;
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
            faceVerificationMethod: updates.faceVerificationMethod,
            faceVerificationVersion: updates.faceVerificationVersion,
            faceVerificationRetryCount: updates.faceVerificationRetryCount,
            faceVerifiedAt: updates.faceVerifiedAt,
            updatedAt: new Date(),
        })
        .where(eq(profiles.userId, userId))
        .returning();

    return updatedProfile;
}
