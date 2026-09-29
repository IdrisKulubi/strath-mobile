/** One-account, reversible questionnaire fixture for testing legacy discovery. */
import { resolve } from "node:path";
import { config } from "dotenv";
import type { QueryResultRow } from "pg";

import { getPool } from "../lib/questionnaire/db";
import { ageOn, NEUTRAL_ANSWER_IDS, preferenceInput, REQUIRED_QUESTION_IDS } from "../lib/questionnaire/contracts";

config({ path: resolve(process.cwd(), ".env.local") });

const args = process.argv.slice(2);
function argument(name: string) {
    const index = args.indexOf(name);
    return index < 0 ? undefined : args[index + 1];
}

type Account = QueryResultRow & {
    id: string;
    gender: string;
    age: number | null;
    city: string | null;
    latitude: string | null;
    longitude: string | null;
    deletedAt: Date | null;
    deletedReason: string | null;
    complete: boolean;
    visible: boolean;
    verified: boolean;
    paused: boolean;
    anonymous: boolean;
    incognito: boolean;
};
type State = QueryResultRow & { revision: number; birthDate: string | null; preferences: Record<string, unknown> | null };
type Answer = QueryResultRow & { questionId: string; answerId: string; acceptable: string[]; weight: number };
type Question = QueryResultRow & { id: string; options: { id: string }[] };

function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
    const radians = (value: number) => value * Math.PI / 180;
    const latitudeDelta = radians(b.latitude - a.latitude);
    const longitudeDelta = radians(b.longitude - a.longitude);
    const h = Math.sin(latitudeDelta / 2) ** 2
        + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}

async function main() {
    const viewerEmail = argument("--viewer-email");
    const targetEmail = argument("--target-email");
    const birthDate = argument("--birth-date");
    const targetGender = argument("--target-gender");
    const originalGender = argument("--original-gender");
    const apply = args.includes("--apply");
    const rollback = args.includes("--rollback");
    if (!viewerEmail || !targetEmail || viewerEmail === targetEmail || !birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
        throw new Error("Provide distinct --viewer-email, --target-email and --birth-date YYYY-MM-DD");
    }
    if (apply && rollback) throw new Error("Choose --apply or --rollback");
    if (Boolean(targetGender) !== Boolean(originalGender)
        || (targetGender && !["male", "female", "other"].includes(targetGender))
        || (originalGender && !["male", "female", "other"].includes(originalGender))
        || (targetGender && targetGender === originalGender)) {
        throw new Error("Gender test requires distinct --target-gender and --original-gender values");
    }
    const age = ageOn(birthDate);
    if (age < 18 || age > 120) throw new Error("Target birth date is invalid or underage");
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
    const pool = getPool();
    const client = await pool.connect();
    try {
        await client.query(rollback || apply ? "BEGIN" : "BEGIN READ ONLY");
        const accountQuery = `
            SELECT account.id, profile.gender, profile.age, profile.current_location AS city,
                   profile.location_latitude AS latitude, profile.location_longitude AS longitude,
                   account.deleted_at AS "deletedAt", account.deleted_reason AS "deletedReason",
                   (coalesce(profile.profile_completed, false) OR coalesce(profile.is_complete, false)) AS complete,
                   coalesce(profile.is_visible, false) AS visible,
                   (profile.face_verification_status = 'verified') AS verified,
                   coalesce(profile.discovery_paused, false) AS paused,
                   coalesce(profile.anonymous, false) AS anonymous,
                   (coalesce(profile.incognito_mode, false) OR profile.visibility_mode = 'incognito') AS incognito
            FROM "user" account JOIN profiles profile ON profile.user_id = account.id
            WHERE lower(account.email) = lower($1)
        `;
        const viewerRows = (await client.query<Account>(accountQuery, [viewerEmail])).rows;
        const targetRows = (await client.query<Account>(accountQuery, [targetEmail])).rows;
        if (viewerRows.length !== 1 || targetRows.length !== 1) throw new Error("Each email must resolve to exactly one existing profile");
        const viewer = viewerRows[0];
        const target = targetRows[0];
        if (apply || rollback) await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`legacy-questionnaire-seed:${target.id}`]);
        const states = (await client.query<State>(
            `SELECT user_id, revision, birth_date::text AS "birthDate", preferences
             FROM q_state WHERE user_id = ANY($1::text[]) ${apply || rollback ? "FOR UPDATE" : ""}`,
            [[viewer.id, target.id]],
        )).rows;
        const viewerState = states.find((row) => row.user_id === viewer.id);
        const targetState = states.find((row) => row.user_id === target.id);
        const existingCount = Number((await client.query<{ count: string }>("SELECT count(*) AS count FROM q_answers WHERE user_id = $1", [target.id])).rows[0].count);

        if (rollback) {
            if (!targetState || targetState.revision !== 1 || targetState.birthDate !== birthDate || existingCount !== REQUIRED_QUESTION_IDS.length) {
                throw new Error("Seed has changed; rollback refused to protect later account edits");
            }
            const seededRows = (await client.query<{ question_id: string; public: boolean; explanation: string }>(
                "SELECT question_id, public, explanation FROM q_answers WHERE user_id = $1", [target.id],
            )).rows;
            if (seededRows.some((row) => !REQUIRED_QUESTION_IDS.includes(row.question_id as typeof REQUIRED_QUESTION_IDS[number]) || row.public || row.explanation)) {
                throw new Error("Answers have changed; rollback refused");
            }
            if (targetGender && target.gender !== targetGender) throw new Error("Target gender changed; rollback refused");
            await client.query("DELETE FROM q_answers WHERE user_id = $1", [target.id]);
            await client.query("DELETE FROM q_state WHERE user_id = $1", [target.id]);
            if (originalGender) {
                await client.query("UPDATE profiles SET gender = $2, updated_at = now() WHERE user_id = $1 AND gender = $3",
                    [target.id, originalGender, targetGender]);
            }
            await client.query("COMMIT");
            console.info("Rolled back untouched legacy questionnaire test seed");
            return;
        }

        if (!viewerState?.birthDate || !viewerState.preferences) throw new Error("Viewer has no complete modern preferences");
        if (targetState || existingCount > 0) throw new Error("Target already has questionnaire data; refusing to overwrite it");
        if (originalGender && target.gender !== originalGender) throw new Error("Target gender does not match expected original gender");
        if (target.deletedAt || target.deletedReason || !target.complete || !target.visible || !target.verified || target.paused || target.anonymous || target.incognito) {
            throw new Error("Target legacy profile is not currently eligible for Discover");
        }
        const viewerPreferences = preferenceInput.parse({ birthDate: viewerState.birthDate, ...viewerState.preferences });
        const viewerAge = ageOn(viewerState.birthDate);
        if (viewerAge < 18 || viewerAge > 120 || !viewerPreferences.genders.includes((targetGender ?? target.gender) as "male" | "female" | "other")
            || age < viewerPreferences.minAge || age > viewerPreferences.maxAge) {
            throw new Error("Viewer gender or age filters exclude this target; the seed will not alter viewer filters");
        }
        if (!viewer.gender || !["male", "female", "other"].includes(viewer.gender)) throw new Error("Viewer gender is invalid");
        const latitude = target.latitude === null ? null : Number(target.latitude);
        const longitude = target.longitude === null ? null : Number(target.longitude);
        if (latitude === null || longitude === null || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            throw new Error("Target legacy profile lacks valid location coordinates");
        }
        const city = target.city?.trim() || viewerPreferences.city;
        const preferences = preferenceInput.parse({
            birthDate, genders: [viewer.gender], minAge: Math.min(18, viewerAge), maxAge: Math.max(100, viewerAge),
            city, radiusKm: 500, latitude, longitude, intentions: viewerPreferences.intentions,
        });
        const distance = viewerPreferences.latitude === null || viewerPreferences.longitude === null
            ? null : distanceKm({ latitude: viewerPreferences.latitude, longitude: viewerPreferences.longitude }, { latitude, longitude });
        const viewerLocationAccepts = viewerPreferences.radiusKm === null
            ? viewerPreferences.city.trim().toLowerCase() === city.toLowerCase()
            : distance !== null && distance <= viewerPreferences.radiusKm;
        const targetLocationAccepts = distance !== null && distance <= preferences.radiusKm!;
        if (!viewerLocationAccepts || !targetLocationAccepts) {
            throw new Error("Existing location filters exclude the pair; the seed will not alter viewer filters");
        }

        const viewerAnswers = (await client.query<Answer>(
            `SELECT question_id AS "questionId", answer_id AS "answerId", acceptable, weight
             FROM q_answers WHERE user_id = $1 AND question_id = ANY($2::text[])`,
            [viewer.id, REQUIRED_QUESTION_IDS],
        )).rows;
        const questions = (await client.query<Question>(
            "SELECT id, options FROM q_questions WHERE published AND id = ANY($1::text[])", [REQUIRED_QUESTION_IDS],
        )).rows;
        if (viewerAnswers.length !== REQUIRED_QUESTION_IDS.length || questions.length !== REQUIRED_QUESTION_IDS.length) {
            throw new Error("Viewer answers or published required catalogue are incomplete");
        }
        const planned = REQUIRED_QUESTION_IDS.map((id) => {
            const question = questions.find((item) => item.id === id)!;
            const answer = viewerAnswers.find((item) => item.questionId === id)!;
            const valid = new Set(question.options.map((option) => option.id));
            if (!valid.has(answer.answerId)) throw new Error("Viewer answer is outside the published catalogue");
            const neutral = NEUTRAL_ANSWER_IDS[id];
            const accepted = answer.acceptable.filter((option) => valid.has(option) && option !== neutral);
            const chosen = accepted[0] ?? question.options.find((option) => option.id !== neutral)?.id;
            if (!chosen) throw new Error("Question has no substantive answer option");
            const viewerSubstantive = answer.answerId !== neutral;
            return { id, chosen, acceptable: viewerSubstantive ? [answer.answerId] : [chosen], weight: viewerSubstantive ? 10 : 0,
                mutual: viewerSubstantive && accepted.includes(chosen) };
        });
        const mutualCount = planned.filter((answer) => answer.mutual).length;
        const preview = { targetAgeFromBirthDate: age, legacyAgeMatches: target.age === age,
            requiredAnswers: planned.length, mutuallyCompatibleAnswers: mutualCount,
            eligibleByExistingViewerFilters: true, privateAnswers: true,
            genderChangedForTest: Boolean(targetGender) };
        if (mutualCount < 10) throw new Error(`Only ${mutualCount} mutually compatible answers can be derived; refusing a weak test seed`);
        if (!apply) {
            await client.query("ROLLBACK");
            console.info("Dry run", preview);
            return;
        }

        const storedPreferences = Object.fromEntries(
            Object.entries(preferences).filter(([key]) => key !== "birthDate"),
        );
        await client.query(
            `INSERT INTO q_state(user_id, revision, birth_date, preferences, started_at, completed_at)
             VALUES ($1, 1, $2, $3::jsonb, now(), now())`,
            [target.id, birthDate, JSON.stringify(storedPreferences)],
        );
        for (const answer of planned) {
            await client.query(
                `INSERT INTO q_answers(user_id, question_id, answer_id, acceptable, weight, public, explanation)
                 VALUES ($1, $2, $3, $4::jsonb, $5, false, '')`,
                [target.id, answer.id, answer.chosen, JSON.stringify(answer.acceptable), answer.weight],
            );
        }
        if (targetGender) {
            const changed = await client.query(
                "UPDATE profiles SET gender = $2, updated_at = now() WHERE user_id = $1 AND gender = $3 RETURNING user_id",
                [target.id, targetGender, originalGender],
            );
            if (changed.rowCount !== 1) throw new Error("Target gender changed concurrently; transaction rolled back");
        }
        await client.query("COMMIT");
        console.info("Seeded existing legacy account", preview);
    } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Legacy seed failed");
    process.exitCode = 1;
});
