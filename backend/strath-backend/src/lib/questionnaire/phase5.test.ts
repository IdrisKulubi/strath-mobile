import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, test } from "node:test";

import { setQuestionnaireDatabaseForTests, transaction, type QuestionnaireDatabase } from "./db";
import { handlePhase5Request } from "./phase5-api";
import { reconcileLegacyConnections } from "./phase5-backfill";
import { discovery, safetyAction } from "./phase4-service";
import {
    listLikes,
    questionnaireChatAccess,
    removeQuestionnaireDataForAccount,
    saveDecision,
    saveMessageIdempotently,
    unmatch,
} from "./phase5-service";
import { applyConnectionsMigration, applyDiscoveryMigration, applyQuestionnaireMigration } from "./migration";
import { DomainError } from "./phase2-service";
import { createTestDatabase, legacyTestSchema } from "./test-database";

let database: QuestionnaireDatabase;
let closeDatabase: () => Promise<void>;
const questionnaireSql = readFileSync(resolve("drizzle/0038_questionnaire_matching.sql"), "utf8");
const discoverySql = readFileSync(resolve("drizzle/0039_questionnaire_discovery.sql"), "utf8");
const connectionsSql = readFileSync(resolve("drizzle/0040_questionnaire_connections.sql"), "utf8");

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

async function seedMember(id: string, gender: "male" | "female", genders: string[]) {
    await database.query('INSERT INTO "user"(id, name, email) VALUES($1, $2, $3)', [id, id, `${id}@test.local`]);
    await database.query(`
        INSERT INTO profiles(
            id, user_id, first_name, gender, about_me, photos, profile_photo,
            profile_completed, is_complete, is_visible, discovery_paused, anonymous,
            visibility_mode, incognito_mode, face_verification_status, face_verified_at
        ) VALUES($1, $2, $3, $4, $5, $6, $7, true, true, true, false, false, 'standard', false, 'verified', now())
    `, [`profile-${id}`, id, id, gender, `${id} introduction`, JSON.stringify([`https://images.test/${id}.jpg`]), `https://images.test/${id}.jpg`]);
    await database.query(`
        INSERT INTO q_state(user_id, revision, birth_date, preferences, completed_at)
        VALUES($1, 1, '1995-06-15', $2, now())
    `, [id, JSON.stringify(preferences(genders))]);
    for (let index = 1; index <= 20; index += 1) {
        await database.query(`
            INSERT INTO q_answers(user_id, question_id, answer_id, acceptable, weight, public)
            VALUES($1, $2, '0', '["0", "1"]', 10, false)
        `, [id, `q${String(index).padStart(3, "0")}:1`]);
    }
}

beforeEach(async () => {
    const testDatabase = await createTestDatabase();
    database = testDatabase.database;
    closeDatabase = () => testDatabase.pglite.close();
    setQuestionnaireDatabaseForTests(database);
    await database.query(legacyTestSchema);
    await applyQuestionnaireMigration(database, questionnaireSql);
    await applyDiscoveryMigration(database, discoverySql);
    await applyConnectionsMigration(database, connectionsSql);
    await seedMember("alice", "female", ["male"]);
    await seedMember("bob", "male", ["female"]);
    await seedMember("charlie", "male", ["female"]);
});

afterEach(async () => {
    setQuestionnaireDatabaseForTests(undefined);
    await closeDatabase();
});

test("connections migration is additive and idempotent", async () => {
    await database.query("INSERT INTO matches(id, user1_id, user2_id) VALUES('old-match', 'alice', 'bob')");
    await database.query("INSERT INTO messages(id, sender_id, content, match_id) VALUES('old-message', 'alice', 'preserved', 'old-match')");
    const rerun = await applyConnectionsMigration(database, connectionsSql);
    assert.equal(rerun.alreadyApplied, true);
    assert.equal((await database.query("SELECT content FROM messages WHERE id = 'old-message'")).rows[0].content, "preserved");
});

test("simultaneous reciprocal likes create one canonical connection and conversation", async () => {
    const notifications: string[] = [];
    const notifyMatch = async (a: string, b: string, matchId: string) => { notifications.push(`${a}:${b}:${matchId}`); };
    const [alice, bob] = await Promise.all([
        saveDecision("alice", { targetId: "bob", decision: "like" }, { notifyMatch }),
        saveDecision("bob", { targetId: "alice", decision: "like" }, { notifyMatch }),
    ]);
    assert.equal(alice.mutual || bob.mutual, true);
    const connections = await database.query("SELECT user_a, user_b, match_id, status FROM q_connections");
    assert.equal(connections.rows.length, 1);
    assert.deepEqual(connections.rows[0], { user_a: "alice", user_b: "bob", match_id: connections.rows[0].match_id, status: "active" });
    assert.equal((await database.query("SELECT count(*)::int AS count FROM matches")).rows[0].count, 1);
    assert.equal(notifications.length, 1);

    const retried = await saveDecision("alice", { targetId: "bob", decision: "like" }, { notifyMatch });
    assert.equal(retried.matchId, connections.rows[0].match_id);
    assert.equal(notifications.length, 1);
});

test("likes require current reciprocal eligibility and reveal incognito only after an incoming like", async () => {
    await saveDecision("bob", { targetId: "alice", decision: "like" });
    await database.query("UPDATE profiles SET incognito_mode = true WHERE user_id = 'bob'");
    const likes = await listLikes("alice");
    assert.deepEqual(likes.received.map((person) => person.id), ["bob"]);
    const serialized = JSON.stringify(likes);
    for (const field of ["birthDate", "preferences", "latitude", "longitude", "acceptable"]) {
        assert.equal(serialized.includes(field), false);
    }

    await database.query("UPDATE q_state SET preferences = $1 WHERE user_id = 'bob'", [JSON.stringify(preferences(["male"]))]);
    assert.deepEqual((await listLikes("alice")).received, []);
});

test("eligibility is rechecked before creating a connection", async () => {
    await saveDecision("alice", { targetId: "bob", decision: "like" });
    await database.query("UPDATE profiles SET discovery_paused = true WHERE user_id = 'alice'");
    await assert.rejects(
        saveDecision("bob", { targetId: "alice", decision: "like" }),
        (error: DomainError) => error.status === 409,
    );
    assert.equal((await database.query("SELECT status FROM q_connections WHERE user_a = 'alice' AND user_b = 'bob'")).rows[0].status, "pending");
});

test("unmatching and blocking revoke every questionnaire chat operation without deleting history", async () => {
    await saveDecision("alice", { targetId: "bob", decision: "like" });
    const connected = await saveDecision("bob", { targetId: "alice", decision: "like" });
    assert.equal(await questionnaireChatAccess(connected.matchId as string, "alice"), true);
    assert.equal(await questionnaireChatAccess(connected.matchId as string, "charlie"), false);
    const first = await saveMessageIdempotently(connected.matchId as string, "alice", "hello", "request-12345");
    const retry = await saveMessageIdempotently(connected.matchId as string, "alice", "hello", "request-12345");
    assert.equal(first.created, true);
    assert.equal(retry.created, false);
    assert.equal(first.message.id, retry.message.id);
    assert.equal((await database.query("SELECT count(*)::int AS count FROM messages")).rows[0].count, 1);
    assert.equal((await database.query("SELECT count(*)::int AS count FROM q_connection_events WHERE event = 'message_sent'")).rows[0].count, 1);

    await unmatch("alice", { matchId: connected.matchId });
    assert.equal(await questionnaireChatAccess(connected.matchId as string, "alice"), false);
    assert.equal((await database.query("SELECT count(*)::int AS count FROM messages")).rows[0].count, 1);
    await assert.rejects(
        saveDecision("alice", { targetId: "bob", decision: "like" }),
        (error: DomainError) => error.status === 409,
    );
});

test("blocking from profile or chat ends an active connection immediately", async () => {
    await saveDecision("alice", { targetId: "bob", decision: "like" });
    const connected = await saveDecision("bob", { targetId: "alice", decision: "like" });
    await safetyAction("alice", { targetId: "bob" }, "block");
    assert.equal(await questionnaireChatAccess(connected.matchId as string, "alice"), false);
    assert.equal((await database.query("SELECT status FROM q_connections WHERE match_id = $1", [connected.matchId])).rows[0].status, "blocked");
});

test("feature flag protects likes and connection mutations", async () => {
    await assert.rejects(
        handlePhase5Request({ userId: "alice", matchingEnabled: false, method: "GET", path: ["likes"] }),
        (error: DomainError) => error.status === 404,
    );
    const result = await handlePhase5Request(
        { userId: "alice", matchingEnabled: true, method: "POST", path: ["decisions"], body: { targetId: "bob", decision: "pass" } },
        { notifyMatch: async () => undefined },
    );
    assert.deepEqual(result, { mutual: false });
    const ranked = await discovery("alice", 0, { rank: async (viewer, candidates) => candidates.map((candidate) => ({
        candidateId: candidate.id,
        viewerRevision: viewer.revision,
        candidateRevision: candidate.revision,
        algorithmVersion: "questionnaire-v1" as const,
        status: "ready" as const,
        score: 90,
        sharedCount: 20,
        evidenceCount: 20,
    })) });
    assert.equal(ranked.items.some((person) => person.id === "bob"), false);
});

test("disabling matching does not remove an already active conversation", async () => {
    await saveDecision("alice", { targetId: "bob", decision: "like" });
    const connected = await saveDecision("bob", { targetId: "alice", decision: "like" });
    await assert.rejects(
        handlePhase5Request({ userId: "alice", matchingEnabled: false, method: "GET", path: ["connections"] }),
        (error: DomainError) => error.status === 404,
    );
    assert.equal(await questionnaireChatAccess(connected.matchId as string, "alice"), true);
});

test("legacy backfill preserves matches/messages and excludes inactive, blocked and missing conversations", async () => {
    await database.query("INSERT INTO matches(id, user1_id, user2_id) VALUES('legacy-chat', 'alice', 'bob')");
    await database.query("INSERT INTO messages(id, sender_id, content, match_id) VALUES('legacy-message', 'alice', 'keep me', 'legacy-chat')");
    await database.query(`
        INSERT INTO mutual_matches(id, user_a_id, user_b_id, status, legacy_match_id) VALUES
        ('active', 'alice', 'bob', 'mutual', 'legacy-chat'),
        ('expired', 'alice', 'charlie', 'expired', NULL),
        ('missing', 'bob', 'charlie', 'mutual', NULL)
    `);
    await database.query("INSERT INTO blocks(id, blocker_id, blocked_id) VALUES('blocked', 'alice', 'bob')");
    const blocked = await transaction((executor) => reconcileLegacyConnections(executor, true));
    assert.equal(blocked.eligible, 0);
    assert.equal(blocked.excludedBlockedOrDeleted, 1);
    assert.equal(blocked.excludedInactive, 1);
    assert.equal(blocked.excludedMissingConversation, 1);
    await database.query("DELETE FROM blocks");
    await database.query(`
        INSERT INTO q_connections(user_a, user_b, status, ended_at)
        VALUES('alice', 'bob', 'unmatched', now())
    `);
    const applied = await transaction((executor) => reconcileLegacyConnections(executor, true));
    assert.equal(applied.eligible, 1);
    assert.equal(applied.alreadyPresent, 1);
    assert.equal(applied.matchCountBefore, applied.matchCountAfter);
    assert.equal(applied.messageCountBefore, applied.messageCountAfter);
    assert.deepEqual((await database.query("SELECT match_id, status, origin FROM q_connections")).rows, [
        { match_id: null, status: "unmatched", origin: "questionnaire" },
    ]);
});

test("account cleanup removes questionnaire data and ends connections while preserving messages", async () => {
    await saveDecision("alice", { targetId: "bob", decision: "like" });
    const connected = await saveDecision("bob", { targetId: "alice", decision: "like" });
    await saveMessageIdempotently(connected.matchId as string, "alice", "retained for safety", "cleanup-request");
    const result = await removeQuestionnaireDataForAccount("alice");
    assert.equal(result.cleaned, true);
    assert.equal((await database.query("SELECT count(*)::int AS count FROM q_answers WHERE user_id = 'alice'")).rows[0].count, 0);
    assert.equal((await database.query("SELECT count(*)::int AS count FROM q_profile_decisions WHERE actor_id = 'alice' OR target_id = 'alice'")).rows[0].count, 0);
    assert.equal((await database.query("SELECT status FROM q_connections WHERE match_id = $1", [connected.matchId])).rows[0].status, "unmatched");
    assert.equal((await database.query("SELECT count(*)::int AS count FROM messages WHERE match_id = $1", [connected.matchId])).rows[0].count, 1);
    assert.equal((await database.query("SELECT count(*)::int AS count FROM q_connection_events WHERE user_id = 'alice'")).rows[0].count, 0);
    const state = (await database.query("SELECT birth_date, preferences FROM q_state WHERE user_id = 'alice'")).rows[0];
    assert.equal(state.birth_date, null);
    assert.equal(state.preferences, null);
});
