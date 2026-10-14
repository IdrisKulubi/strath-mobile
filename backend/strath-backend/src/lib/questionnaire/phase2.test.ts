import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, test } from "node:test";

import { handlePhase2Request } from "./phase2-api";
import { setQuestionnaireDatabaseForTests, type QuestionnaireDatabase } from "./db";
import { applyQuestionnaireMigration, seedQuestionnaireCatalogue } from "./migration";
import * as service from "./phase2-service";
import { REQUIRED_ANSWER_COUNT, REQUIRED_QUESTION_IDS } from "./contracts";
import { createTestDatabase, legacyTestSchema } from "./test-database";

let database: QuestionnaireDatabase;
let closeDatabase: () => Promise<void>;
const migrationSql = readFileSync(resolve("drizzle/0038_questionnaire_matching.sql"), "utf8");

async function seedLegacyRows() {
    await database.query(legacyTestSchema);
    await database.query(`
        INSERT INTO "user"(id, name, email) VALUES
            ('user-a', 'A', 'a@example.test'),
            ('user-b', 'B', 'b@example.test');
        INSERT INTO profiles(id, user_id, first_name, photos, face_verification_status, face_verified_at)
            VALUES('profile-a', 'user-a', 'A', '["https://media.example.test/uploads/user-a/old.jpg"]', 'verified', now());
        INSERT INTO messages(id, sender_id, content) VALUES('message-1', 'user-a', 'preserved');
    `);
}

beforeEach(async () => {
    const testDatabase = await createTestDatabase();
    database = testDatabase.database;
    closeDatabase = () => testDatabase.pglite.close();
    setQuestionnaireDatabaseForTests(database);
    await seedLegacyRows();
    await applyQuestionnaireMigration(database, migrationSql);
});

afterEach(async () => {
    setQuestionnaireDatabaseForTests(undefined);
    await closeDatabase();
});

test("migration and catalogue seed are additive, immutable, and idempotent", async () => {
    const second = await applyQuestionnaireMigration(database, migrationSql);
    assert.equal(second.alreadyApplied, true);
    await database.query("DELETE FROM q_questions");
    await database.query("DELETE FROM q_categories");
    const seedOnly = await seedQuestionnaireCatalogue(database);
    assert.equal(seedOnly.publishedQuestions, 109);
    const questions = await database.query<{ count: number } & import("pg").QueryResultRow>(
        "SELECT count(*)::int AS count FROM q_questions",
    );
    assert.equal(questions.rows[0].count, 109);
    const pools = await database.query("SELECT pool, count(*)::int AS count FROM q_questions GROUP BY pool ORDER BY pool");
    assert.deepEqual(pools.rows, [
        { pool: "replacement", count: 40 },
        { pool: "sensitive", count: 29 },
        { pool: "starter", count: 40 },
    ]);
    await assert.rejects(
        database.query("UPDATE q_questions SET prompt = 'changed' WHERE id = 'q001:1'"),
        /immutable/i,
    );
    const legacy = await database.query("SELECT (SELECT count(*)::int FROM \"user\") AS users, (SELECT count(*)::int FROM profiles) AS profiles, (SELECT count(*)::int FROM messages) AS messages");
    assert.deepEqual(legacy.rows[0], { users: 2, profiles: 1, messages: 1 });
});

test("a failed migration rolls back without changing legacy records", async () => {
    const isolated = await createTestDatabase();
    try {
        await isolated.database.query(legacyTestSchema);
        await isolated.database.query(`
            INSERT INTO "user"(id, name, email) VALUES('legacy-user', 'Legacy', 'legacy@example.test');
            INSERT INTO profiles(id, user_id, first_name) VALUES('legacy-profile', 'legacy-user', 'Legacy');
            INSERT INTO messages(id, sender_id, content) VALUES('legacy-message', 'legacy-user', 'keep');
        `);
        await assert.rejects(
            applyQuestionnaireMigration(isolated.database, `${migrationSql}\nSELECT * FROM table_that_does_not_exist;`),
        );
        const result = await isolated.database.query(`
            SELECT
                to_regclass('q_questions') AS questionnaire_table,
                (SELECT count(*)::int FROM "user") AS users,
                (SELECT count(*)::int FROM profiles) AS profiles,
                (SELECT count(*)::int FROM messages) AS messages
        `);
        assert.deepEqual(result.rows[0], {
            questionnaire_table: null,
            users: 1,
            profiles: 1,
            messages: 1,
        });
    } finally {
        await isolated.pglite.close();
    }
});

test("authentication, availability, and user scoping are enforced", async () => {
    await assert.rejects(
        handlePhase2Request({ userId: null, collectionEnabled: true, method: "GET", path: ["status"] }),
        (error: service.DomainError) => error.status === 401,
    );
    const experience = await handlePhase2Request({
        userId: "user-a",
        collectionEnabled: false,
        featureFlags: { collection: false, matching: false, shell: true },
        method: "GET",
        path: ["experience"],
    });
    assert.deepEqual(experience, { collection: false, matching: false, shell: true });
    await assert.rejects(
        handlePhase2Request({ userId: "user-a", collectionEnabled: false, method: "GET", path: ["status"] }),
        (error: service.DomainError) => error.status === 404,
    );
    await service.savePreferences("user-a", validPreferences());
    const own = await handlePhase2Request({ userId: "user-a", collectionEnabled: true, method: "GET", path: ["status"] }) as { birthDate: string };
    const other = await handlePhase2Request({ userId: "user-b", collectionEnabled: true, method: "GET", path: ["status"] }) as { birthDate: string | null };
    assert.equal(own.birthDate, "1995-06-15");
    assert.equal(other.birthDate, null);
});

test("preferences validate adult calendar dates and keep DOB outside preference JSON", async () => {
    await assert.rejects(service.savePreferences("user-a", { ...validPreferences(), birthDate: "2020-02-30" }));
    await assert.rejects(service.savePreferences("user-a", { ...validPreferences(), birthDate: "2012-01-01" }), /at least 18/i);
    await assert.rejects(service.savePreferences("user-a", { ...validPreferences(), genders: [] }));
    await service.savePreferences("user-a", validPreferences());
    const stored = await database.query<{ birth_date: string; preferences: Record<string, unknown> } & import("pg").QueryResultRow>(
        "SELECT birth_date::text, preferences FROM q_state WHERE user_id = 'user-a'",
    );
    assert.equal(stored.rows[0].birth_date, "1995-06-15");
    assert.equal("birthDate" in stored.rows[0].preferences, false);
});

test("answers resume from twenty to thirty-two, default public, validate options, skip, conflict, edit, and delete", async () => {
    let revision = 0;
    const skipped = await service.skipQuestion("user-a", { questionId: "q100:1" });
    assert.equal(skipped.answerCount, 0);
    for (let index = 1; index <= 20; index += 1) {
        const questionId = `q${String(index).padStart(3, "0")}:1`;
        const result = await service.saveAnswer("user-a", {
            questionId, answerId: "0", acceptable: ["0", "1"], weight: 10, revision,
        });
        revision = result.revision;
    }
    const resumed = await service.status("user-a");
    assert.equal(resumed.answerCount, 20);
    assert.equal(resumed.complete, false);
    assert.equal(resumed.required, REQUIRED_ANSWER_COUNT);
    assert.deepEqual(resumed.requiredQuestionIds, REQUIRED_QUESTION_IDS);
    for (let index = 21; index <= 32; index += 1) {
        const result = await service.saveAnswer("user-a", {
            questionId: `q${String(index).padStart(3, "0")}:1`, answerId: "0", acceptable: ["0"], weight: 10, revision,
        });
        revision = result.revision;
    }
    assert.equal((await service.status("user-a")).answerCount, 20);
    assert.equal((await service.status("user-a")).complete, false);
    for (const questionId of REQUIRED_QUESTION_IDS.slice(20)) {
        const result = await service.saveAnswer("user-a", {
            questionId, answerId: "0", acceptable: ["0", "1"], weight: 10, revision,
        });
        revision = result.revision;
    }
    assert.equal((await service.status("user-a")).complete, true);
    const publicRows = await database.query<{ public: boolean } & import("pg").QueryResultRow>("SELECT public FROM q_answers WHERE user_id = 'user-a'");
    assert.equal(publicRows.rows.every((row) => row.public === true), true);

    await database.query("UPDATE q_answers SET public = false WHERE user_id = 'user-a' AND question_id = 'q001:1'");
    const legacyPrivate = await database.query<{ public: boolean } & import("pg").QueryResultRow>("SELECT public FROM q_answers WHERE user_id = 'user-a' AND question_id = 'q001:1'");
    assert.equal(legacyPrivate.rows[0].public, false);

    await assert.rejects(service.saveAnswer("user-a", {
        questionId: "q001:1", answerId: "0", acceptable: ["0"], weight: 10, public: false, revision,
    }));

    await assert.rejects(service.saveAnswer("user-a", {
        questionId: "q001:1", answerId: "missing", acceptable: ["0"], weight: 1, revision,
    }), /Choose answers/);
    await assert.rejects(service.saveAnswer("user-a", {
        questionId: "q001:1", answerId: "0", acceptable: ["0"], weight: 1, revision: revision - 1,
    }), (error: service.DomainError) => error.status === 409);

    const edited = await service.saveAnswer("user-a", {
        questionId: "q001:1", answerId: "1", acceptable: ["1"], weight: 50, revision,
    });
    assert.equal(edited.revision, revision + 1);
    const republished = await database.query<{ public: boolean } & import("pg").QueryResultRow>("SELECT public FROM q_answers WHERE user_id = 'user-a' AND question_id = 'q001:1'");
    assert.equal(republished.rows[0].public, true);
    const removed = await service.deleteAnswer("user-a", { questionId: "q020:1", revision: edited.revision });
    assert.equal(removed.deleted, true);
    assert.equal(removed.answerCount, 31);
    assert.equal((await service.status("user-a")).revision, edited.revision + 1);
});

test("a non-disclosure answer completes its question but contributes no preference data", async () => {
    await service.saveAnswer("user-a", {
        questionId: "q101:1", answerId: "2", acceptable: ["2", "0"], weight: 250,
        explanation: "Do not publish this note", revision: 0,
    });
    const saved = await database.query<{ answer_id: string; acceptable: string[]; weight: number; explanation: string } & import("pg").QueryResultRow>(
        "SELECT answer_id, acceptable, weight, explanation FROM q_answers WHERE user_id = 'user-a' AND question_id = 'q101:1'",
    );
    assert.deepEqual(saved.rows[0], { answer_id: "2", acceptable: ["2"], weight: 0, explanation: "" });
    assert.equal((await service.status("user-a")).answerCount, 1);
});

test("one user's catalogue response never contains another user's answer", async () => {
    await service.saveAnswer("user-a", {
        questionId: "q001:1", answerId: "0", acceptable: ["0"], weight: 10, public: true, revision: 0,
    });
    const other = await service.questions("user-b") as unknown as { questions: { id: string; answer_id: string | null }[] };
    assert.equal(other.questions.find((question) => question.id === "q001:1")?.answer_id, null);
});

test("progress analytics contain counts and revisions, never answers or DOB", async () => {
    await service.saveAnswer("user-a", {
        questionId: "q001:1", answerId: "0", acceptable: ["0"], weight: 10, revision: 0,
    });
    const columns = await database.query<{ column_name: string } & import("pg").QueryResultRow>(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'q_questionnaire_events' ORDER BY ordinal_position
    `);
    assert.deepEqual(columns.rows.map((row) => row.column_name), ["id", "user_id", "event", "answer_count", "revision", "created_at"]);
});

test("profile saves use owned storage URLs, reset verification after photo changes, and call photo hooks", async () => {
    process.env.CLOUDFLARE_R2_PUBLIC_URL = "https://media.example.test";
    await service.savePreferences("user-a", validPreferences());
    const calls: string[][] = [];
    const result = await service.saveProfile("user-a", {
        name: "Alice", gender: "female", bio: "A sufficiently long introduction.",
        photos: ["https://media.example.test/uploads/user-a/new.jpg"],
        university: null, course: null, yearOfStudy: null,
    }, {
        async afterPhotosChanged(userId, photos) { calls.push([userId, ...photos]); },
    });
    assert.equal(result.verificationReset, true);
    assert.deepEqual(calls, [["user-a", "https://media.example.test/uploads/user-a/new.jpg"]]);
    const profile = await database.query("SELECT face_verification_status, face_verified_at FROM profiles WHERE user_id = 'user-a'");
    assert.deepEqual(profile.rows[0], { face_verification_status: "not_started", face_verified_at: null });
    await assert.rejects(service.saveProfile("user-a", {
        name: "Alice", gender: "female", bio: "A sufficiently long introduction.",
        photos: ["https://attacker.example/photo.jpg"],
    }), /photo picker/i);
});

function validPreferences() {
    return {
        birthDate: "1995-06-15",
        genders: ["male"] as const,
        minAge: 24,
        maxAge: 40,
        city: "Nairobi",
        radiusKm: 50,
        latitude: -1.286389,
        longitude: 36.817223,
        intentions: ["long-term relationship"],
    };
}
