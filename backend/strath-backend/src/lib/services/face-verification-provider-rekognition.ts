import {
    CompareFacesCommand,
    DetectFacesCommand,
    DetectModerationLabelsCommand,
    RekognitionClient,
} from "@aws-sdk/client-rekognition";

const rekognitionClient = new RekognitionClient({
    region: process.env.AWS_REKOGNITION_REGION || process.env.AWS_REGION || "us-east-1",
});

export interface RekognitionComparisonResult {
    similarity: number | null;
    faceConfidence: number | null;
    facesDetected: number;
    qualityFlags: string[];
    rawProviderResponseRedacted: Record<string, unknown>;
}

export interface RekognitionFaceDetectionResult {
    facesDetected: number;
    bestFaceConfidence: number | null;
}

export async function compareFacesWithRekognition(
    sourceBytes: Uint8Array,
    targetBytes: Uint8Array,
    similarityThreshold: number,
): Promise<RekognitionComparisonResult> {
    const response = await rekognitionClient.send(
        new CompareFacesCommand({
            SimilarityThreshold: similarityThreshold,
            SourceImage: {
                Bytes: sourceBytes,
            },
            TargetImage: {
                Bytes: targetBytes,
            },
        }),
    );

    const bestMatch = response.FaceMatches?.[0];
    const unmatchedFaceCount = response.UnmatchedFaces?.length ?? 0;
    const facesDetected = (response.FaceMatches?.length ?? 0) + unmatchedFaceCount;
    const qualityFlags: string[] = [];

    if (!bestMatch) {
        qualityFlags.push("no_match_above_threshold");
    }

    if (unmatchedFaceCount > 1) {
        qualityFlags.push("multiple_target_faces");
    }

    if (facesDetected === 0) {
        qualityFlags.push("no_face_detected");
    }

    return {
        similarity: bestMatch?.Similarity ?? null,
        faceConfidence: response.SourceImageFace?.Confidence ?? null,
        facesDetected,
        qualityFlags,
        rawProviderResponseRedacted: {
            faceMatches: response.FaceMatches?.map((match) => ({
                similarity: match.Similarity ?? null,
                faceConfidence: match.Face?.Confidence ?? null,
            })) ?? [],
            unmatchedFaceCount,
            sourceFaceConfidence: response.SourceImageFace?.Confidence ?? null,
        },
    };
}

export function isRekognitionSourceFaceNotFoundError(error: unknown) {
    if (!(error instanceof Error)) {
        return false;
    }

    const normalizedMessage = error.message.toLowerCase();
    return (
        normalizedMessage.includes("no face") &&
        normalizedMessage.includes("source")
    );
}

export interface RekognitionModerationResult {
    moderationStatus: "approved" | "rejected" | "needs_review";
    moderationReason: string | null;
    flaggedLabels: string[];
}

export async function moderateImageWithRekognition(
    imageBytes: Uint8Array,
    minConfidence = 75,
): Promise<RekognitionModerationResult> {
    const response = await rekognitionClient.send(
        new DetectModerationLabelsCommand({
            Image: { Bytes: imageBytes },
            MinConfidence: minConfidence,
        }),
    );

    const labels = (response.ModerationLabels ?? [])
        .filter((label) => (label.Confidence ?? 0) >= minConfidence)
        .map((label) => label.Name ?? "")
        .filter(Boolean);

    if (labels.length === 0) {
        return {
            moderationStatus: "approved",
            moderationReason: null,
            flaggedLabels: [],
        };
    }

    const explicit = labels.some((name) =>
        /explicit|nudity|sexual|violence|visually disturbing|hate symbols/i.test(name),
    );

    return {
        moderationStatus: explicit ? "rejected" : "needs_review",
        moderationReason: labels.slice(0, 3).join(", "),
        flaggedLabels: labels,
    };
}

export async function detectFacesWithRekognition(
    imageBytes: Uint8Array,
): Promise<RekognitionFaceDetectionResult> {
    const response = await rekognitionClient.send(
        new DetectFacesCommand({
            Image: {
                Bytes: imageBytes,
            },
        }),
    );

    const faceDetails = response.FaceDetails ?? [];

    return {
        facesDetected: faceDetails.length,
        bestFaceConfidence:
            faceDetails.reduce<number | null>((bestConfidence, face) => {
                const nextConfidence = face.Confidence ?? null;
                if (nextConfidence === null) {
                    return bestConfidence;
                }

                return bestConfidence === null
                    ? nextConfidence
                    : Math.max(bestConfidence, nextConfidence);
            }, null),
    };
}
