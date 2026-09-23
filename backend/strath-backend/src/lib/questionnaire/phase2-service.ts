import type { QueryResultRow } from "pg";

import {
    REQUIRED_ANSWER_COUNT,
    ageOn,
    answerInput,
    deleteAnswerInput,
    preferenceInput,
    profileInput,
    skipQuestionInput,
    type Preferences,
} from "./contracts";
import { query, transaction, type SqlExecutor } from "./db";

export class DomainError extends Error {
    constructor(message: string, public readonly status = 400) {
        super(message);
    }
}

type QuestionnaireStateRow = QueryResultRow & {
    revision: number;
    birth_date: string | null;
    preferences: Preferences | null;
    skipped: string[];
    started_at: Date | null;
    completed_at: Date | null;
    answer_count: number;
};

type PhotoHooks = {
    afterPhotosChanged(userId: string, photos: string[], profileId: string): Promise<void>;
};

const defaultPhotoHooks: PhotoHooks = {
    async afterPhotosChanged(userId, photos, profileId) {
        const [{ syncProfilePhotoAssetsForUser }, { reanalyzeUserPhotos }, { ensureProfileIntelligenceJob }] = await Promise.all([
            import("@/lib/services/profile-photo-assets"),
            import("@/lib/services/photo-intelligence-service"),
            import("@/lib/services/profile-intelligence-service"),
        ]);
        await syncProfilePhotoAssetsForUser(userId, photos);
        if (photos.length > 0) await reanalyzeUserPhotos(userId);
        await ensureProfileIntelligenceJob({
            userId,
            jobType: "profile_refresh",
            metadata: { source: "questionnaire_profile_update", profileId, photoCount: photos.length },
        });
    },
};

async function ensureState(userId: string, executor?: SqlExecutor) {
    await query("INSERT INTO q_state(user_id) VALUES($1) ON CONFLICT DO NOTHING", [userId], executor);
}

async function invalidateCompatibilityCache(userId: string, executor: SqlExecutor) {
    const [table] = await query<{ exists: string | null } & QueryResultRow>(
        "SELECT to_regclass('q_compatibility_cache')::text AS exists",
        [], executor,
    );
    if (table.exists) {
        await query("DELETE FROM q_compatibility_cache WHERE user_a = $1 OR user_b = $1", [userId], executor);
    }
}

async function loadStatus(userId: string, executor?: SqlExecutor) {
    await ensureState(userId, executor);
    const [state] = await query<QuestionnaireStateRow>(`
        SELECT
            state.revision,
            state.birth_date::text,
            state.preferences,
            state.skipped,
            state.started_at,
            state.completed_at,
            (
                SELECT count(*)::int
                FROM q_answers answer
                JOIN q_questions question ON question.id = answer.question_id
                WHERE answer.user_id = state.user_id AND question.published
            ) AS answer_count
        FROM q_state state
        WHERE state.user_id = $1
    `, [userId], executor);
    return state;
}

async function recordProgress(userId: string, executor: SqlExecutor) {
    const before = await loadStatus(userId, executor);
    const startsNow = before.started_at === null;
    const completesNow = before.completed_at === null && before.answer_count >= REQUIRED_ANSWER_COUNT;

    await query(`
        UPDATE q_state
        SET started_at = coalesce(started_at, now()),
            completed_at = CASE
                WHEN completed_at IS NULL AND $2 >= $3 THEN now()
                ELSE completed_at
            END,
            updated_at = now()
        WHERE user_id = $1
    `, [userId, before.answer_count, REQUIRED_ANSWER_COUNT], executor);

    const events: string[] = [];
    if (startsNow) events.push("questionnaire_started");
    events.push("questionnaire_progress");
    if (completesNow) events.push("questionnaire_completed");
    for (const event of events) {
        await query(`
            INSERT INTO q_questionnaire_events(user_id, event, answer_count, revision)
            VALUES($1, $2, $3, $4)
        `, [userId, event, before.answer_count, before.revision], executor);
    }
    return before;
}

export async function status(userId: string) {
    const state = await loadStatus(userId);
    return {
        revision: state.revision,
        birthDate: state.birth_date,
        preferences: state.preferences,
        skipped: state.skipped,
        answerCount: state.answer_count,
        required: REQUIRED_ANSWER_COUNT,
        complete: state.answer_count >= REQUIRED_ANSWER_COUNT,
    };
}

export async function questions(userId: string) {
    const [state, rows] = await Promise.all([
        status(userId),
        query(`
            SELECT
                question.id,
                question.question_key,
                question.version,
                question.prompt,
                question.options,
                question.category_id AS category,
                question.pool,
                question.sensitive,
                answer.answer_id,
                answer.acceptable,
                answer.weight,
                answer.public,
                answer.explanation
            FROM q_questions question
            LEFT JOIN q_answers answer
                ON answer.question_id = question.id AND answer.user_id = $1
            WHERE question.published
            ORDER BY question.position
        `, [userId]),
    ]);
    return { questions: rows, state };
}

export async function saveAnswer(userId: string, input: unknown) {
    const answer = answerInput.parse(input);
    return transaction(async (executor) => {
        await ensureState(userId, executor);
        const [state] = await query<{ revision: number } & QueryResultRow>(
            "SELECT revision FROM q_state WHERE user_id = $1 FOR UPDATE",
            [userId], executor,
        );
        if (state.revision !== answer.revision) {
            throw new DomainError("Your answers changed on another device. Reload before saving.", 409);
        }

        const [question] = await query<{ options: { id: string }[] } & QueryResultRow>(
            "SELECT options FROM q_questions WHERE id = $1 AND published",
            [answer.questionId], executor,
        );
        if (!question) throw new DomainError("Question is no longer available", 404);
        const optionIds = new Set(question.options.map((option) => option.id));
        if (!optionIds.has(answer.answerId) || answer.acceptable.some((id) => !optionIds.has(id))) {
            throw new DomainError("Choose answers from this question");
        }

        await query(`
            INSERT INTO q_answers(
                user_id, question_id, answer_id, acceptable, weight, public, explanation
            ) VALUES($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT(user_id, question_id) DO UPDATE SET
                answer_id = excluded.answer_id,
                acceptable = excluded.acceptable,
                weight = excluded.weight,
                public = excluded.public,
                explanation = excluded.explanation,
                updated_at = now()
        `, [userId, answer.questionId, answer.answerId, JSON.stringify(answer.acceptable), answer.weight, answer.public, answer.explanation], executor);
        await query("UPDATE q_state SET revision = revision + 1, updated_at = now() WHERE user_id = $1", [userId], executor);
        await invalidateCompatibilityCache(userId, executor);
        const progress = await recordProgress(userId, executor);
        return { saved: true, revision: progress.revision, answerCount: progress.answer_count, complete: progress.answer_count >= REQUIRED_ANSWER_COUNT };
    });
}

export async function deleteAnswer(userId: string, input: unknown) {
    const answer = deleteAnswerInput.parse(input);
    return transaction(async (executor) => {
        await ensureState(userId, executor);
        const [state] = await query<{ revision: number } & QueryResultRow>(
            "SELECT revision FROM q_state WHERE user_id = $1 FOR UPDATE",
            [userId], executor,
        );
        if (state.revision !== answer.revision) {
            throw new DomainError("Reload your answers before deleting.", 409);
        }
        const removed = await query(`
            DELETE FROM q_answers WHERE user_id = $1 AND question_id = $2 RETURNING question_id
        `, [userId, answer.questionId], executor);
        if (removed.length === 0) return { deleted: false, revision: state.revision };
        await query("UPDATE q_state SET revision = revision + 1, updated_at = now() WHERE user_id = $1", [userId], executor);
        await invalidateCompatibilityCache(userId, executor);
        const progress = await recordProgress(userId, executor);
        return { deleted: true, revision: progress.revision, answerCount: progress.answer_count };
    });
}

export async function skipQuestion(userId: string, input: unknown) {
    const skipped = skipQuestionInput.parse(input);
    return transaction(async (executor) => {
        const [question] = await query(
            "SELECT id FROM q_questions WHERE id = $1 AND published",
            [skipped.questionId], executor,
        );
        if (!question) throw new DomainError("Question is no longer available", 404);
        await ensureState(userId, executor);
        await query(`
            UPDATE q_state
            SET skipped = CASE
                WHEN skipped ? $2 THEN skipped
                ELSE skipped || jsonb_build_array($2::text)
            END,
            updated_at = now()
            WHERE user_id = $1
        `, [userId, skipped.questionId], executor);
        const progress = await recordProgress(userId, executor);
        return { saved: true, answerCount: progress.answer_count };
    });
}

export async function savePreferences(userId: string, input: unknown) {
    const parsed = preferenceInput.parse(input);
    const age = ageOn(parsed.birthDate);
    if (age < 18 || age > 120) {
        throw new DomainError("You must be at least 18. Enter a valid date of birth.");
    }
    const { birthDate, ...preferences } = parsed;
    return transaction(async (executor) => {
        await ensureState(userId, executor);
        const [row] = await query<{ revision: number } & QueryResultRow>(`
            UPDATE q_state
            SET birth_date = $2, preferences = $3, revision = revision + 1, updated_at = now()
            WHERE user_id = $1
            RETURNING revision
        `, [userId, birthDate, JSON.stringify(preferences)], executor);
        await invalidateCompatibilityCache(userId, executor);
        await recordProgress(userId, executor);
        return { saved: true, revision: row.revision };
    });
}

export async function ownProfile(userId: string) {
    const [profile] = await query(`
        SELECT first_name, gender, about_me, photos, university, course, year_of_study,
               profile_completed, face_verification_status
        FROM profiles WHERE user_id = $1
    `, [userId]);
    return { profile: profile ?? null };
}

export async function saveProfile(userId: string, input: unknown, photoHooks: PhotoHooks = defaultPhotoHooks) {
    const profile = profileInput.parse(input);
    const state = await status(userId);
    if (!state.preferences || ageOn(state.birthDate ?? "") < 18) {
        throw new DomainError("Save your adult date of birth and preferences first");
    }

    const storageUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL;
    if (!storageUrl) throw new DomainError("Photo storage is not configured", 503);
    const storageOrigin = new URL(storageUrl.startsWith("http") ? storageUrl : `https://${storageUrl}`).origin;
    const [existing] = await query<{ id: string; photos: string[] | null; profile_photo: string | null } & QueryResultRow>(
        "SELECT id, photos, profile_photo FROM profiles WHERE user_id = $1",
        [userId],
    );
    const existingPhotos = new Set([...(existing?.photos ?? []), existing?.profile_photo].filter(Boolean));
    for (const photo of profile.photos) {
        const url = new URL(photo);
        const isOwnedUpload = url.protocol === "https:"
            && url.origin === storageOrigin
            && url.pathname.startsWith(`/uploads/${userId}/`);
        if (!existingPhotos.has(photo) && !isOwnedUpload) {
            throw new DomainError("Upload photos using the photo picker");
        }
    }
    const photosChanged = JSON.stringify(existing?.photos ?? []) !== JSON.stringify(profile.photos);

    const saved = await transaction(async (executor) => {
        await query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`profile:${userId}`], executor);
        if (existing) {
            const [updated] = await query<{ id: string } & QueryResultRow>(`
                UPDATE profiles SET
                    first_name = $2, gender = $3, about_me = $4, photos = $5, profile_photo = $6,
                    university = $7, course = $8, year_of_study = $9,
                    profile_completed = true, is_complete = true, age = $10,
                    face_verification_status = CASE WHEN $11 THEN 'not_started' ELSE face_verification_status END,
                    face_verified_at = CASE WHEN $11 THEN NULL ELSE face_verified_at END,
                    updated_at = now()
                WHERE user_id = $1 RETURNING id
            `, [userId, profile.name, profile.gender, profile.bio, JSON.stringify(profile.photos), profile.photos[0], profile.university ?? null, profile.course ?? null, profile.yearOfStudy ?? null, ageOn(state.birthDate ?? ""), photosChanged], executor);
            return updated;
        }
        const [inserted] = await query<{ id: string } & QueryResultRow>(`
            INSERT INTO profiles(
                user_id, first_name, gender, about_me, photos, profile_photo,
                university, course, year_of_study, profile_completed, is_complete, age
            ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, true, true, $10)
            RETURNING id
        `, [userId, profile.name, profile.gender, profile.bio, JSON.stringify(profile.photos), profile.photos[0], profile.university ?? null, profile.course ?? null, profile.yearOfStudy ?? null, ageOn(state.birthDate ?? "")], executor);
        return inserted;
    });

    // Run this on every save so a retry can recover if a prior enqueue failed
    // after the profile transaction committed.
    await photoHooks.afterPhotosChanged(userId, profile.photos, saved.id);
    return { saved: true, verificationReset: photosChanged, photoProcessingQueued: true };
}
