import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, test } from "node:test";

import type { Score } from "./contracts";
import { REQUIRED_QUESTION_IDS } from "./contracts";
import { setQuestionnaireDatabaseForTests, type QuestionnaireDatabase } from "./db";
import { health as checkEngineHealth, rank as callEngine } from "./engine-client";
import { handlePhase4Request } from "./phase4-api";
import * as phase4 from "./phase4-service";
import { applyDiscoveryMigration, applyQuestionnaireMigration } from "./migration";
import { DomainError, status as questionnaireStatus } from "./phase2-service";
import { createTestDatabase, legacyTestSchema } from "./test-database";

let database: QuestionnaireDatabase;
let closeDatabase: () => Promise<void>;
const questionnaireSql = readFileSync(resolve("drizzle/0038_questionnaire_matching.sql"), "utf8");
const discoverySql = readFileSync(resolve("drizzle/0039_questionnaire_discovery.sql"), "utf8");

const preferences = (genders: string[]) => ({
    genders,
    minAge: 18,
    maxAge: 60,
    city: "Nairobi",
    radiusKm: null,
    latitude: null,
    longitude: null,
    intentions: ["Long-term relationship"],
});

async function seedMember(id: string, gender: "male" | "female", genders: string[], birthDate = "1995-06-15") {
    await database.query(
        "INSERT INTO \"user\"(id, name, email) VALUES($1, $2, $3)",
        [id, id, `${id}@example.test`],
    );
    await database.query(`
        INSERT INTO profiles(
            id, user_id, first_name, gender, about_me, photos, profile_completed, is_complete,
            is_visible, discovery_paused, anonymous, visibility_mode, incognito_mode,
            face_verification_status, face_verified_at
        ) VALUES($1, $2, $3, $4, $5, $6, true, true, true, false, false, 'standard', false, 'verified', now())
    `, [`profile-${id}`, id, id, gender, `${id} introduction`, JSON.stringify([`https://media.example.test/${id}.jpg`])]);
    await database.query(`
        INSERT INTO q_state(user_id, revision, birth_date, preferences, completed_at)
        VALUES($1, 1, $2, $3, now())
    `, [id, birthDate, JSON.stringify(preferences(genders))]);
    for (const [index, questionId] of REQUIRED_QUESTION_IDS.entries()) {
        await database.query(`
            INSERT INTO q_answers(user_id, question_id, answer_id, acceptable, weight, public, explanation)
            VALUES($1, $2, '0', '["0", "1"]', 10, $3, $4)
        `, [id, questionId, index < 2, `${id} explanation ${index + 1}`]);
    }
}

function deterministicRank(viewerScore = 95) {
    return async (viewer: { revision: number }, candidates: { id: string; revision: number }[]): Promise<Score[]> => candidates.map((candidate, index) => ({
        candidateId: candidate.id,
        viewerRevision: viewer.revision,
        candidateRevision: candidate.revision,
        algorithmVersion: "questionnaire-v1",
        status: index === candidates.length - 1 && candidates.length > 1 ? "insufficient_evidence" : "ready",
        score: index === candidates.length - 1 && candidates.length > 1 ? null : viewerScore - index,
        sharedCount: 20,
        evidenceCount: index === candidates.length - 1 && candidates.length > 1 ? 5 : 20,
    }));
}

beforeEach(async () => {
    const testDatabase = await createTestDatabase();
    database = testDatabase.database;
    closeDatabase = () => testDatabase.pglite.close();
    setQuestionnaireDatabaseForTests(database);
    await database.query(legacyTestSchema);
    await applyQuestionnaireMigration(database, questionnaireSql);
    await applyDiscoveryMigration(database, discoverySql);
    await seedMember("viewer", "female", ["male"]);
    await seedMember("candidate-a", "male", ["female"]);
    await seedMember("candidate-b", "male", ["female"]);
});

afterEach(async () => {
    setQuestionnaireDatabaseForTests(undefined);
    await closeDatabase();
});

test("discovery migration is additive and idempotent", async () => {
    const second = await applyDiscoveryMigration(database, discoverySql);
    assert.equal(second.alreadyApplied, true);
    const legacy = await database.query("SELECT count(*)::int AS count FROM messages");
    assert.equal(legacy.rows[0].count, 0);
    const tables = await database.query(`
        SELECT to_regclass('q_compatibility_cache')::text AS cache,
               to_regclass('q_discovery_events')::text AS events
    `);
    assert.deepEqual(tables.rows[0], { cache: "q_compatibility_cache", events: "q_discovery_events" });
});

test("ranking is deterministic, evidence-aware, paginated, and privacy-safe", async () => {
    const result = await phase4.discovery("viewer", 0, { rank: deterministicRank() });
    assert.deepEqual(result.items.map((item) => item.id), ["candidate-a", "candidate-b"]);
    assert.equal(result.items[0].compatibility.score, 95);
    assert.equal(result.items[1].compatibility.score, null);
    assert.equal(result.totalEligible, 2);
    assert.equal(result.pageSize, 20);
    const serialized = JSON.stringify(result);
    for (const forbidden of ["birthDate", "latitude", "longitude", "acceptable", "answerId", "deletedReason"]) {
        assert.equal(serialized.includes(forbidden), false);
    }
});

test("non-disclosure answers stay out of scoring evidence", async () => {
    await database.query("UPDATE q_answers SET answer_id = '2', acceptable = '[\"2\"]', weight = 0 WHERE user_id = 'viewer' AND question_id = 'q101:1'");
    const inspectRank = async (viewer: { revision: number; answers: { questionVersionId: string }[] }, candidates: { id: string; revision: number }[]) => {
        assert.equal(viewer.answers.some((answer) => answer.questionVersionId === "q101:1"), false);
        return deterministicRank()(viewer, candidates);
    };
    const result = await phase4.discovery("viewer", 0, { rank: inspectRank });
    assert.equal(result.items.length, 2);
});

test("optional answers cannot substitute for a missing required question in discovery", async () => {
    await database.query("DELETE FROM q_answers WHERE user_id = 'candidate-a' AND question_id = 'q101:1'");
    await database.query(`
        INSERT INTO q_answers(user_id, question_id, answer_id, acceptable, weight, public)
        VALUES('candidate-a', 'q021:1', '0', '["0"]', 10, true)
    `);
    const result = await phase4.discovery("viewer", 0, { rank: deterministicRank() });
    assert.deepEqual(result.items.map((item) => item.id), ["candidate-b"]);
});

test("large eligible pools are scored in bounded batches before stable pagination", async () => {
    for (let index = 0; index < 24; index += 1) {
        await seedMember(`extra-${String(index).padStart(2, "0")}`, "male", ["female"]);
    }
    let engineCalls = 0;
    const boundedRank = async (viewer: { revision: number }, candidates: { id: string; revision: number }[]) => {
        engineCalls += 1;
        assert.ok(candidates.length <= 25);
        return candidates.map((candidate) => ({
            candidateId: candidate.id,
            viewerRevision: viewer.revision,
            candidateRevision: candidate.revision,
            algorithmVersion: "questionnaire-v1" as const,
            status: "ready" as const,
            score: 80,
            sharedCount: 20,
            evidenceCount: 20,
        }));
    };
    const first = await phase4.discovery("viewer", 0, { rank: boundedRank });
    assert.equal(first.items.length, 20);
    assert.equal(first.totalEligible, 26);
    assert.equal(first.hasMore, true);
    assert.equal(engineCalls, 2);
    const second = await phase4.discovery("viewer", 1, { rank: boundedRank });
    assert.equal(second.items.length, 6);
    assert.equal(second.items[0].id, "extra-18");
    assert.equal(engineCalls, 2);
});

test("reciprocal eligibility independently excludes unsafe and incompatible candidates", async () => {
    const visibleIds = async () => (await phase4.discovery("viewer", 0, { rank: deterministicRank() })).items.map((item) => item.id);
    assert.deepEqual(await visibleIds(), ["candidate-a", "candidate-b"]);

    await database.query("UPDATE profiles SET is_visible = false WHERE user_id = 'candidate-a'");
    assert.deepEqual(await visibleIds(), ["candidate-b"]);
    await database.query("UPDATE profiles SET is_visible = true, face_verification_status = 'not_started' WHERE user_id = 'candidate-a'");
    assert.deepEqual(await visibleIds(), ["candidate-b"]);
    await database.query("UPDATE profiles SET face_verification_status = 'verified', incognito_mode = true WHERE user_id = 'candidate-a'");
    assert.deepEqual(await visibleIds(), ["candidate-b"]);
    await database.query("UPDATE profiles SET incognito_mode = false WHERE user_id = 'candidate-a'");
    await database.query("INSERT INTO blocks(id, blocker_id, blocked_id) VALUES('block-1', 'candidate-a', 'viewer')");
    assert.deepEqual(await visibleIds(), ["candidate-b"]);
    await database.query("DELETE FROM blocks");
    await database.query("UPDATE q_state SET preferences = $1 WHERE user_id = 'candidate-a'", [JSON.stringify(preferences(["male"]))]);
    assert.deepEqual(await visibleIds(), ["candidate-b"]);
    await database.query("UPDATE q_state SET preferences = $1 WHERE user_id = 'candidate-a'", [JSON.stringify(preferences(["female"]))]);
    await database.query("UPDATE \"user\" SET deleted_reason = 'admin_suspended' WHERE id = 'candidate-a'");
    assert.deepEqual(await visibleIds(), ["candidate-b"]);
    await database.query("UPDATE \"user\" SET deleted_reason = NULL WHERE id = 'candidate-a'; UPDATE q_state SET birth_date = '2012-01-01' WHERE user_id = 'candidate-a'");
    assert.deepEqual(await visibleIds(), ["candidate-b"]);
    await database.query("UPDATE q_state SET birth_date = '1995-06-15' WHERE user_id = 'candidate-a'; UPDATE profiles SET profile_completed = false, is_complete = false WHERE user_id = 'candidate-a'");
    assert.deepEqual(await visibleIds(), ["candidate-b"]);
    await database.query("UPDATE profiles SET profile_completed = true, is_complete = true, discovery_paused = true WHERE user_id = 'candidate-a'");
    assert.deepEqual(await visibleIds(), ["candidate-b"]);
    await database.query("UPDATE profiles SET discovery_paused = false WHERE user_id = 'candidate-a'");
    await database.query("UPDATE q_state SET preferences = $1 WHERE user_id = 'candidate-a'", [JSON.stringify({ ...preferences(["female"]), intentions: ["Something casual"] })]);
    assert.deepEqual(await visibleIds(), ["candidate-b"]);
    await database.query("UPDATE q_state SET preferences = $1 WHERE user_id = 'candidate-a'", [JSON.stringify({ ...preferences(["female"]), minAge: 40 })]);
    assert.deepEqual(await visibleIds(), ["candidate-b"]);
    await database.query("UPDATE q_state SET preferences = $1 WHERE user_id = 'candidate-a'", [JSON.stringify({ ...preferences(["female"]), city: "Mombasa" })]);
    assert.deepEqual(await visibleIds(), ["candidate-b"]);
});

test("discovery blockers match readiness for profile safety gates", async () => {
    const ready = await questionnaireStatus("viewer");
    assert.equal(ready.discovery.ready, true);
    assert.deepEqual(ready.discovery.missing, []);

    await database.query("UPDATE profiles SET face_verification_status = 'not_started' WHERE user_id = 'viewer'");
    const unverified = await questionnaireStatus("viewer");
    assert.equal(unverified.discovery.ready, false);
    assert.deepEqual(unverified.discovery.missing, ["verification"]);

    await database.query("UPDATE profiles SET face_verification_status = 'verified', is_visible = false WHERE user_id = 'viewer'");
    const hidden = await questionnaireStatus("viewer");
    assert.equal(hidden.discovery.ready, false);
    assert.deepEqual(hidden.discovery.missing, ["visibility"]);

    await database.query("UPDATE profiles SET is_visible = true, discovery_paused = true WHERE user_id = 'viewer'");
    const paused = await questionnaireStatus("viewer");
    assert.equal(paused.discovery.ready, false);
    assert.deepEqual(paused.discovery.missing, ["paused"]);

    await database.query("UPDATE profiles SET discovery_paused = false, profile_completed = false, is_complete = false WHERE user_id = 'viewer'");
    const incomplete = await questionnaireStatus("viewer");
    assert.equal(incomplete.discovery.ready, false);
    assert.deepEqual(incomplete.discovery.missing, ["profile"]);
});

test("valid revision cache survives outage and stale cache never does", async () => {
    await phase4.discovery("viewer", 0, { rank: deterministicRank(91) });
    const unavailable = async () => { throw new Error("offline"); };
    const cached = await phase4.discovery("viewer", 0, { rank: unavailable });
    assert.equal(cached.items[0].compatibility.score, 91);

    await database.query("UPDATE q_state SET revision = revision + 1 WHERE user_id = 'candidate-a'");
    await assert.rejects(
        phase4.discovery("viewer", 0, { rank: unavailable }),
        (error: DomainError) => error.status === 503 && error.message.includes("temporarily unavailable"),
    );
});

test("revision changes during an engine request are rejected", async () => {
    const racingRank = async (viewer: { revision: number }, candidates: { id: string; revision: number }[]) => {
        await database.query("UPDATE q_state SET revision = revision + 1 WHERE user_id = 'viewer'");
        return deterministicRank()(viewer, candidates);
    };
    await assert.rejects(
        phase4.discovery("viewer", 0, { rank: racingRank }),
        (error: DomainError) => error.status === 409,
    );
});

test("comparison exposes a candidate's public answers regardless of the viewer's setting", async () => {
    const first = await phase4.comparison("viewer", "candidate-a", { rank: deterministicRank() });
    assert.equal(first.questions.length, 2);
    assert.equal(first.questions[0].yourExplanation, "viewer explanation 1");
    assert.equal("birthDate" in first.profile, false);

    await database.query("UPDATE q_answers SET public = false WHERE user_id = 'viewer' AND question_id = 'q001:1'");
    const viewerPrivate = await phase4.comparison("viewer", "candidate-a", { rank: deterministicRank() });
    assert.deepEqual(viewerPrivate.questions.map((question) => question.id), ["q001:1", "q002:1"]);

    await database.query("UPDATE q_answers SET public = false WHERE user_id = 'candidate-a' AND question_id = 'q001:1'");
    await database.query("UPDATE q_state SET revision = revision + 1 WHERE user_id = 'candidate-a'");
    const second = await phase4.comparison("viewer", "candidate-a", { rank: deterministicRank() });
    assert.deepEqual(second.questions.map((question) => question.id), ["q002:1"]);
});

test("public API requires matching flag and never accepts caller-supplied identity", async () => {
    await assert.rejects(
        handlePhase4Request({ userId: "viewer", matchingEnabled: false, method: "GET", path: ["discovery"] }),
        (error: DomainError) => error.status === 404,
    );
    const result = await handlePhase4Request(
        { userId: "viewer", matchingEnabled: true, method: "GET", path: ["discovery"], query: { page: "0" } },
        { rank: deterministicRank() },
    ) as { items: unknown[] };
    assert.equal(result.items.length, 2);
});

test("blocking is idempotent, removes discovery immediately, and reporting stores no answer data", async () => {
    await phase4.safetyAction("viewer", { targetId: "candidate-a" }, "block");
    await phase4.safetyAction("viewer", { targetId: "candidate-a" }, "block");
    const blocks = await database.query("SELECT count(*)::int AS count FROM blocks WHERE blocker_id = 'viewer' AND blocked_id = 'candidate-a'");
    assert.equal(blocks.rows[0].count, 1);
    const discovery = await phase4.discovery("viewer", 0, { rank: deterministicRank() });
    assert.deepEqual(discovery.items.map((item) => item.id), ["candidate-b"]);

    await phase4.safetyAction("viewer", { targetId: "candidate-b", reason: "fake_profile: details" }, "report");
    const reports = await database.query("SELECT reporter_id, reported_user_id, reason FROM reports");
    assert.deepEqual(reports.rows, [{ reporter_id: "viewer", reported_user_id: "candidate-b", reason: "fake_profile: details" }]);
});

test("engine client sends only opaque scoring data and validates authentication contract", async () => {
    let calls = 0;
    const viewer = { id: "viewer", revision: 1, answers: [] };
    const candidates = [{ id: "candidate", revision: 2, answers: [] }];
    const fetchImplementation: typeof fetch = async (input, init) => {
        calls += 1;
        assert.equal(new URL(input.toString()).pathname, "/v1/rank");
        assert.equal((init?.headers as Record<string, string>).Authorization, "Bearer secret");
        const body = JSON.parse(String(init?.body));
        assert.deepEqual(Object.keys(body).sort(), ["candidates", "viewer"]);
        return new Response(JSON.stringify({ results: [{
            candidateId: "candidate", viewerRevision: 1, candidateRevision: 2,
            algorithmVersion: "questionnaire-v1", status: "insufficient_evidence",
            score: null, sharedCount: 0, evidenceCount: 0,
        }] }), { status: 200, headers: { "Content-Type": "application/json" } });
    };
    const result = await callEngine(viewer, candidates, {
        baseUrl: "https://matching.example.test", secret: "secret", fetchImplementation,
    });
    assert.equal(result.length, 1);
    assert.equal(calls, 1);

    await assert.rejects(callEngine(viewer, Array.from({ length: 26 }, (_, index) => ({ id: `c-${index}`, revision: 1, answers: [] })), {
        baseUrl: "https://matching.example.test", secret: "secret", fetchImplementation,
    }), /batch exceeds/i);
});

test("engine client retries transient failures but not authentication failures", async () => {
    const viewer = { id: "viewer", revision: 1, answers: [] };
    const candidates = [{ id: "candidate", revision: 2, answers: [] }];
    let transientCalls = 0;
    const transientFetch: typeof fetch = async () => {
        transientCalls += 1;
        return new Response("unavailable", { status: 503 });
    };
    await assert.rejects(callEngine(viewer, candidates, {
        baseUrl: "https://matching.example.test", secret: "secret", fetchImplementation: transientFetch,
    }));
    assert.equal(transientCalls, 2);

    let authenticationCalls = 0;
    const authenticationFetch: typeof fetch = async () => {
        authenticationCalls += 1;
        return new Response("unauthorized", { status: 401 });
    };
    await assert.rejects(callEngine(viewer, candidates, {
        baseUrl: "https://matching.example.test", secret: "secret", fetchImplementation: authenticationFetch,
    }));
    assert.equal(authenticationCalls, 1);

    const health = await checkEngineHealth({
        baseUrl: "https://matching.example.test",
        secret: "secret",
        fetchImplementation: async () => new Response(JSON.stringify({ status: "ok", algorithmVersion: "questionnaire-v1" }), { status: 200 }),
    });
    assert.deepEqual(health, { status: "ok", algorithmVersion: "questionnaire-v1" });
});
