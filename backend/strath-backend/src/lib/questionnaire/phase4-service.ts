import type { QueryResultRow } from "pg";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { ALGORITHM, publicScore, sortScores, type EnginePerson, type Score } from "./contracts";
import { query, transaction } from "./db";
import { rank as rankWithEngine } from "./engine-client";
import { isDiscoveryReady, isReciprocallyEligible, publicProfile, type Candidate } from "./eligibility";
import { DomainError } from "./phase2-service";

const PAGE_SIZE = 20;
const ENGINE_BATCH_SIZE = 25;
const MAX_POOL_SIZE = 2_000;

type RankFunction = (viewer: EnginePerson, candidates: EnginePerson[]) => Promise<Score[]>;
export type Phase4Dependencies = { rank?: RankFunction };

type CandidateRow = QueryResultRow & {
    id: string;
    revision: number;
    birthDate: string | null;
    preferences: Candidate["preferences"];
    answerCount: number;
    deletedAt: Date | null;
    deletedReason: string | null;
    firstName: string;
    gender: string | null;
    introduction: string;
    photos: unknown;
    profileCompleted: boolean;
    isComplete: boolean;
    isVisible: boolean;
    discoveryPaused: boolean;
    anonymous: boolean;
    faceVerificationStatus: string;
    incognitoMode: boolean;
    visibilityMode: string;
};

type CacheRow = QueryResultRow & {
    userA: string;
    userB: string;
    revisionA: number;
    revisionB: number;
    algorithmVersion: string;
    status: Score["status"];
    score: number | null;
    sharedCount: number;
    evidenceCount: number;
};

function parsePhotos(value: unknown) {
    return Array.isArray(value) ? value.filter((photo): photo is string => typeof photo === "string") : [];
}

async function loadCandidates(viewerId: string) {
    const rows = await query<CandidateRow>(`
        SELECT
            account.id,
            account.deleted_at AS "deletedAt",
            account.deleted_reason AS "deletedReason",
            state.revision,
            state.birth_date::text AS "birthDate",
            state.preferences,
            (SELECT count(*)::int
                FROM q_answers answer
                JOIN q_questions question ON question.id = answer.question_id AND question.published
                WHERE answer.user_id = account.id) AS "answerCount",
            profile.first_name AS "firstName",
            profile.gender,
            coalesce(profile.about_me, profile.bio, '') AS introduction,
            coalesce(profile.photos::jsonb, '[]'::jsonb) AS photos,
            coalesce(profile.profile_completed, false) AS "profileCompleted",
            coalesce(profile.is_complete, false) AS "isComplete",
            coalesce(profile.is_visible, false) AS "isVisible",
            coalesce(profile.discovery_paused, false) AS "discoveryPaused",
            coalesce(profile.anonymous, false) AS anonymous,
            profile.face_verification_status AS "faceVerificationStatus",
            coalesce(profile.incognito_mode, false) AS "incognitoMode",
            coalesce(profile.visibility_mode, 'standard') AS "visibilityMode"
        FROM "user" account
        JOIN profiles profile ON profile.user_id = account.id
        JOIN q_state state ON state.user_id = account.id
        WHERE account.deleted_at IS NULL
          AND account.deleted_reason IS NULL
          AND state.birth_date <= current_date - interval '18 years'
          AND state.birth_date >= current_date - interval '120 years'
          AND state.preferences IS NOT NULL
          AND (coalesce(profile.profile_completed, false) OR coalesce(profile.is_complete, false))
          AND coalesce(profile.is_visible, false)
          AND NOT coalesce(profile.discovery_paused, false)
          AND NOT coalesce(profile.anonymous, false)
          AND profile.face_verification_status = 'verified'
          AND (SELECT count(*)
               FROM q_answers answer
               JOIN q_questions question ON question.id = answer.question_id AND question.published
               WHERE answer.user_id = account.id) >= 20
          AND NOT EXISTS (
            SELECT 1 FROM blocks block
            WHERE (block.blocker_id = $1 AND block.blocked_id = account.id)
               OR (block.blocked_id = $1 AND block.blocker_id = account.id)
        )
        ORDER BY account.id
        LIMIT $2
    `, [viewerId, MAX_POOL_SIZE + 2]);
    if (rows.length > MAX_POOL_SIZE + 1) {
        throw new DomainError("Discovery has too many eligible accounts to rank safely. Please try again later.", 503);
    }
    return rows.map((row): Candidate => ({
        id: row.id,
        revision: row.revision,
        birthDate: row.birthDate,
        preferences: row.preferences,
        answerCount: row.answerCount,
        deletedAt: row.deletedAt,
        deletedReason: row.deletedReason,
        incomingLike: false,
        profile: {
            firstName: row.firstName,
            gender: row.gender,
            introduction: row.introduction,
            photos: parsePhotos(row.photos),
            profileCompleted: row.profileCompleted,
            isComplete: row.isComplete,
            isVisible: row.isVisible,
            discoveryPaused: row.discoveryPaused,
            anonymous: row.anonymous,
            faceVerificationStatus: row.faceVerificationStatus,
            incognitoMode: row.incognitoMode,
            visibilityMode: row.visibilityMode,
        },
    }));
}

async function enginePeople(candidates: Candidate[]) {
    if (candidates.length === 0) return [];
    const answers = await query<{
        userId: string;
        questionVersionId: string;
        answerId: string;
        acceptableAnswerIds: string[];
        weight: number;
    } & QueryResultRow>(`
        SELECT answer.user_id AS "userId", answer.question_id AS "questionVersionId",
               answer.answer_id AS "answerId", answer.acceptable AS "acceptableAnswerIds", answer.weight
        FROM q_answers answer
        JOIN q_questions question ON question.id = answer.question_id AND question.published
        WHERE answer.user_id = ANY($1::text[])
        ORDER BY answer.user_id, answer.question_id
    `, [candidates.map((candidate) => candidate.id)]);
    return candidates.map((candidate): EnginePerson => ({
        id: candidate.id,
        revision: candidate.revision,
        answers: answers.filter((answer) => answer.userId === candidate.id).map((answer) => ({
            questionVersionId: answer.questionVersionId,
            answerId: answer.answerId,
            acceptableAnswerIds: answer.acceptableAnswerIds,
            weight: answer.weight,
        })),
    }));
}

function canonicalPair(first: Candidate, second: Candidate) {
    return first.id < second.id
        ? { userA: first, userB: second }
        : { userA: second, userB: first };
}

function cachedScore(viewer: Candidate, candidate: Candidate, cache: CacheRow[]) {
    const pair = canonicalPair(viewer, candidate);
    const row = cache.find((item) => item.userA === pair.userA.id && item.userB === pair.userB.id);
    if (!row
        || row.algorithmVersion !== ALGORITHM
        || row.revisionA !== pair.userA.revision
        || row.revisionB !== pair.userB.revision) return null;
    return {
        candidateId: candidate.id,
        viewerRevision: viewer.revision,
        candidateRevision: candidate.revision,
        algorithmVersion: ALGORITHM,
        status: row.status,
        score: row.score,
        sharedCount: row.sharedCount,
        evidenceCount: row.evidenceCount,
    } satisfies Score;
}

async function storeScore(viewer: Candidate, candidate: Candidate, score: Score) {
    const pair = canonicalPair(viewer, candidate);
    await query(`
        INSERT INTO q_compatibility_cache(
            user_a, user_b, revision_a, revision_b, algorithm_version,
            status, score, shared_count, evidence_count
        ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT(user_a, user_b) DO UPDATE SET
            revision_a = excluded.revision_a,
            revision_b = excluded.revision_b,
            algorithm_version = excluded.algorithm_version,
            status = excluded.status,
            score = excluded.score,
            shared_count = excluded.shared_count,
            evidence_count = excluded.evidence_count,
            updated_at = now()
    `, [
        pair.userA.id, pair.userB.id, pair.userA.revision, pair.userB.revision, ALGORITHM,
        score.status, score.score, score.sharedCount, score.evidenceCount,
    ]);
}

async function scores(viewer: Candidate, candidates: Candidate[], rank: RankFunction) {
    if (candidates.length === 0) return [];
    const ids = candidates.map((candidate) => candidate.id);
    const cache = await query<CacheRow>(`
        SELECT user_a AS "userA", user_b AS "userB", revision_a AS "revisionA", revision_b AS "revisionB",
               algorithm_version AS "algorithmVersion", status, score,
               shared_count AS "sharedCount", evidence_count AS "evidenceCount"
        FROM q_compatibility_cache
        WHERE (user_a = $1 AND user_b = ANY($2::text[]))
           OR (user_b = $1 AND user_a = ANY($2::text[]))
    `, [viewer.id, ids]);
    const complete: Score[] = [];
    const missing: Candidate[] = [];
    for (const candidate of candidates) {
        const cached = cachedScore(viewer, candidate, cache);
        if (cached) complete.push(cached);
        else missing.push(candidate);
    }
    if (missing.length === 0) return complete.sort(sortScores);

    const [engineViewer] = await enginePeople([viewer]);
    try {
        for (let offset = 0; offset < missing.length; offset += ENGINE_BATCH_SIZE) {
            const batchCandidates = missing.slice(offset, offset + ENGINE_BATCH_SIZE);
            const batchPeople = await enginePeople(batchCandidates);
            const batchScores = await rank(engineViewer, batchPeople);
            for (const score of batchScores) {
                const candidate = batchCandidates.find((item) => item.id === score.candidateId);
                if (!candidate) throw new Error("Engine returned an unknown candidate");
                await storeScore(viewer, candidate, score);
            }
            complete.push(...batchScores);
        }
    } catch {
        throw new DomainError("Matching is temporarily unavailable. Please try again.", 503);
    }
    return complete.sort(sortScores);
}

async function recordEvent(userId: string, event: "discovery_served" | "discovery_empty" | "engine_unavailable", count: number, startedAt: number) {
    await query(`
        INSERT INTO q_discovery_events(user_id, event, candidate_count, duration_ms)
        VALUES($1, $2, $3, $4)
    `, [userId, event, count, Math.max(0, Date.now() - startedAt)]);
}

async function phase5ExcludedIds(userId: string) {
    const table = await query<{ exists: boolean } & QueryResultRow>(
        "SELECT to_regclass('public.q_profile_decisions') IS NOT NULL AS exists",
    );
    if (!table[0]?.exists) return new Set<string>();
    const rows = await query<{ id: string } & QueryResultRow>(`
        SELECT target_id AS id FROM q_profile_decisions WHERE actor_id = $1
        UNION
        SELECT CASE WHEN user_a = $1 THEN user_b ELSE user_a END AS id
        FROM q_connections
        WHERE (user_a = $1 OR user_b = $1) AND status IN ('active', 'unmatched', 'blocked')
    `, [userId]);
    return new Set(rows.map((row) => row.id));
}

export async function discovery(userId: string, page = 0, dependencies: Phase4Dependencies = {}) {
    if (!Number.isInteger(page) || page < 0 || page > 250) throw new DomainError("Invalid discovery page");
    const startedAt = Date.now();
    const initial = await loadCandidates(userId);
    const viewer = initial.find((candidate) => candidate.id === userId);
    if (!viewer || !isDiscoveryReady(viewer)) {
        throw new DomainError("Complete your profile, preferences, face verification and 20 answers to discover people.", 428);
    }
    const excluded = await phase5ExcludedIds(userId);
    const eligible = initial.filter((candidate) => !excluded.has(candidate.id) && isReciprocallyEligible(viewer, candidate));
    let ranked: Score[];
    try {
        ranked = await scores(viewer, eligible, dependencies.rank ?? rankWithEngine);
    } catch (error) {
        await recordEvent(userId, "engine_unavailable", 0, startedAt);
        throw error;
    }

    const current = await loadCandidates(userId);
    const currentExcluded = await phase5ExcludedIds(userId);
    const currentViewer = current.find((candidate) => candidate.id === userId);
    if (!currentViewer || currentViewer.revision !== viewer.revision || !isDiscoveryReady(currentViewer)) {
        throw new DomainError("Your answers or preferences changed. Refresh discovery.", 409);
    }
    const items = ranked.flatMap((score) => {
        const candidate = current.find((item) => item.id === score.candidateId);
        if (!candidate || currentExcluded.has(candidate.id) || candidate.revision !== score.candidateRevision || !isReciprocallyEligible(currentViewer, candidate)) return [];
        return [{ ...publicProfile(candidate), compatibility: publicScore(score) }];
    });
    await recordEvent(userId, items.length > 0 ? "discovery_served" : "discovery_empty", items.length, startedAt);
    const start = page * PAGE_SIZE;
    return {
        items: items.slice(start, start + PAGE_SIZE),
        page,
        pageSize: PAGE_SIZE,
        totalEligible: items.length,
        hasMore: start + PAGE_SIZE < items.length,
    };
}

export async function comparison(userId: string, targetId: string, dependencies: Phase4Dependencies = {}) {
    if (!targetId || targetId === userId) throw new DomainError("Profile unavailable", 404);
    const initial = await loadCandidates(userId);
    const viewer = initial.find((candidate) => candidate.id === userId);
    const candidate = initial.find((item) => item.id === targetId);
    if (!viewer || !candidate || !isReciprocallyEligible(viewer, candidate)) throw new DomainError("Profile unavailable", 404);
    const [score] = await scores(viewer, [candidate], dependencies.rank ?? rankWithEngine);
    const questions = await query<{
        id: string;
        prompt: string;
        options: { id: string; label: string }[];
        yours: string;
        theirs: string;
        yourExplanation: string;
        theirExplanation: string;
    } & QueryResultRow>(`
        SELECT question.id, question.prompt, question.options,
               viewer_answer.answer_id AS yours, candidate_answer.answer_id AS theirs,
               viewer_answer.explanation AS "yourExplanation",
               candidate_answer.explanation AS "theirExplanation"
        FROM q_answers viewer_answer
        JOIN q_answers candidate_answer ON candidate_answer.question_id = viewer_answer.question_id
        JOIN q_questions question ON question.id = viewer_answer.question_id AND question.published
        WHERE viewer_answer.user_id = $1 AND candidate_answer.user_id = $2
          AND viewer_answer.public AND candidate_answer.public
        ORDER BY question.position
    `, [userId, targetId]);

    const current = await loadCandidates(userId);
    const currentViewer = current.find((item) => item.id === userId);
    const currentCandidate = current.find((item) => item.id === targetId);
    if (!currentViewer || !currentCandidate
        || currentViewer.revision !== viewer.revision
        || currentCandidate.revision !== candidate.revision
        || !isReciprocallyEligible(currentViewer, currentCandidate)) {
        throw new DomainError("Answers changed. Refresh this profile.", 409);
    }
    return {
        profile: publicProfile(currentCandidate),
        compatibility: publicScore(score),
        questions,
    };
}

const safetyInput = z.object({
    targetId: z.string().trim().min(1).max(128),
    reason: z.string().trim().min(1).max(1_000).optional(),
}).strict();

export async function safetyAction(userId: string, input: unknown, action: "block" | "report") {
    const parsed = safetyInput.parse(input);
    if (parsed.targetId === userId) throw new DomainError("Choose another member");
    if (action === "report" && !parsed.reason) throw new DomainError("Describe the concern");

    if (action === "block") {
        await transaction(async (executor) => {
            const [target] = await query(
                "SELECT id FROM \"user\" WHERE id = $1 AND deleted_at IS NULL FOR UPDATE",
                [parsed.targetId],
                executor,
            );
            if (!target) throw new DomainError("Profile unavailable", 404);
            await query(`
                INSERT INTO blocks(id, blocker_id, blocked_id)
                SELECT $1, $2, $3
                WHERE NOT EXISTS (
                    SELECT 1 FROM blocks WHERE blocker_id = $2 AND blocked_id = $3
                )
            `, [randomUUID(), userId, parsed.targetId], executor);
            const connectionTable = await query<{ exists: boolean } & QueryResultRow>(
                "SELECT to_regclass('public.q_connections') IS NOT NULL AS exists",
                [],
                executor,
            );
            if (connectionTable[0]?.exists) {
                const pair = [userId, parsed.targetId].sort();
                await query(`
                    UPDATE q_connections
                    SET status = 'blocked', ended_at = now(), updated_at = now()
                    WHERE user_a = $1 AND user_b = $2 AND status IN ('pending', 'active')
                `, pair, executor);
                await query("INSERT INTO q_connection_events(user_id, event) VALUES($1, 'blocked')", [userId], executor);
            }
        });
        return { saved: true };
    }
    const [target] = await query("SELECT id FROM \"user\" WHERE id = $1 AND deleted_at IS NULL", [parsed.targetId]);
    if (!target) throw new DomainError("Profile unavailable", 404);
    await query(`
        INSERT INTO reports(id, reporter_id, reported_user_id, reason, status)
        VALUES($1, $2, $3, $4, 'PENDING')
    `, [randomUUID(), userId, parsed.targetId, parsed.reason]);
    return { saved: true };
}
