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
    getFaceVerificationComparisonConcurrency,
    getFaceVerificationMaxProfileComparisons,
    getFaceVerificationMethod,
    getFaceVerificationMinimumMatchCount,
    getFaceVerificationThresholdVersion,
} from "@/lib/services/face-verification-policy";
import { resolveFaceVerificationOutcome } from "@/lib/services/face-verification-decision";
import {
    compareFacesWithRekognition,
    detectFacesWithRekognition,
} from "@/lib/services/face-verification-provider-rekognition";
import { getFaceVerificationComparisonBytes } from "@/lib/services/face-verification-storage";
import { getProfilePhotoAssetsByKeys } from "@/lib/services/profile-photo-assets";

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
    const comparisonConcurrency = getFaceVerificationComparisonConcurrency();

    try {
        const sourceAssetKey = session.selfieAssetKeys[0];
        const sourceBytes = await getFaceVerificationComparisonBytes(sourceAssetKey);
        const sourceFaceDetection = await detectFacesWithRekognition(sourceBytes);

        if (sourceFaceDetection.facesDetected === 0) {
            return finalizeFaceVerificationProcessing(session.userId, session.id, {
                status: FACE_VERIFICATION_STATUSES.RETRY_REQUIRED,
                failureReasons: ["selfie_face_not_detected"],
                decisionSummary: {
                    processedAt: new Date().toISOString(),
                    matchedPhotoCount: 0,
                    comparedPhotoCount: 0,
                    sourceFacesDetected: 0,
                },
                results: [],
            });
        }

        const profilePhotoAssetRows = await getProfilePhotoAssetsByKeys(session.profileAssetKeys);
        const targetAssetKeys = selectTargetAssetKeysForVerification(
            session.profileAssetKeys,
            profilePhotoAssetRows,
        );

        if (targetAssetKeys.length < 2) {
            return finalizeFaceVerificationProcessing(session.userId, session.id, {
                status: FACE_VERIFICATION_STATUSES.RETRY_REQUIRED,
                failureReasons: ["insufficient_usable_profile_photos"],
                decisionSummary: {
                    processedAt: new Date().toISOString(),
                    matchedPhotoCount: 0,
                    comparedPhotoCount: 0,
                    sourceFacesDetected: sourceFaceDetection.facesDetected,
                    candidateProfilePhotoCount: session.profileAssetKeys.length,
                    usableProfilePhotoCount: targetAssetKeys.length,
                },
                results: [],
            });
        }

        const photoAssetMap = new Map(profilePhotoAssetRows.map((asset) => [asset.objectKey, asset]));

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

        const targetResults = await runWithConcurrency(
            targetAssetKeys,
            comparisonConcurrency,
            async (targetAssetKey) => {
                try {
                    const assetMetadata = photoAssetMap.get(targetAssetKey);

                    if (assetMetadata?.faceCount === 0) {
                        return {
                            sourceAssetKey,
                            targetAssetKey,
                            similarity: null,
                            faceConfidence: sourceFaceDetection.bestFaceConfidence,
                            facesDetected: 0,
                            qualityFlags: ["no_face_detected"],
                            decision: "not_matched",
                            rawProviderResponseRedacted: {
                                sourceFacesDetected: sourceFaceDetection.facesDetected,
                                targetFacesDetected: 0,
                                fromAssetMetadata: true,
                            },
                        };
                    }

                    if (assetMetadata?.faceCount && assetMetadata.faceCount > 1) {
                        return {
                            sourceAssetKey,
                            targetAssetKey,
                            similarity: null,
                            faceConfidence: sourceFaceDetection.bestFaceConfidence,
                            facesDetected: assetMetadata.faceCount,
                            qualityFlags: ["multiple_target_faces"],
                            decision: "not_matched",
                            rawProviderResponseRedacted: {
                                sourceFacesDetected: sourceFaceDetection.facesDetected,
                                targetFacesDetected: assetMetadata.faceCount,
                                fromAssetMetadata: true,
                            },
                        };
                    }

                    const targetBytes = await getFaceVerificationComparisonBytes(targetAssetKey);
                    const targetFacesDetected = assetMetadata?.faceCount ?? null;

                    if (targetFacesDetected === null) {
                        const targetFaceDetection = await detectFacesWithRekognition(targetBytes);
                        if (targetFaceDetection.facesDetected === 0) {
                            return {
                                sourceAssetKey,
                                targetAssetKey,
                                similarity: null,
                                faceConfidence: sourceFaceDetection.bestFaceConfidence,
                                facesDetected: 0,
                                qualityFlags: ["no_face_detected"],
                                decision: "not_matched",
                                rawProviderResponseRedacted: {
                                    sourceFacesDetected: sourceFaceDetection.facesDetected,
                                    targetFacesDetected: 0,
                                },
                            };
                        }
                    }

                    const result = await compareFacesWithRekognition(
                        sourceBytes,
                        targetBytes,
                        similarityThreshold,
                    );

                    return {
                        sourceAssetKey,
                        targetAssetKey,
                        similarity: result.similarity,
                        faceConfidence: result.faceConfidence,
                        facesDetected: result.facesDetected,
                        qualityFlags: result.qualityFlags,
                        decision:
                            (result.similarity ?? 0) >= similarityThreshold ? "matched" : "not_matched",
                        rawProviderResponseRedacted: result.rawProviderResponseRedacted,
                    };
                } catch (error) {
                    console.error("[FaceVerification] CompareFaces failed for target", targetAssetKey, error);
                    const providerErrorCode = getFaceVerificationProcessingErrorCode(error);
                    return {
                        sourceAssetKey,
                        targetAssetKey,
                        similarity: null,
                        faceConfidence: null,
                        facesDetected: 0,
                        qualityFlags: [providerErrorCode],
                        decision: "error",
                        rawProviderResponseRedacted: {
                            providerErrorCode,
                            providerError: error instanceof Error ? error.message : "unknown_error",
                        },
                    };
                }
            },
        );

        comparisonResults.push(...targetResults);

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
                sourceFacesDetected: sourceFaceDetection.facesDetected,
                candidateProfilePhotoCount: session.profileAssetKeys.length,
                usableProfilePhotoCount: targetAssetKeys.length,
                ...outcome.decisionSummary,
            },
            results: comparisonResults,
        });
    } catch (error) {
        console.error("[FaceVerification] Processing failed", error);
        const processingErrorCode = getFaceVerificationProcessingErrorCode(error);
        const isRetryableCaptureError = RETRYABLE_PROCESSING_ERROR_CODES.has(processingErrorCode);

        return finalizeFaceVerificationProcessing(session.userId, session.id, {
            status: isRetryableCaptureError
                ? FACE_VERIFICATION_STATUSES.RETRY_REQUIRED
                : FACE_VERIFICATION_STATUSES.MANUAL_REVIEW,
            failureReasons: [processingErrorCode],
            decisionSummary: {
                processedAt: new Date().toISOString(),
                processingErrorCode,
                processorError: error instanceof Error ? error.message : "unknown_error",
            },
            results: [],
        });
    }
}

function selectTargetAssetKeysForVerification(
    requestedKeys: string[],
    assets: Array<{
        objectKey: string;
        verificationReady: boolean;
        faceCount: number;
        lastAnalyzedAt: Date | null;
    }>,
) {
    const assetMap = new Map(assets.map((asset) => [asset.objectKey, asset]));
    const sortedKeys = [...requestedKeys].sort((leftKey, rightKey) => {
        const left = assetMap.get(leftKey);
        const right = assetMap.get(rightKey);
        const leftScore = buildProfileAssetPriority(left);
        const rightScore = buildProfileAssetPriority(right);
        return rightScore - leftScore;
    });

    return sortedKeys.slice(0, getFaceVerificationMaxProfileComparisons());
}

function buildProfileAssetPriority(
    asset:
        | {
              verificationReady: boolean;
              faceCount: number;
              lastAnalyzedAt: Date | null;
          }
        | undefined,
) {
    if (!asset) {
        return 10;
    }

    if (asset.verificationReady) {
        return 100 + (asset.lastAnalyzedAt ? asset.lastAnalyzedAt.getTime() / 1_000_000_000_000 : 0);
    }

    if (asset.faceCount === 1) {
        return 80;
    }

    if (asset.faceCount > 1) {
        return 20;
    }

    return 5;
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

const RETRYABLE_PROCESSING_ERROR_CODES = new Set([
    "image_too_large",
    "invalid_image_format",
    "invalid_image_parameters",
    "image_processing_failed",
]);

function getFaceVerificationProcessingErrorCode(error: unknown) {
    if (!(error instanceof Error)) {
        return "provider_error";
    }

    const normalizedMessage = error.message.toLowerCase();

    if (
        normalizedMessage.includes("less than or equal to 5242880") ||
        normalizedMessage.includes("too large")
    ) {
        return "image_too_large";
    }

    if (normalizedMessage.includes("invalid image format")) {
        return "invalid_image_format";
    }

    if (normalizedMessage.includes("invalid parameters")) {
        return "invalid_image_parameters";
    }

    if (normalizedMessage.includes("input buffer") || normalizedMessage.includes("unsupported image format")) {
        return "image_processing_failed";
    }

    return "provider_error";
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
