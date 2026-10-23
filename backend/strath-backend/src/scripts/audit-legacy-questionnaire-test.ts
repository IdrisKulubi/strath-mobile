/** Read-only database audit of the questionnaire fixture; never calls the matching service. */
import { resolve } from "node:path";
import { config } from "dotenv";
import { getPool } from "../lib/questionnaire/db";
import { REQUIRED_QUESTION_IDS } from "../lib/questionnaire/contracts";
import { isReciprocallyEligible, type Candidate } from "../lib/questionnaire/eligibility";

config({ path: resolve(process.cwd(), ".env.local") });

async function main() {
    const args = process.argv.slice(2);
    const viewerEmail = args[args.indexOf("--viewer-email") + 1];
    const targetEmail = args[args.indexOf("--target-email") + 1];
    if (!viewerEmail || !targetEmail || viewerEmail === targetEmail) throw new Error("Provide distinct account emails");
    const pool = getPool();
    const client = await pool.connect();
    try {
        await client.query("BEGIN READ ONLY");
        const rows = (await client.query<{
            id: string; email: string; deleted_at: Date | null; deleted_reason: string | null;
            revision: number | null; birth_date: string | null; preferences: Candidate["preferences"];
            answer_count: number; private_count: number; first_name: string; gender: string;
            introduction: string; photos: string[]; profile_completed: boolean; is_complete: boolean;
            is_visible: boolean; discovery_paused: boolean; anonymous: boolean;
            face_verification_status: string; incognito_mode: boolean; visibility_mode: string;
        }>(`
            SELECT account.id, account.email, account.deleted_at, account.deleted_reason,
                   state.revision, state.birth_date::text, state.preferences,
                   (SELECT count(*)::int FROM q_answers answer JOIN q_questions question
                    ON question.id = answer.question_id AND question.published
                    WHERE answer.user_id = account.id AND answer.question_id = ANY($3::text[])) AS answer_count,
                   (SELECT count(*)::int FROM q_answers WHERE user_id = account.id AND NOT public) AS private_count,
                   profile.first_name, profile.gender, coalesce(profile.about_me, profile.bio, '') AS introduction,
                   coalesce(profile.photos::jsonb, '[]'::jsonb) AS photos,
                   coalesce(profile.profile_completed, false) AS profile_completed,
                   coalesce(profile.is_complete, false) AS is_complete,
                   coalesce(profile.is_visible, false) AS is_visible,
                   coalesce(profile.discovery_paused, false) AS discovery_paused,
                   coalesce(profile.anonymous, false) AS anonymous,
                   profile.face_verification_status,
                   coalesce(profile.incognito_mode, false) AS incognito_mode,
                   coalesce(profile.visibility_mode, 'standard') AS visibility_mode
            FROM "user" account JOIN profiles profile ON profile.user_id = account.id
            LEFT JOIN q_state state ON state.user_id = account.id
            WHERE lower(account.email) IN (lower($1), lower($2))
        `, [viewerEmail, targetEmail, REQUIRED_QUESTION_IDS])).rows;
        const convert = (email: string): Candidate => {
            const row = rows.find((item) => item.email.toLowerCase() === email.toLowerCase());
            if (!row || row.revision === null) throw new Error("Account or questionnaire state is missing");
            return {
                id: row.id, revision: row.revision, birthDate: row.birth_date,
                preferences: row.preferences, answerCount: row.answer_count,
                deletedAt: row.deleted_at, deletedReason: row.deleted_reason, incomingLike: false,
                profile: {
                    firstName: row.first_name, gender: row.gender, introduction: row.introduction,
                    photos: row.photos, profileCompleted: row.profile_completed, isComplete: row.is_complete,
                    isVisible: row.is_visible, discoveryPaused: row.discovery_paused, anonymous: row.anonymous,
                    faceVerificationStatus: row.face_verification_status, incognitoMode: row.incognito_mode,
                    visibilityMode: row.visibility_mode,
                },
            };
        };
        const viewer = convert(viewerEmail);
        const target = convert(targetEmail);
        const blocked = (await client.query<{ count: number }>(`
            SELECT count(*)::int AS count FROM blocks
            WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)
        `, [viewer.id, target.id])).rows[0].count > 0;
        const table = (await client.query<{ exists: boolean }>(
            "SELECT to_regclass('public.q_profile_decisions') IS NOT NULL AS exists",
        )).rows[0].exists;
        let excluded = false;
        if (table) {
            excluded = (await client.query<{ count: number }>(`
                SELECT count(*)::int AS count FROM (
                    SELECT target_id FROM q_profile_decisions WHERE actor_id = $1 AND target_id = $2
                    UNION ALL
                    SELECT CASE WHEN user_a = $1 THEN user_b ELSE user_a END FROM q_connections
                    WHERE (user_a = $1 AND user_b = $2 OR user_b = $1 AND user_a = $2)
                      AND status IN ('active', 'unmatched', 'blocked')
                ) excluded
            `, [viewer.id, target.id])).rows[0].count > 0;
        }
        const targetRow = rows.find((row) => row.id === target.id)!;
        console.info({ targetRequiredAnswers: target.answerCount, targetPrivateAnswers: targetRow.private_count,
            mutuallyEligible: isReciprocallyEligible(viewer, target), blocked, excludedByDecision: excluded,
            availableToDiscover: !blocked && !excluded && isReciprocallyEligible(viewer, target) });
        await client.query("ROLLBACK");
    } finally {
        client.release();
        await pool.end();
    }
}

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Legacy audit failed");
    process.exitCode = 1;
});
