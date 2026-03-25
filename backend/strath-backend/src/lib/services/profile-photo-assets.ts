import { eq, inArray } from "drizzle-orm";
import sharp from "sharp";

import { db } from "@/lib/db";
import { profilePhotoAssets } from "@/db/schema";
import { ensureProfilePhotoAuditJob } from "@/lib/services/face-verification-queue";
import { getFaceVerificationPhotoAuditVersion } from "@/lib/services/face-verification-policy";
import { detectFacesWithRekognition } from "@/lib/services/face-verification-provider-rekognition";
import {
    extractR2ObjectKeyFromUrl,
    getFaceVerificationComparisonBytes,
    getFaceVerificationObjectBytes,
} from "@/lib/services/face-verification-storage";

export async function syncProfilePhotoAssetsForUser(userId: string, photoUrls: string[]) {
    const uniqueAssets = Array.from(
        new Map(
            photoUrls
                .map((url) => {
                    const objectKey = extractR2ObjectKeyFromUrl(url);
                    if (!objectKey) {
                        return null;
                    }

                    return [objectKey, { objectKey, publicUrl: url.trim() }] as const;
                })
                .filter((value): value is readonly [string, { objectKey: string; publicUrl: string }] => !!value),
        ).values(),
    );

    if (uniqueAssets.length === 0) {
        return [];
    }

    for (const asset of uniqueAssets) {
        await db
            .insert(profilePhotoAssets)
            .values({
                userId,
                objectKey: asset.objectKey,
                publicUrl: asset.publicUrl,
                contentType: inferImageContentType(asset.objectKey),
            })
            .onConflictDoUpdate({
                target: profilePhotoAssets.objectKey,
                set: {
                    userId,
                    publicUrl: asset.publicUrl,
                    contentType: inferImageContentType(asset.objectKey),
                    updatedAt: new Date(),
                },
            });

        await ensureProfilePhotoAuditJob(userId, asset.objectKey, asset.publicUrl);
    }

    return uniqueAssets;
}

export async function getProfilePhotoAssetsByKeys(assetKeys: string[]) {
    if (assetKeys.length === 0) {
        return [];
    }

    return db.query.profilePhotoAssets.findMany({
        where: inArray(profilePhotoAssets.objectKey, assetKeys),
    });
}

export async function auditProfilePhotoAsset(objectKey: string) {
    const asset = await db.query.profilePhotoAssets.findFirst({
        where: eq(profilePhotoAssets.objectKey, objectKey),
    });

    if (!asset) {
        throw new Error(`Profile photo asset not found for key ${objectKey}`);
    }

    try {
        const originalBytes = await getFaceVerificationObjectBytes(objectKey);
        const imageMetadata = await sharp(originalBytes, {
            failOn: "none",
            limitInputPixels: false,
        })
            .rotate()
            .metadata();

        const comparisonBytes = await getFaceVerificationComparisonBytes(objectKey);
        const faceDetection = await detectFacesWithRekognition(comparisonBytes);

        const qualityFlags = buildAssetQualityFlags(faceDetection.facesDetected);
        const verificationReady = faceDetection.facesDetected === 1;

        const [updatedAsset] = await db
            .update(profilePhotoAssets)
            .set({
                contentType: asset.contentType ?? inferImageContentType(objectKey),
                normalizedFormat: imageMetadata.format ?? "jpeg",
                fileSizeBytes: comparisonBytes.byteLength,
                width: imageMetadata.width ?? null,
                height: imageMetadata.height ?? null,
                faceCount: faceDetection.facesDetected,
                qualityFlags,
                verificationFormatSupported: true,
                verificationReady,
                analysisVersion: getFaceVerificationPhotoAuditVersion(),
                analysisError: null,
                lastAnalyzedAt: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(profilePhotoAssets.objectKey, objectKey))
            .returning();

        return updatedAsset;
    } catch (error) {
        const [updatedAsset] = await db
            .update(profilePhotoAssets)
            .set({
                verificationFormatSupported: false,
                verificationReady: false,
                analysisVersion: getFaceVerificationPhotoAuditVersion(),
                analysisError: error instanceof Error ? error.message : "unknown_error",
                qualityFlags: ["image_processing_failed"],
                lastAnalyzedAt: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(profilePhotoAssets.objectKey, objectKey))
            .returning();

        return updatedAsset;
    }
}

function buildAssetQualityFlags(faceCount: number) {
    if (faceCount <= 0) {
        return ["no_face_detected"];
    }

    if (faceCount > 1) {
        return ["multiple_faces_detected"];
    }

    return [];
}

function inferImageContentType(objectKey: string) {
    const extension = objectKey.split(".").pop()?.toLowerCase();

    switch (extension) {
        case "png":
            return "image/png";
        case "webp":
            return "image/webp";
        case "heic":
            return "image/heic";
        case "heif":
            return "image/heif";
        case "jpg":
        case "jpeg":
        default:
            return "image/jpeg";
    }
}
