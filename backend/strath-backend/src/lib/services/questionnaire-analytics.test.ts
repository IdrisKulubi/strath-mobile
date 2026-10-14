import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, test } from 'node:test';
import { createTestDatabase, legacyTestSchema } from '../questionnaire/test-database';
import { applyConnectionsMigration, applyDiscoveryMigration, applyQuestionnaireMigration } from '../questionnaire/migration';
import { REQUIRED_QUESTION_IDS } from '../questionnaire/contracts';
import type { QuestionnaireDatabase } from '../questionnaire/db';
import { setQuestionnaireDatabaseForTests } from '../questionnaire/db';
import { recordRankingTelemetry } from '../questionnaire/ranking-telemetry';
import { analyticsWindow, loadQuestionnaireAnalytics, percentage } from './questionnaire-analytics';

let database: QuestionnaireDatabase;
beforeEach(async () => {
    ({ database } = await createTestDatabase());
    await database.query(legacyTestSchema);
    await applyQuestionnaireMigration(database, readFileSync('drizzle/0038_questionnaire_matching.sql', 'utf8'));
    await applyDiscoveryMigration(database, readFileSync('drizzle/0039_questionnaire_discovery.sql', 'utf8'));
    await applyConnectionsMigration(database, readFileSync('drizzle/0040_questionnaire_connections.sql', 'utf8'));
    await database.query(`CREATE TABLE analytics_events(id uuid PRIMARY KEY, event_type text NOT NULL, user_id text, metadata jsonb,
        created_at timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'))`);
});
afterEach(async () => { setQuestionnaireDatabaseForTests(); await database.close?.(); });
async function member(id: string, count: number, inactive = false) {
    await database.query(`INSERT INTO "user"(id,name,email) VALUES($1,$1,$2)`, [id, `${id}@test.local`]);
    await database.query(`INSERT INTO q_state(user_id,revision,started_at,completed_at) VALUES($1,1,now()-interval '10 days',now()-interval '9 days')`, [id]);
    for (const question of REQUIRED_QUESTION_IDS.slice(0, count)) {
        await database.query(`INSERT INTO q_answers(user_id,question_id,answer_id,acceptable,weight,updated_at)
            VALUES($1,$2,'0','["0"]',10,now() - $3::interval)`, [id, question, inactive ? '8 days' : '1 hour']);
    }
}

test('counts current 32-answer completion, inactive midpoint and optional answers correctly', async () => {
    await member('finished', 32);
    await member('middle', 16, true);
    await member('recent', 5);
    await member('old-completion', 20, true);
    await member('zero', 0);
    await member('deleted', 32);
    await database.query(`UPDATE "user" SET deleted_at = now() WHERE id='deleted'`);
    await database.query(`INSERT INTO q_answers(user_id,question_id,answer_id,acceptable,weight) VALUES('middle','q021:1','0','["0"]',10)`);
    const result = await loadQuestionnaireAnalytics('all', database);
    assert.equal(result.available, true);
    assert.deepEqual(result.summary, { entered: 5, started: 4, complete: 1, inactive: 2, recent: 1, zero: 1 });
    assert.equal(result.milestones.find(x => x.step === 16)?.users, 3);
    assert.equal(result.progress.find(x => x.step === 17)?.inactive, 1);
    assert.equal(result.progress.find(x => x.step === 21)?.inactive, 1);
    assert.equal(result.progress[0].answered, 4);
    // Old completed_at timestamps cannot stand in for current completion.
    assert.equal((await loadQuestionnaireAnalytics(7, database)).summary.entered, 0);
});

test('question gaps are the next required question, not total answers plus one', async () => {
    await member('gap', 6, true);
    await database.query(`DELETE FROM q_answers WHERE user_id='gap' AND question_id=$1`, [REQUIRED_QUESTION_IDS[2]]);
    const result = await loadQuestionnaireAnalytics('all', database);
    assert.equal(result.progress[2].next, 1);
    assert.equal(result.progress[2].inactive, 1);
    assert.equal(result.progress[5].next, 0);
});

test('deduplicates completions, excludes old 20-answer milestones and legacy/pending matches', async () => {
    await member('a', 32); await member('b', 32); await member('c', 32);
    await database.query(`INSERT INTO q_questionnaire_events(user_id,event,answer_count,revision,created_at)
        VALUES('a','questionnaire_completed',20,1,now()-interval '1 day'),
        ('a','questionnaire_progress',32,2,now()),('a','questionnaire_progress',32,3,now())`);
    await database.query(`INSERT INTO matches(id,user1_id,user2_id) VALUES('new','a','b'),('old','a','c')`);
    await database.query(`INSERT INTO q_connections(user_a,user_b,match_id,status,origin,connected_at)
        VALUES('a','b','new','unmatched','questionnaire',now()),('a','c','old','active','legacy',now()),('b','c',null,'pending','questionnaire',null)`);
    await database.query(`INSERT INTO q_connection_events(user_id,match_id,event) VALUES('a','new','message_sent'),('b','new','message_sent'),('c','old','message_sent')`);
    const result = await loadQuestionnaireAnalytics(30, database);
    assert.equal(result.daily.reduce((sum, day) => sum + day.completed, 0), 1);
    assert.equal(result.connections.matches, 1);
    assert.equal(result.connections.messagingMatches, 1);
    assert.equal(result.connections.messages, 2);
    assert.equal(result.connections.active, 0);
    assert.equal(result.daily.reduce((sum, day) => sum + day.matches, 0), 1);
});

test('ranking operations count cache reuse and new engine work separately; stale cache excluded', async () => {
    await member('a',32); await member('b',32); await member('c',32);
    setQuestionnaireDatabaseForTests(database);
    await recordRankingTelemetry('a', { source: 'discovery', candidates: 10, cacheHits: 4, engineScored: 6, engineBatches: 1, failed: false, durationMs: 100 });
    await recordRankingTelemetry('a', { source: 'comparison', candidates: 1, cacheHits: 1, engineScored: 0, engineBatches: 0, failed: false, durationMs: 5 });
    await database.query(`INSERT INTO q_compatibility_cache(user_a,user_b,revision_a,revision_b,algorithm_version,status,score,shared_count,evidence_count)
        VALUES('a','b',1,1,'questionnaire-v1','ready',82,32,32),('a','c',0,1,'questionnaire-v1','ready',95,32,32)`);
    const result = await loadQuestionnaireAnalytics(30, database);
    assert.equal(result.ranking.requests, 2);
    assert.equal(result.ranking.candidates, 11);
    assert.equal(result.ranking.cacheHits, 5);
    assert.equal(result.ranking.engineScored, 6);
    assert.deepEqual(result.cache, { pairs: 1, ready: 1, insufficient: 0, average: 82, profiles: 2 });
});

test('empty periods and missing migrations report absence without invented conversions', async () => {
    const result = await loadQuestionnaireAnalytics(7, database);
    assert.equal(result.summary.complete,0);
    assert.equal(result.ranking.available,false);
    assert.equal(result.daily.length,7);
    assert.equal(percentage(0,0),'—');
    assert.equal(analyticsWindow('invalid'),30);
    await database.query('DROP TABLE q_discovery_events');
    const missing = await loadQuestionnaireAnalytics('all',database);
    assert.equal(missing.available,false);
    assert.deepEqual(missing.missing,['q_discovery_events']);
});

test('reviewer demo activity is excluded from questionnaire business analytics', async () => {
    await member('demo-dates-main',32);
    await database.query(`INSERT INTO q_questionnaire_events(user_id,event,answer_count,revision) VALUES('demo-dates-main','questionnaire_progress',32,1)`);
    await database.query(`INSERT INTO q_discovery_events(user_id,event,candidate_count,duration_ms) VALUES('demo-dates-main','discovery_served',2,100)`);
    await database.query(`INSERT INTO q_connection_events(user_id,event) VALUES('demo-dates-main','like_sent')`);
    setQuestionnaireDatabaseForTests(database);
    await recordRankingTelemetry('demo-dates-main',{source:'discovery',candidates:2,cacheHits:0,engineScored:2,engineBatches:1,failed:false,durationMs:100});
    const result=await loadQuestionnaireAnalytics('all',database);
    assert.equal(result.summary.entered,0);
    assert.equal(result.summary.complete,0);
    assert.equal(result.discovery.requests,0);
    assert.equal(result.connections.likes,0);
    assert.equal(result.ranking.requests,0);
    assert.equal(result.daily.reduce((sum,day)=>sum+day.completed,0),0);
});
