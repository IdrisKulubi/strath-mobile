import {
    CompareFacesCommand,
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
