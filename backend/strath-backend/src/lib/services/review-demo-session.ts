import { randomUUID } from 'node:crypto';
import type { QueryResultRow } from 'pg';
import { NEUTRAL_ANSWER_IDS, REQUIRED_QUESTION_IDS } from '../questionnaire/contracts';
import { transaction, type QuestionnaireDatabase, type SqlExecutor } from '../questionnaire/db';

export const REVIEW_DEMO_ID = 'demo-dates-main';
export const REVIEW_DEMO_PREFIX = 'demo-dates-';
const ACCOUNTS = [
    { id: REVIEW_DEMO_ID, email: 'datesdemo@test.com', name: 'Review Demo', gender: 'male' },
    { id: 'demo-dates-review-one', email: 'review-one@strathspace.example.invalid', name: 'Alex (Demo)', gender: 'female' },
    { id: 'demo-dates-review-two', email: 'review-two@strathspace.example.invalid', name: 'Sam (Demo)', gender: 'male' },
] as const;
export class ReviewDemoError extends Error {
    constructor(public readonly code: string, message: string, public readonly status: number) { super(message); }
}

type DemoUser = QueryResultRow & { id: string; name: string; email: string; role: string | null; deleted_at: Date | null; deleted_reason: string | null };
async function prepareAccount(executor: SqlExecutor, account: typeof ACCOUNTS[number], questionnaireEnabled: boolean) {
    // Never sign in as a user found only by the demo email, or elevate reviewer access.
    await executor.query(`INSERT INTO "user"(id,name,email,role,email_verified)
        VALUES($1,$2,$3,'user',true) ON CONFLICT DO NOTHING`, [account.id, account.name, account.email]);
    const { rows } = await executor.query<DemoUser>(`SELECT id,name,email,role,deleted_at,deleted_reason FROM "user"
        WHERE id=$1 OR email=$2 FOR UPDATE`, [account.id, account.email]);
    const user = rows.find(row => row.id === account.id && row.email === account.email);
    if (!user || rows.length !== 1 || (user.role ?? 'user') !== 'user' || user.deleted_at || user.deleted_reason) {
        throw new ReviewDemoError('DEMO_ACCOUNT_UNAVAILABLE', 'The review demo account is unavailable. Please contact support.', 503);
    }
    const photo = `https://api.dicebear.com/9.x/adventurer/png?seed=${account.id}`;
    const bio = 'App review demo profile. These are sample details for exploring StrathSpace.';
    // The user row lock serializes concurrent provisioning even without a unique profile-user constraint.
    await executor.query(`INSERT INTO profiles(id,user_id,first_name,gender,age,bio,about_me,photos,profile_photo,
        profile_completed,is_complete,is_visible,face_verification_status,face_verified_at,face_verification_method,
        waitlist_status,admitted_at,university)
        SELECT $1,$2,$3,$4,27,$5,$5,$6::json,$7,true,true,true,'verified',now(),'review_demo','admitted',now(),'Demo university'
        WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE user_id=$2)`,
    [randomUUID(), account.id, account.name, account.gender, bio, JSON.stringify([photo]), photo]);
    // Repair only reserved synthetic reviewer profiles; never alter normal-account eligibility.
    await executor.query(`UPDATE profiles SET profile_completed=true,is_complete=true,is_visible=true,
        discovery_paused=false,anonymous=false,face_verification_status='verified',
        face_verified_at=coalesce(face_verified_at,now()),face_verification_method='review_demo',
        waitlist_status='admitted',waitlist_position=NULL,admitted_at=coalesce(admitted_at,now()),
        photos=(CASE WHEN photos IS NULL OR jsonb_array_length(photos::jsonb)=0 THEN $2::text ELSE photos::text END)::json,
        updated_at=now() WHERE user_id=$1`, [account.id, JSON.stringify([photo])]);
    if (!questionnaireEnabled) return user;
    const { rows: questions } = await executor.query<{ id: string; options: { id: string }[] } & QueryResultRow>(
        'SELECT id,options FROM q_questions WHERE published AND id=ANY($1::text[])', [REQUIRED_QUESTION_IDS]);
    if (questions.length !== REQUIRED_QUESTION_IDS.length) {
        throw new ReviewDemoError('DEMO_SETUP_UNAVAILABLE', 'Review demo setup is temporarily unavailable. Please try again shortly.', 503);
    }
    const answers = questions.map(question => {
        const substantive = question.options.filter(option => option.id !== NEUTRAL_ANSWER_IDS[question.id]).map(option => option.id);
        if (!substantive.length) throw new ReviewDemoError('DEMO_SETUP_UNAVAILABLE', 'Review demo setup is temporarily unavailable.', 503);
        return { questionId: question.id, answerId: substantive[0], acceptable: substantive };
    });
    const preferences = { genders: ['male','female','other'], minAge:18, maxAge:40, city:'Nairobi', radiusKm:null,
        latitude:null,longitude:null,intentions:['Long-term relationship'] };
    await executor.query(`INSERT INTO q_state(user_id,revision,birth_date,preferences,started_at)
        VALUES($1,0,'1999-01-01',$2::jsonb,now()) ON CONFLICT(user_id) DO UPDATE
        SET birth_date=coalesce(q_state.birth_date,excluded.birth_date),preferences=coalesce(q_state.preferences,excluded.preferences),
        started_at=coalesce(q_state.started_at,excluded.started_at)`, [account.id, JSON.stringify(preferences)]);
    const inserted = await executor.query(`INSERT INTO q_answers(user_id,question_id,answer_id,acceptable,weight,public,explanation)
        SELECT $1,a."questionId",a."answerId",a.acceptable,10,true,'' FROM jsonb_to_recordset($2::jsonb)
        AS a("questionId" text,"answerId" text,acceptable jsonb) ON CONFLICT(user_id,question_id) DO NOTHING RETURNING question_id`,
    [account.id, JSON.stringify(answers)]);
    if (inserted.rows.length) {
        await executor.query('UPDATE q_state SET revision=revision+1,completed_at=coalesce(completed_at,now()),updated_at=now() WHERE user_id=$1', [account.id]);
        await executor.query('DELETE FROM q_compatibility_cache WHERE user_a=$1 OR user_b=$1', [account.id]);
    }
    return user;
}

export async function createReviewDemoSession(input: { enabled: boolean; questionnaireEnabled: boolean; ipAddress?: string | null; userAgent?: string | null }, database?: QuestionnaireDatabase) {
    if (!input.enabled) throw new ReviewDemoError('DEMO_LOGIN_DISABLED', 'Demo login is currently disabled.', 403);
    const work = async (executor: SqlExecutor) => {
        if (input.questionnaireEnabled) {
            const tables = ['q_state','q_questions','q_answers','q_compatibility_cache'];
            const presence = await executor.query<{ present: boolean } & QueryResultRow>(
                'SELECT to_regclass(name) IS NOT NULL AS present FROM unnest($1::text[]) AS name', [tables]);
            if (presence.rows.some(row => !row.present)) throw new ReviewDemoError('DEMO_SETUP_UNAVAILABLE', 'Review demo setup is temporarily unavailable.', 503);
        }
        let main: DemoUser | undefined;
        for (const account of input.questionnaireEnabled ? ACCOUNTS : [ACCOUNTS[0]]) {
            const prepared = await prepareAccount(executor, account, input.questionnaireEnabled);
            if (account.id === REVIEW_DEMO_ID) main = prepared;
        }
        if (!main) throw new Error('Review demo account was not prepared');
        const token = randomUUID();
        const expiresAt = new Date(Date.now() + 30*24*60*60*1000);
        await executor.query(`INSERT INTO session(id,user_id,token,expires_at,ip_address,user_agent,created_at,updated_at)
            VALUES($1,$2,$3,$4,$5,$6,now(),now())`, [randomUUID(),main.id,token,expiresAt,input.ipAddress ?? null,input.userAgent ?? 'strathspace-review-demo']);
        return { token, user: { id:main.id,name:main.name,email:main.email,role:'user' }, expiresAt:expiresAt.toISOString() };
    };
    return database ? database.transaction(work) : transaction(work);
}
