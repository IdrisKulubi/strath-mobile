import type { PhotoAnalysisResult, PhotoModerationStatus } from "@/lib/services/photo-intelligence-types";

export const USABLE_PHOTO_QUALITY_THRESHOLD = 45;

function clampScore(value: number) {
    return Math.max(0, Math.min(100, Math.round(value)));
}

export function calculatePhotoQualityScore(analysis: Pick<
    PhotoAnalysisResult,
    | "faceVisible"
    | "imageClear"
    | "lightingScore"
    | "blurScore"
    | "duplicateScore"
    | "hasMultiplePeople"
    | "isScreenshotOrMeme"
    | "isObjectOrLandscapeOnly"
    | "moderationStatus"
>) {
    let score = 0;

    if (analysis.faceVisible) score += 25;
    if (analysis.imageClear) score += 20;
    if (analysis.lightingScore >= 45) score += 15;
    if (analysis.blurScore >= 40) score += 10;
    if (analysis.duplicateScore >= 80) score += 10;
    if (analysis.moderationStatus === "approved") score += 10;

    if (analysis.isScreenshotOrMeme || analysis.isObjectOrLandscapeOnly) score -= 20;
    if (analysis.lightingScore < 25) score -= 15;
    if (analysis.blurScore < 25) score -= 15;
    if (analysis.hasMultiplePeople) score -= 20;
    if (analysis.moderationStatus === "rejected") score -= 30;

    return clampScore(score);
}

export function buildPhotoImprovementTips(input: {
    analyses: PhotoAnalysisResult[];
    photoCount: number;
}) {
    const tips = new Set<string>();
    const best = input.analyses.reduce<PhotoAnalysisResult | null>(
        (current, item) => (!current || item.qualityScore > current.qualityScore ? item : current),
        null,
    );

    if (input.photoCount < 2) {
        tips.add("Add at least 2 photos to improve your profile.");
    }

    if (!best || !best.faceVisible) {
        tips.add("Use a photo where your face is visible.");
    }

    if (!best || best.qualityScore < USABLE_PHOTO_QUALITY_THRESHOLD) {
        tips.add("Add a clearer first photo.");
    }

    if (best && (best.lightingScore < 30 || best.blurScore < 30)) {
        tips.add("Avoid blurry or very dark photos.");
    }

    if (best?.hasMultiplePeople) {
        tips.add("Use a solo photo as your main profile picture.");
    }

    if (best?.moderationStatus === "needs_review") {
        tips.add("Your photo may need a quick review before it is shown widely.");
    }

    return [...tips].slice(0, 4);
}

export type { PhotoModerationStatus };
