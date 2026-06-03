import { createHash } from "crypto";

import { and, eq, inArray } from "drizzle-orm";
import sharp from "sharp";

import db from "@/db/drizzle";
import { db as readDb } from "@/lib/db";
import {
    profilePhotoAnalysis,
    profilePhotoEmbeddings,
    profiles,
    userMatchSignals,
} from "@/db/schema";
import {
    detectFacesWithRekognition,
    moderateImageWithRekognition,
} from "@/lib/services/face-verification-provider-rekognition";
import {
    extractR2ObjectKeyFromUrl,
    getFaceVerificationComparisonBytes,
} from "@/lib/services/face-verification-storage";
import { requestPhotoEmbedding } from "@/lib/services/photo-embedding-client";
import {
    buildPhotoImprovementTips,
    calculatePhotoQualityScore,
    USABLE_PHOTO_QUALITY_THRESHOLD,
} from "@/lib/services/photo-intelligence-scoring";
import type { PhotoAnalysisResult, PhotoModerationStatus } from "@/lib/services/photo-intelligence-types";

export { calculatePhotoQualityScore, buildPhotoImprovementTips } from "@/lib/services/photo-intelligence-scoring";
export type { PhotoAnalysisResult, PhotoModerationStatus } from "@/lib/services/photo-intelligence-types";

export const PHOTO_ANALYSIS_VERSION = "photo_match_v1";
const MIN_USABLE_MODERATION_STATUSES = new Set(["approved", "pending"]);

function clampScore(value: number) {
    return Math.max(0, Math.min(100, Math.round(value)));
}

function asStringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

async function computeImageMetrics(imageBytes: Uint8Array) {
    const pipeline = sharp(imageBytes, { failOn: "none", limitInputPixels: false }).rotate();
    const { data, info } = await pipeline
        .resize({ width: 512, height: 512, fit: "inside", withoutEnlargement: true })
        .greyscale()
        .raw()
        .toBuffer({ resolveWithObject: true });

    const pixels = data.length;
    if (pixels === 0) {
        return { lightingScore: 0, blurScore: 0, aspectRatio: 1 };
    }

    let sum = 0;
    let sumSq = 0;
    for (let index = 0; index < pixels; index++) {
        const value = data[index];
        sum += value;
        sumSq += value * value;
    }

    const mean = sum / pixels;
    const variance = Math.max(0, sumSq / pixels - mean * mean);
    const lightingScore = clampScore(mean * 0.9);
    const blurScore = clampScore(Math.min(100, variance / 4));

    const aspectRatio = info.width && info.height ? info.width / info.height : 1;

    return { lightingScore, blurScore, aspectRatio };
}

function inferScreenshotOrMeme(aspectRatio: number, width: number | null, height: number | null) {
    if (aspectRatio > 2.2 || aspectRatio < 0.45) {
        return true;
    }

    if (width && height && width >= 1080 && height >= 1920 && aspectRatio < 0.7) {
        return true;
    }

    return false;
}

export async function analyzeProfilePhoto(input: {
    userId: string;
    profileId?: string;
    photoUrl: string;
}): Promise<PhotoAnalysisResult> {
    const objectKey = extractR2ObjectKeyFromUrl(input.photoUrl);
    if (!objectKey) {
        throw new Error("Photo URL must point to a stored profile asset.");
    }

    const imageBytes = await getFaceVerificationComparisonBytes(objectKey);
    const photoHash = createHash("sha256").update(imageBytes).digest("hex");
    const metadata = await sharp(imageBytes, { failOn: "none", limitInputPixels: false })
        .rotate()
        .metadata();

    const [metrics, faceDetection, moderation] = await Promise.all([
        computeImageMetrics(imageBytes),
        detectFacesWithRekognition(imageBytes),
        moderateImageWithRekognition(imageBytes),
    ]);

    const faceVisible = faceDetection.facesDetected === 1;
    const hasMultiplePeople = faceDetection.facesDetected > 1;
    const isObjectOrLandscapeOnly = faceDetection.facesDetected === 0;
    const isScreenshotOrMeme = inferScreenshotOrMeme(
        metrics.aspectRatio,
        metadata.width ?? null,
        metadata.height ?? null,
    );

    const draft: PhotoAnalysisResult = {
        userId: input.userId,
        profileId: input.profileId ?? null,
        photoUrl: input.photoUrl.trim(),
        photoHash,
        qualityScore: 0,
        faceVisible,
        imageClear: metrics.blurScore >= 35 && metrics.lightingScore >= 25,
        lightingScore: metrics.lightingScore,
        blurScore: metrics.blurScore,
        duplicateScore: 100,
        hasMultiplePeople,
        isScreenshotOrMeme,
        isObjectOrLandscapeOnly,
        moderationStatus: moderation.moderationStatus,
        moderationReason: moderation.moderationReason,
        analysisVersion: PHOTO_ANALYSIS_VERSION,
        metadata: {
            width: metadata.width ?? null,
            height: metadata.height ?? null,
            aspectRatio: metrics.aspectRatio,
            faceCount: faceDetection.facesDetected,
            moderationLabels: moderation.flaggedLabels,
        },
    };

    draft.qualityScore = calculatePhotoQualityScore(draft);

    const existing = await readDb.query.profilePhotoAnalysis.findFirst({
        where: and(
            eq(profilePhotoAnalysis.userId, draft.userId),
            eq(profilePhotoAnalysis.photoUrl, draft.photoUrl),
        ),
    });

    const values = {
        userId: draft.userId,
        profileId: draft.profileId,
        photoUrl: draft.photoUrl,
        photoHash: draft.photoHash,
        qualityScore: draft.qualityScore,
        faceVisible: draft.faceVisible,
        imageClear: draft.imageClear,
        lightingScore: draft.lightingScore,
        blurScore: draft.blurScore,
        duplicateScore: draft.duplicateScore,
        hasMultiplePeople: draft.hasMultiplePeople,
        isScreenshotOrMeme: draft.isScreenshotOrMeme,
        isObjectOrLandscapeOnly: draft.isObjectOrLandscapeOnly,
        moderationStatus: draft.moderationStatus,
        moderationReason: draft.moderationReason,
        analysisVersion: draft.analysisVersion,
        metadata: draft.metadata,
    };

    const [saved] = existing
        ? await db
              .update(profilePhotoAnalysis)
              .set({ ...values, updatedAt: new Date() })
              .where(eq(profilePhotoAnalysis.id, existing.id))
              .returning()
        : await db.insert(profilePhotoAnalysis).values(values).returning();

    draft.id = saved.id;

    if (!existing?.embeddingId) {
        await generatePhotoEmbedding({
            analysisId: saved.id,
            userId: saved.userId,
            photoUrl: saved.photoUrl,
            objectKey,
        }).catch((error) => {
            console.warn("[photo-intelligence] embedding skipped", error);
        });
    }

    return { ...draft, id: saved.id };
}

export async function generatePhotoEmbedding(input: {
    analysisId: string;
    userId: string;
    photoUrl: string;
    objectKey: string;
}) {
    const embeddingResult = await requestPhotoEmbedding({
        photoUrl: input.photoUrl,
        objectKey: input.objectKey,
    });

    if (!embeddingResult) {
        return null;
    }

    const [row] = await db
        .insert(profilePhotoEmbeddings)
        .values({
            userId: input.userId,
            photoAnalysisId: input.analysisId,
            embedding: embeddingResult.embedding,
            provider: embeddingResult.provider,
            model: embeddingResult.model,
        })
        .returning();

    await db
        .update(profilePhotoAnalysis)
        .set({
            embeddingProvider: embeddingResult.provider,
            embeddingModel: embeddingResult.model,
            embeddingId: row.id,
            updatedAt: new Date(),
        })
        .where(eq(profilePhotoAnalysis.id, input.analysisId));

    return row;
}

export async function getUserPhotoAnalyses(userId: string) {
    return readDb.query.profilePhotoAnalysis.findMany({
        where: eq(profilePhotoAnalysis.userId, userId),
        orderBy: (table, { desc }) => [desc(table.qualityScore)],
    });
}

export async function getUserPhotoQualityScore(userId: string) {
    const analyses = await getUserPhotoAnalyses(userId);
    if (analyses.length === 0) {
        return 0;
    }

    const usable = analyses.filter(
        (item) =>
            item.qualityScore >= USABLE_PHOTO_QUALITY_THRESHOLD &&
            MIN_USABLE_MODERATION_STATUSES.has(item.moderationStatus),
    );

    if (usable.length === 0) {
        return Math.max(...analyses.map((item) => item.qualityScore));
    }

    return clampScore(
        usable.reduce((sum, item) => sum + item.qualityScore, 0) / usable.length +
            Math.min(10, usable.length >= 2 ? 10 : 0),
    );
}

export async function getPhotoImprovementTips(userId: string) {
    const profile = await readDb.query.profiles.findFirst({
        where: eq(profiles.userId, userId),
    });
    const analyses = await getUserPhotoAnalyses(userId);
    const photoCount = asStringArray(profile?.photos).length + (profile?.profilePhoto ? 1 : 0);

    return buildPhotoImprovementTips({
        analyses: analyses.map((row) => ({
            userId: row.userId,
            profileId: row.profileId,
            photoUrl: row.photoUrl,
            photoHash: row.photoHash ?? "",
            qualityScore: row.qualityScore,
            faceVisible: row.faceVisible,
            imageClear: row.imageClear,
            lightingScore: row.lightingScore,
            blurScore: row.blurScore,
            duplicateScore: row.duplicateScore,
            hasMultiplePeople: row.hasMultiplePeople,
            isScreenshotOrMeme: row.isScreenshotOrMeme,
            isObjectOrLandscapeOnly: row.isObjectOrLandscapeOnly,
            moderationStatus: row.moderationStatus as PhotoModerationStatus,
            moderationReason: row.moderationReason,
            analysisVersion: row.analysisVersion,
            metadata: (row.metadata as Record<string, unknown>) ?? {},
        })),
        photoCount,
    });
}

export async function syncUserPhotoMatchSignals(userId: string) {
    const analyses = await getUserPhotoAnalyses(userId);
    const photoQualityScore = await getUserPhotoQualityScore(userId);
    const hasUsableProfilePhoto = analyses.some(
        (item) =>
            item.faceVisible &&
            item.qualityScore >= USABLE_PHOTO_QUALITY_THRESHOLD &&
            item.moderationStatus !== "rejected",
    );

    await db
        .insert(userMatchSignals)
        .values({
            userId,
            photoQualityScore,
            hasUsableProfilePhoto,
            photoAnalysisCompleted: analyses.length > 0,
            photoAnalysisUpdatedAt: new Date(),
        })
        .onConflictDoUpdate({
            target: userMatchSignals.userId,
            set: {
                photoQualityScore,
                hasUsableProfilePhoto,
                photoAnalysisCompleted: analyses.length > 0,
                photoAnalysisUpdatedAt: new Date(),
                updatedAt: new Date(),
            },
        });
}

export async function reanalyzeUserPhotos(userId: string) {
    const profile = await readDb.query.profiles.findFirst({
        where: eq(profiles.userId, userId),
    });

    if (!profile) {
        return { analyzed: 0 };
    }

    const photoUrls = Array.from(
        new Set(
            [profile.profilePhoto, ...asStringArray(profile.photos)].filter(
                (value): value is string => typeof value === "string" && value.trim().length > 0,
            ),
        ),
    );

    const hashes = new Map<string, number>();
    const results: PhotoAnalysisResult[] = [];

    for (const photoUrl of photoUrls) {
        const result = await analyzeProfilePhoto({
            userId,
            profileId: profile.id,
            photoUrl,
        });

        const duplicateCount = hashes.get(result.photoHash) ?? 0;
        hashes.set(result.photoHash, duplicateCount + 1);
        const duplicateScore = duplicateCount > 0 ? 20 : 100;
        result.duplicateScore = duplicateScore;
        result.qualityScore = calculatePhotoQualityScore({ ...result, duplicateScore });

        if (result.id) {
            await db
                .update(profilePhotoAnalysis)
                .set({
                    duplicateScore,
                    qualityScore: result.qualityScore,
                    updatedAt: new Date(),
                })
                .where(eq(profilePhotoAnalysis.id, result.id));
        }

        results.push(result);
    }

    await syncUserPhotoMatchSignals(userId);
    return { analyzed: results.length, results };
}

export async function getPhotoSignalsForUsers(userIds: string[]) {
    if (userIds.length === 0) {
        return new Map<string, { photoQualityScore: number; hasUsableProfilePhoto: boolean }>();
    }

    const rows = await readDb.query.userMatchSignals.findMany({
        where: inArray(userMatchSignals.userId, userIds),
    });

    return new Map(
        rows.map((row) => [
            row.userId,
            {
                photoQualityScore: row.photoQualityScore,
                hasUsableProfilePhoto: row.hasUsableProfilePhoto,
            },
        ]),
    );
}

export function isPhotoUsableForFirstSession(input: {
    photoQualityScore: number;
    hasUsableProfilePhoto: boolean;
}) {
    return input.hasUsableProfilePhoto && input.photoQualityScore >= USABLE_PHOTO_QUALITY_THRESHOLD;
}
