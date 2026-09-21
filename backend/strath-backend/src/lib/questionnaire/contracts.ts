import { z } from "zod";

export const ALGORITHM = "questionnaire-v1";
export const REQUIRED_ANSWER_COUNT = 20;
export const importanceWeight = z.union([
    z.literal(0), z.literal(1), z.literal(10), z.literal(50), z.literal(250),
]);

const optionId = z.string().trim().min(1).max(80);

export const answerInput = z.object({
    questionId: z.string().trim().min(1).max(100),
    answerId: optionId,
    acceptable: z.array(optionId).min(1).max(20).refine(
        (values) => new Set(values).size === values.length,
        "Accepted answers must be unique",
    ),
    weight: importanceWeight,
    public: z.boolean().default(false),
    explanation: z.string().trim().max(500).default(""),
    revision: z.number().int().nonnegative(),
}).strict();

export const deleteAnswerInput = z.object({
    questionId: z.string().trim().min(1).max(100),
    revision: z.number().int().nonnegative(),
}).strict();

export const skipQuestionInput = z.object({
    questionId: z.string().trim().min(1).max(100),
}).strict();

export const preferenceInput = z.object({
    birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    genders: z.array(z.enum(["male", "female", "other"])).min(1).max(3).refine(
        (values) => new Set(values).size === values.length,
        "Gender interests must be unique",
    ),
    minAge: z.number().int().min(18).max(100),
    maxAge: z.number().int().min(18).max(100),
    city: z.string().trim().min(1).max(100),
    radiusKm: z.number().min(1).max(500).nullable().default(null),
    latitude: z.number().min(-90).max(90).nullable().default(null),
    longitude: z.number().min(-180).max(180).nullable().default(null),
    intentions: z.array(z.string().trim().min(1).max(60)).min(1).max(5).refine(
        (values) => new Set(values).size === values.length,
        "Relationship intentions must be unique",
    ),
}).strict()
    .refine((value) => value.minAge <= value.maxAge, "Invalid age range")
    .refine(
        (value) => (value.latitude === null) === (value.longitude === null),
        "Latitude and longitude must be supplied together",
    )
    .refine(
        (value) => value.radiusKm === null || value.latitude !== null,
        "Radius requires location coordinates",
    );

export const profileInput = z.object({
    name: z.string().trim().min(1).max(80),
    gender: z.enum(["male", "female", "other"]),
    bio: z.string().trim().min(10).max(1500),
    photos: z.array(z.string().url().max(2048)).min(1).max(6),
    university: z.string().trim().max(160).nullable().optional(),
    course: z.string().trim().max(160).nullable().optional(),
    yearOfStudy: z.number().int().min(1).max(12).nullable().optional(),
}).strict();

export type Preferences = Omit<z.infer<typeof preferenceInput>, "birthDate">;

export function ageOn(dateOfBirth: string, now = new Date()): number {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) return -1;
    const birthDate = new Date(`${dateOfBirth}T00:00:00Z`);
    if (!Number.isFinite(birthDate.getTime()) || birthDate.toISOString().slice(0, 10) !== dateOfBirth) return -1;
    return now.getUTCFullYear() - birthDate.getUTCFullYear() - Number(
        now.getUTCMonth() < birthDate.getUTCMonth()
        || (now.getUTCMonth() === birthDate.getUTCMonth() && now.getUTCDate() < birthDate.getUTCDate()),
    );
}

// Phase 1/4 shared types remain here so the parked matching draft continues to typecheck.
export const scoreSchema = z.object({
    candidateId: z.string(), viewerRevision: z.number().int(), candidateRevision: z.number().int(),
    algorithmVersion: z.literal(ALGORITHM), status: z.enum(["ready", "insufficient_evidence"]),
    score: z.number().min(0).max(100).nullable(), sharedCount: z.number().int().nonnegative(),
    evidenceCount: z.number().int().nonnegative(),
}).strict().refine((score) => score.evidenceCount <= score.sharedCount
    && (score.status === "ready" ? score.score !== null && score.evidenceCount >= 10 : score.score === null));
export type Score = z.infer<typeof scoreSchema>;
export type EnginePerson = { id: string; revision: number; answers: { questionVersionId: string; answerId: string; acceptableAnswerIds: string[]; weight: number }[] };
export function publicScore(score: Score) { return { status: score.status, score: score.score, sharedCount: score.sharedCount, evidenceCount: score.evidenceCount }; }
export function sortScores(a: Score, b: Score) { return Number(a.score === null) - Number(b.score === null) || (b.score ?? 0) - (a.score ?? 0) || b.evidenceCount - a.evidenceCount || a.candidateId.localeCompare(b.candidateId); }
