export type PhotoModerationStatus = "pending" | "approved" | "rejected" | "needs_review";

export interface PhotoAnalysisResult {
    id?: string;
    userId: string;
    profileId?: string | null;
    photoUrl: string;
    photoHash: string;
    qualityScore: number;
    faceVisible: boolean;
    imageClear: boolean;
    lightingScore: number;
    blurScore: number;
    duplicateScore: number;
    hasMultiplePeople: boolean;
    isScreenshotOrMeme: boolean;
    isObjectOrLandscapeOnly: boolean;
    moderationStatus: PhotoModerationStatus;
    moderationReason: string | null;
    analysisVersion: string;
    metadata: Record<string, unknown>;
}
