import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, test } from 'node:test';
import { createTestDatabase, legacyTestSchema } from '../questionnaire/test-database';
import { applyQuestionnaireMigration, applyDiscoveryMigration } from '../questionnaire/migration';
import { REQUIRED_QUESTION_IDS } from '../questionnaire/contracts';
import type { QuestionnaireDatabase } from '../questionnaire/db';
import { createReviewDemoSession, REVIEW_DEMO_ID, ReviewDemoError } from './review-demo-session';
let database: QuestionnaireDatabase;
beforeEach(async () => {
    ({database}=await createTestDatabase());
    await database.query(legacyTestSchema);
    await database.query(`ALTER TABLE "user" ADD COLUMN role text DEFAULT 'user';
        ALTER TABLE "user" ADD COLUMN email_verified boolean DEFAULT false;
        ALTER TABLE profiles ADD COLUMN face_verification_method text;
        ALTER TABLE profiles ADD COLUMN waitlist_status text;
        ALTER TABLE profiles ADD COLUMN waitlist_position integer;
        ALTER TABLE profiles ADD COLUMN admitted_at timestamptz;
        CREATE TABLE session(id text PRIMARY KEY,user_id text REFERENCES "user"(id),token text UNIQUE,
            expires_at timestamptz,ip_address text,user_agent text,created_at timestamptz,updated_at timestamptz);`);
    await applyQuestionnaireMigration(database,readFileSync('drizzle/0038_questionnaire_matching.sql','utf8'));
    await applyDiscoveryMigration(database,readFileSync('drizzle/0039_questionnaire_discovery.sql','utf8'));
});
afterEach(async()=>{await database.close?.();});
const enabled={enabled:true,questionnaireEnabled:true};

test('disabled demo never accesses or mutates the database',async()=>{
    const blocked={...database,transaction:async()=>{throw new Error('Must not access database');}};
    await assert.rejects(()=>createReviewDemoSession({...enabled,enabled:false},blocked),
        (error:unknown)=>error instanceof ReviewDemoError && error.code==='DEMO_LOGIN_DISABLED' && error.status===403);
    assert.equal((await database.query('SELECT count(*)::int AS count FROM "user"')).rows[0].count,0);
});
test('missing demo is provisioned with a working session and complete synthetic questionnaire profiles',async()=>{
    const result=await createReviewDemoSession(enabled,database);
    assert.equal(result.user.id,REVIEW_DEMO_ID);
    assert.equal(result.user.role,'user');
    const session=await database.query('SELECT user_id,expires_at FROM session WHERE token=$1',[result.token]);
    assert.equal(session.rows[0].user_id,REVIEW_DEMO_ID);
    assert.ok(new Date(session.rows[0].expires_at).getTime()>Date.now());
    assert.equal((await database.query('SELECT count(*)::int AS count FROM "user"')).rows[0].count,3);
    const counts=await database.query('SELECT user_id,count(*)::int AS count FROM q_answers GROUP BY user_id');
    assert.ok(counts.rows.every(row=>row.count===REQUIRED_QUESTION_IDS.length));
    const profiles=await database.query('SELECT face_verification_method,waitlist_status,is_complete FROM profiles');
    assert.ok(profiles.rows.every(row=>row.face_verification_method==='review_demo' && row.waitlist_status==='admitted' && row.is_complete));
});
test('repeat taps issue fresh sessions without duplicating profiles or overwriting saved answers',async()=>{
    const first=await createReviewDemoSession(enabled,database);
    await database.query("UPDATE q_answers SET explanation='A reviewer edit' WHERE user_id=$1 AND question_id=$2",[REVIEW_DEMO_ID,REQUIRED_QUESTION_IDS[0]]);
    const before=(await database.query('SELECT revision FROM q_state WHERE user_id=$1',[REVIEW_DEMO_ID])).rows[0].revision;
    const second=await createReviewDemoSession(enabled,database);
    assert.notEqual(first.token,second.token);
    assert.equal((await database.query('SELECT count(*)::int AS count FROM profiles')).rows[0].count,3);
    assert.equal((await database.query('SELECT revision FROM q_state WHERE user_id=$1',[REVIEW_DEMO_ID])).rows[0].revision,before);
    assert.equal((await database.query('SELECT explanation FROM q_answers WHERE user_id=$1 AND question_id=$2',[REVIEW_DEMO_ID,REQUIRED_QUESTION_IDS[0]])).rows[0].explanation,'A reviewer edit');
});
test('an email collision cannot sign reviewers into an unrelated account',async()=>{
    await database.query(`INSERT INTO "user"(id,name,email,role) VALUES('real-user','Real user','datesdemo@test.com','admin')`);
    await assert.rejects(()=>createReviewDemoSession(enabled,database),ReviewDemoError);
    assert.equal((await database.query('SELECT count(*)::int AS count FROM session')).rows[0].count,0);
    assert.equal((await database.query('SELECT count(*)::int AS count FROM "user"')).rows[0].count,1);
});
test('an admin or suspended demo identity is never granted a reviewer session',async()=>{
    await database.query(`INSERT INTO "user"(id,name,email,role,deleted_reason) VALUES($1,'Demo','datesdemo@test.com','user','admin_suspended')`,[REVIEW_DEMO_ID]);
    await assert.rejects(()=>createReviewDemoSession(enabled,database),ReviewDemoError);
    await database.query(`UPDATE "user" SET role='admin',deleted_reason=NULL WHERE id=$1`,[REVIEW_DEMO_ID]);
    await assert.rejects(()=>createReviewDemoSession(enabled,database),ReviewDemoError);
    assert.equal((await database.query('SELECT count(*)::int AS count FROM session')).rows[0].count,0);
});
test('missing catalogue rolls back provisioning, rather than issuing an unusable session',async()=>{
    await database.query('UPDATE q_questions SET published=false WHERE id=$1',[REQUIRED_QUESTION_IDS[0]]);
    await assert.rejects(()=>createReviewDemoSession(enabled,database),ReviewDemoError);
    assert.equal((await database.query('SELECT count(*)::int AS count FROM "user"')).rows[0].count,0);
    assert.equal((await database.query('SELECT count(*)::int AS count FROM session')).rows[0].count,0);
});
