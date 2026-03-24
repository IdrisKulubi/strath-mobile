import { z } from "zod";

export const faceVerificationUploadSchema = z.object({
    slot: z.enum(["front", "left", "right", "smile", "extra"]).default("front"),
    contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]),
});

export const createFaceVerificationSessionSchema = z.object({
    resetActiveSession: z.boolean().optional().default(false),
});

export const createFaceVerificationUploadTargetsSchema = z.object({
    sessionId: z.string().uuid(),
    uploads: z.array(faceVerificationUploadSchema).min(1).max(4),
});

export const submitFaceVerificationSessionSchema = z.object({
    sessionId: z.string().uuid(),
    profilePhotoUrls: z.array(z.string().url()).min(2).max(4),
});

export const retryFaceVerificationSessionSchema = z.object({
    sessionId: z.string().uuid().optional(),
});

export type CreateFaceVerificationSessionInput = z.infer<typeof createFaceVerificationSessionSchema>;
export type CreateFaceVerificationUploadTargetsInput = z.infer<typeof createFaceVerificationUploadTargetsSchema>;
export type SubmitFaceVerificationSessionInput = z.infer<typeof submitFaceVerificationSessionSchema>;
export type RetryFaceVerificationSessionInput = z.infer<typeof retryFaceVerificationSessionSchema>;
