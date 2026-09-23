import { randomUUID } from "node:crypto";
import type { SqlExecutor } from "./db";
import { z } from "zod";
import { query, transaction } from "./db";
import { ageOn, ALGORITHM, answerInput, preferenceInput, publicScore, scoreSchema, sortScores, type EnginePerson, type Score } from "./contracts";
import { card, eligible, ready, type Candidate } from "./eligibility";
import { rank } from "./engine-client";

export class DomainError extends Error { constructor(message:string,public status=400){super(message);} }
const idSchema=z.string().min(1).max(128);
async function ensureState(id:string,c?:SqlExecutor){await query('INSERT INTO q_state(user_id) VALUES($1) ON CONFLICT DO NOTHING',[id],c);}
export async function status(id:string){
 await ensureState(id);
 const [s]=await query<{revision:number;birth_date:string|null;preferences:import("./contracts").Preferences|null;skipped:string[];count:number}>(`SELECT revision,birth_date::text,preferences,skipped,(SELECT count(*)::int FROM q_answers a JOIN q_questions q ON q.id=a.question_id AND q.published WHERE a.user_id=s.user_id) AS count FROM q_state s WHERE user_id=$1`,[id]);
 return {...s,required:20,complete:s.count>=20};
}
export async function questions(id:string){
 const s=await status(id);
 const rows=await query(`SELECT q.id,q.prompt,q.options,q.category_id AS category,q.sensitive,a.answer_id,a.acceptable,a.weight,a.public,a.explanation FROM q_questions q LEFT JOIN q_answers a ON a.question_id=q.id AND a.user_id=$1 WHERE q.published ORDER BY q.position`,[id]);
 return {questions:rows,state:s};
}
export async function saveAnswer(id:string,body:unknown){
 const b=answerInput.parse(body);
 return transaction(async c=>{
  await ensureState(id,c);
  const [s]=await query('SELECT revision FROM q_state WHERE user_id=$1 FOR UPDATE',[id],c);
  if(s.revision!==b.revision)throw new DomainError('Your answers changed on another device. Reload before saving.',409);
  const [q]=await query('SELECT options FROM q_questions WHERE id=$1 AND published',[b.questionId],c);
  if(!q)throw new DomainError('Question is no longer available',404);
  const options=(q.options as {id:string}[]).map(x=>x.id);
  if(!options.includes(b.answerId)||b.acceptable.some(x=>!options.includes(x)))throw new DomainError('Choose answers from this question');
  await query(`INSERT INTO q_answers(user_id,question_id,answer_id,acceptable,weight,public,explanation) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(user_id,question_id) DO UPDATE SET answer_id=$3,acceptable=$4,weight=$5,public=$6,explanation=$7,updated_at=now()`,[id,b.questionId,b.answerId,JSON.stringify([...new Set(b.acceptable)]),b.weight,b.public,b.explanation],c);
  await query('UPDATE q_state SET revision=revision+1,updated_at=now() WHERE user_id=$1',[id],c);
  await query('DELETE FROM q_cache WHERE user_a=$1 OR user_b=$1',[id],c);
  return {saved:true,revision:s.revision+1};
 });
}
export async function deleteAnswer(id:string,body:unknown){
 const b=z.object({questionId:z.string(),revision:z.number().int()}).strict().parse(body);
 return transaction(async c=>{
  await ensureState(id,c);
  const [s]=await query('SELECT revision FROM q_state WHERE user_id=$1 FOR UPDATE',[id],c);
  if(s.revision!==b.revision)throw new DomainError('Reload your answers before deleting.',409);
  await query('DELETE FROM q_answers WHERE user_id=$1 AND question_id=$2',[id,b.questionId],c);
  await query('UPDATE q_state SET revision=revision+1,updated_at=now() WHERE user_id=$1',[id],c);
  await query('DELETE FROM q_cache WHERE user_a=$1 OR user_b=$1',[id],c);
  return {deleted:true};
 });
}
export async function skipQuestion(id:string,body:unknown){
 const b=z.object({questionId:z.string().max(100)}).strict().parse(body);
 await ensureState(id);
 await query(`UPDATE q_state SET skipped=(SELECT coalesce(jsonb_agg(DISTINCT x),'[]') FROM jsonb_array_elements(skipped||jsonb_build_array($2::text)) x),updated_at=now() WHERE user_id=$1`,[id,b.questionId]);
 return {saved:true};
}
export async function preferences(id:string,body:unknown){
 const b=preferenceInput.parse(body);
 if(ageOn(b.birthDate)<18||ageOn(b.birthDate)>120)throw new DomainError('You must be at least 18. Enter a valid date of birth.');
 return transaction(async c=>{
  await ensureState(id,c);
  await query('UPDATE q_state SET birth_date=$2,preferences=$3,revision=revision+1,updated_at=now() WHERE user_id=$1',[id,b.birthDate,JSON.stringify(b)],c);
  await query('DELETE FROM q_cache WHERE user_a=$1 OR user_b=$1',[id],c);
  return {saved:true};
 });
}
export async function candidates(viewer:string,only?:string,c?:SqlExecutor):Promise<Candidate[]>{
 return query<Candidate>(`SELECT u.id,u.deleted_at,s.revision,s.birth_date::text,s.preferences,jsonb_build_object('first_name',p.first_name,'gender',p.gender,'about_me',p.about_me,'bio',p.bio,'photos',p.photos,'profile_completed',p.profile_completed,'is_complete',p.is_complete,'is_visible',p.is_visible,'discovery_paused',p.discovery_paused,'anonymous',p.anonymous,'face_verification_status',p.face_verification_status,'incognito_mode',p.incognito_mode,'visibility_mode',p.visibility_mode) AS profile,
 (SELECT count(*)::int FROM q_answers a JOIN q_questions q ON q.id=a.question_id AND q.published WHERE a.user_id=u.id) AS answer_count,
 EXISTS(SELECT 1 FROM q_decisions d WHERE d.actor_id=u.id AND d.target_id=$1 AND d.decision='like') AS incoming_like
 FROM "user" u JOIN profiles p ON p.user_id=u.id JOIN q_state s ON s.user_id=u.id
 WHERE ($2::text IS NULL OR u.id=$2) AND NOT EXISTS(SELECT 1 FROM blocks b WHERE (b.blocker_id=$1 AND b.blocked_id=u.id) OR (b.blocked_id=$1 AND b.blocker_id=u.id))
 ORDER BY u.id LIMIT 10001`,[viewer,only??null],c);
}
async function pair(id:string,target:string,c?:SqlExecutor){
 if(id===target)throw new DomainError('Choose another profile');
 const [a]=await candidates(id,id,c),[b]=await candidates(id,target,c);
 if(!a||!b||!eligible(a,b))throw new DomainError('This profile is unavailable',404);
 return {a,b};
}
async function people(rows:Candidate[]):Promise<EnginePerson[]>{
 if(!rows.length)return [];
 const answers=await query(`SELECT a.* FROM q_answers a JOIN q_questions q ON q.id=a.question_id AND q.published WHERE a.user_id=ANY($1::text[])`,[rows.map(r=>r.id)]);
 return rows.map(r=>({id:r.id,revision:r.revision,answers:answers.filter(a=>a.user_id===r.id).map(a=>({questionVersionId:a.question_id,answerId:a.answer_id,acceptableAnswerIds:a.acceptable,weight:a.weight}))}));
}
async function scores(viewer:Candidate,rows:Candidate[]):Promise<Score[]>{
 const ids=rows.map(r=>r.id);
 const cache=await query('SELECT * FROM q_cache WHERE (user_a=$1 AND user_b=ANY($2::text[])) OR (user_b=$1 AND user_a=ANY($2::text[]))',[viewer.id,ids]);
 const found:Score[]=[];const missing:Candidate[]=[];
 for(const r of rows){
  const entry=cache.find(x=>x.user_a===[viewer.id,r.id].sort()[0]&&x.user_b===[viewer.id,r.id].sort()[1]);
  const forward=entry?.user_a===viewer.id;
  const parsed=scoreSchema.safeParse(entry?.result);
  if(entry?.algorithm===ALGORITHM&&(forward?entry.revision_a:entry.revision_b)===viewer.revision&&(forward?entry.revision_b:entry.revision_a)===r.revision&&parsed.success){found.push({...parsed.data,candidateId:r.id,viewerRevision:viewer.revision,candidateRevision:r.revision});}else missing.push(r);
 }
 if(missing.length){
  const [v]=await people([viewer]);
  for(let i=0;i<missing.length;i+=100){
   const batch=await people(missing.slice(i,i+100));
   let result:Score[];
   try{result=await rank(v,batch);}catch{throw new DomainError('Matching is temporarily unavailable. Please try again.',503);}
   for(const s of result){
    const [a,b]=[viewer.id,s.candidateId].sort();
    await query(`INSERT INTO q_cache(user_a,user_b,revision_a,revision_b,algorithm,result) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(user_a,user_b) DO UPDATE SET revision_a=$3,revision_b=$4,algorithm=$5,result=$6,updated_at=now()`,[a,b,a===viewer.id?viewer.revision:s.candidateRevision,b===viewer.id?viewer.revision:s.candidateRevision,ALGORITHM,JSON.stringify(s)]);
   }
   found.push(...result);
  }
 }
 return found.sort(sortScores);
}
export async function discovery(id:string,page=0){
 const started=Date.now();
 const all=await candidates(id);
 if(all.length>10000)throw new DomainError('Discovery is temporarily at capacity. Please try again.',503);
 const viewer=all.find(x=>x.id===id);
 if(!viewer||!ready(viewer))throw new DomainError('Complete your profile, preferences, face verification and 20 answers to discover people.',428);
 const hidden=await query(`SELECT target_id AS id FROM q_decisions WHERE actor_id=$1 UNION SELECT CASE WHEN user_a=$1 THEN user_b ELSE user_a END FROM q_connections WHERE user_a=$1 OR user_b=$1`,[id]);
 const excluded=new Set(hidden.map(x=>x.id));
 const pool=all.filter(x=>!excluded.has(x.id)&&eligible(viewer,x));
 const ranked=await scores(viewer,pool);
 // Reload after engine I/O. Do not return results from an answer revision that changed mid-request.
 const current=await candidates(id);const now=current.find(x=>x.id===id);
 if(!now||now.revision!==viewer.revision)throw new DomainError('Your preferences changed. Refresh discovery.',409);
 const items=ranked.flatMap(s=>{const p=current.find(x=>x.id===s.candidateId);return p&&p.revision===s.candidateRevision&&eligible(now,p)?[{...card(p),compatibility:publicScore(s)}]:[];});
 await query('INSERT INTO q_events(user_id,event,count,duration_ms) VALUES($1,$2,$3,$4)',[id,'discovery',items.length,Date.now()-started]);
 return {items:items.slice(page*20,page*20+20),hasMore:items.length>(page+1)*20,page};
}
export async function comparison(id:string,target:string){
 const {a,b}=await pair(id,target);
 const [s]=await scores(a,[b]);
 const rows=await query(`SELECT q.id,q.prompt,q.options,a.answer_id AS yours,b.answer_id AS theirs,a.explanation AS your_explanation,b.explanation AS their_explanation FROM q_answers a JOIN q_answers b ON a.question_id=b.question_id JOIN q_questions q ON q.id=a.question_id AND q.published WHERE a.user_id=$1 AND b.user_id=$2 AND a.public AND b.public ORDER BY q.position`,[id,target]);
 const fresh=await pair(id,target);
 if(fresh.a.revision!==a.revision||fresh.b.revision!==b.revision)throw new DomainError('Answers changed. Refresh this profile.',409);
 return {profile:card(b),compatibility:publicScore(s),questions:rows};
}
export async function decision(id:string,body:unknown){
 const b=z.object({targetId:idSchema,decision:z.enum(['like','pass'])}).strict().parse(body);
 return transaction(async c=>{
  const [a,target]=[id,b.targetId].sort();
  await query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[JSON.stringify([a,target])],c);
  const existing=await query('SELECT * FROM q_connections WHERE user_a=$1 AND user_b=$2',[a,target],c);
  if(existing[0]?.status==='unmatched')throw new DomainError('This connection is no longer available',409);
  await pair(id,b.targetId,c);
  if(existing[0])return {mutual:true,matchId:existing[0].match_id};
  await query(`INSERT INTO q_decisions(actor_id,target_id,decision) VALUES($1,$2,$3) ON CONFLICT(actor_id,target_id) DO UPDATE SET decision=$3`,[id,b.targetId,b.decision],c);
  const reverse=await query("SELECT 1 FROM q_decisions WHERE actor_id=$1 AND target_id=$2 AND decision='like'",[b.targetId,id],c);
  if(b.decision!=='like'||!reverse.length)return {mutual:false};
  const old=await query('SELECT id FROM matches WHERE LEAST(user1_id,user2_id)=$1 AND GREATEST(user1_id,user2_id)=$2',[a,target],c);
  const matchId=old[0]?.id??randomUUID();
  if(!old.length)await query('INSERT INTO matches(id,user1_id,user2_id) VALUES($1,$2,$3)',[matchId,a,target],c);
  await query('INSERT INTO q_connections(user_a,user_b,match_id) VALUES($1,$2,$3)',[a,target,matchId],c);
  await query("INSERT INTO q_events(user_id,event) VALUES($1,'mutual_like')",[id],c);
  return {mutual:true,matchId};
 });
}
export async function likes(id:string){
 const decisions=await query("SELECT actor_id,target_id FROM q_decisions WHERE (actor_id=$1 OR target_id=$1) AND decision='like'",[id]);
 const all=await candidates(id),viewer=all.find(x=>x.id===id);
 const existing=await query('SELECT user_a,user_b FROM q_connections WHERE user_a=$1 OR user_b=$1',[id]);
 const connected=new Set(existing.map(x=>x.user_a===id?x.user_b:x.user_a));
 const cards=(direction:'sent'|'received')=>decisions.filter(d=>direction==='sent'?d.actor_id===id:d.target_id===id).flatMap(d=>{const p=all.find(x=>x.id===(direction==='sent'?d.target_id:d.actor_id));return p&&viewer&&eligible(viewer,p)&&!connected.has(p.id)?[card(p)]:[];});
 return {sent:cards('sent'),received:cards('received')};
}
export async function connections(id:string){
 return {items:await query(`SELECT c.match_id AS id,p.first_name AS name,p.profile_photo AS photo,m.last_message_at,
 (SELECT content FROM messages WHERE match_id=c.match_id ORDER BY created_at DESC LIMIT 1) AS last_message,
 (SELECT count(*)::int FROM messages WHERE match_id=c.match_id AND sender_id<>$1 AND status<>'read') AS unread
 FROM q_connections c JOIN matches m ON m.id=c.match_id JOIN profiles p ON p.user_id=CASE WHEN c.user_a=$1 THEN c.user_b ELSE c.user_a END JOIN "user" u ON u.id=p.user_id
 WHERE (c.user_a=$1 OR c.user_b=$1) AND c.status='active' AND u.deleted_at IS NULL AND NOT EXISTS(SELECT 1 FROM blocks b WHERE (b.blocker_id=$1 AND b.blocked_id=p.user_id) OR (b.blocked_id=$1 AND b.blocker_id=p.user_id)) ORDER BY m.last_message_at DESC NULLS LAST,c.created_at DESC`,[id])};
}
export async function unmatch(id:string,body:unknown){
 const b=z.object({matchId:idSchema}).strict().parse(body);
 await query("UPDATE q_connections SET status='unmatched' WHERE match_id=$1 AND (user_a=$2 OR user_b=$2)",[b.matchId,id]);
 return {removed:true};
}
export async function chatAccess(matchId:string,id:string):Promise<boolean|undefined>{
 if(process.env.QUESTIONNAIRE_SCHEMA_READY!=='true')return undefined;
 const rows=await query(`SELECT c.status,c.origin,c.user_a,c.user_b,EXISTS(SELECT 1 FROM q_state s WHERE s.user_id=$2 AND s.enrolled) AS enrolled,EXISTS(SELECT 1 FROM blocks b WHERE (b.blocker_id=c.user_a AND b.blocked_id=c.user_b) OR (b.blocker_id=c.user_b AND b.blocked_id=c.user_a)) AS blocked,EXISTS(SELECT 1 FROM "user" u WHERE u.id IN (c.user_a,c.user_b) AND u.deleted_at IS NOT NULL) AS deleted FROM q_connections c WHERE c.match_id=$1`,[matchId,id]);
 if(!rows[0])return undefined;
 const r=rows[0];if(r.origin==='legacy'&&!r.enrolled)return undefined;return r.status==='active'&&(r.user_a===id||r.user_b===id)&&!r.blocked&&!r.deleted;
}

export async function ownProfile(id:string){
 const [p]=await query('SELECT first_name,gender,about_me,photos,profile_completed,face_verification_status FROM profiles WHERE user_id=$1',[id]);
 return {profile:p??null};
}
export async function saveProfile(id:string,body:unknown){
 const b=z.object({name:z.string().trim().min(1).max(80),gender:z.enum(['male','female','other']),bio:z.string().trim().min(10).max(1500),photos:z.array(z.string().url().max(2048)).min(1).max(6)}).strict().parse(body);
 const state=await status(id);
 if(!state.preferences||ageOn(state.birth_date??'')<18)throw new DomainError('Save your adult date of birth and preferences first');
 // Photo URLs must belong to our configured storage, never arbitrary remote hosts.
 const host=process.env.CLOUDFLARE_R2_PUBLIC_URL;
 if(!host)throw new DomainError('Photo storage is not configured',503);
 const previous=await query('SELECT photos FROM profiles WHERE user_id=$1',[id]);
 const owned=new Set<string>(previous[0]?.photos??[]);
 if(b.photos.some(url=>!owned.has(url)&&(!new URL(url).pathname.startsWith('/uploads/'+id+'/')||new URL(url).origin!==new URL(host.startsWith('http')?host:'https://'+host).origin||new URL(url).protocol!=='https:')))throw new DomainError('Upload photos using the photo picker');
 await transaction(async c=>{
  await query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['profile:'+id],c);
  const old=await query('SELECT id FROM profiles WHERE user_id=$1',[id],c);
  if(old.length)await query('UPDATE profiles SET first_name=$2,gender=$3,about_me=$4,photos=$5,profile_photo=$6,profile_completed=true,is_complete=true,age=$7,updated_at=now() WHERE user_id=$1',[id,b.name,b.gender,b.bio,JSON.stringify(b.photos),b.photos[0],ageOn(state.birth_date??'')],c);
  else await query('INSERT INTO profiles(user_id,first_name,gender,about_me,photos,profile_photo,profile_completed,is_complete,age) VALUES($1,$2,$3,$4,$5,$6,true,true,$7)',[id,b.name,b.gender,b.bio,JSON.stringify(b.photos),b.photos[0],ageOn(state.birth_date??'')],c);
 });
 return {saved:true};
}
export async function safety(id:string,body:unknown,action:'block'|'report'){
 const b=z.object({targetId:idSchema,reason:z.string().trim().min(1).max(1000).optional()}).strict().parse(body);
 if(id===b.targetId)throw new DomainError('Choose another member');
 if(action==='report'&&!b.reason)throw new DomainError('Please describe the concern');
 await transaction(async c=>{
  const [a,t]=[id,b.targetId].sort();
  await query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[JSON.stringify([a,t])],c);
  if(action==='block'){
   await query('INSERT INTO blocks(blocker_id,blocked_id) SELECT $1,$2 WHERE NOT EXISTS(SELECT 1 FROM blocks WHERE blocker_id=$1 AND blocked_id=$2)',[id,b.targetId],c);
   await query("UPDATE q_connections SET status='unmatched' WHERE user_a=$1 AND user_b=$2",[a,t],c);
  }else await query('INSERT INTO reports(reporter_id,reported_user_id,reason) VALUES($1,$2,$3)',[id,b.targetId,b.reason],c);
 });
 return {saved:true};
}
