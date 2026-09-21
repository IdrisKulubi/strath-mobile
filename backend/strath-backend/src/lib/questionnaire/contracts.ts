import { z } from "zod";
export const ALGORITHM = "questionnaire-v1";
export const answerInput = z.object({questionId:z.string().min(1).max(100),answerId:z.string().min(1),acceptable:z.array(z.string()).min(1).max(20),weight:z.union([z.literal(0),z.literal(1),z.literal(10),z.literal(50),z.literal(250)]),public:z.boolean().default(false),explanation:z.string().max(500).default(""),revision:z.number().int().nonnegative()}).strict();
export const preferenceInput = z.object({birthDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),genders:z.array(z.enum(["male","female","other"])).min(1).max(3),minAge:z.number().int().min(18).max(100),maxAge:z.number().int().min(18).max(100),city:z.string().trim().min(1).max(100),radiusKm:z.number().min(1).max(500).nullable().default(null),latitude:z.number().min(-90).max(90).nullable().default(null),longitude:z.number().min(-180).max(180).nullable().default(null),intentions:z.array(z.string().min(1).max(60)).min(1).max(5)}).strict().refine(p=>p.minAge<=p.maxAge,"Invalid age range").refine(p=>p.radiusKm===null || (p.latitude!==null && p.longitude!==null),"Radius requires location coordinates");
export type Preferences = z.infer<typeof preferenceInput>;
export const scoreSchema = z.object({candidateId:z.string(),viewerRevision:z.number().int(),candidateRevision:z.number().int(),algorithmVersion:z.literal(ALGORITHM),status:z.enum(["ready","insufficient_evidence"]),score:z.number().min(0).max(100).nullable(),sharedCount:z.number().int().nonnegative(),evidenceCount:z.number().int().nonnegative()}).strict().refine(s=>s.evidenceCount<=s.sharedCount && (s.status==='ready' ? s.score!==null && s.evidenceCount>=10 : s.score===null));
export type Score = z.infer<typeof scoreSchema>;
export type EnginePerson = {id:string;revision:number;answers:{questionVersionId:string;answerId:string;acceptableAnswerIds:string[];weight:number}[]};
export function ageOn(dob:string, now=new Date()):number {
 if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return -1;
 const d=new Date(dob+'T00:00:00Z');
 if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0,10)!==dob) return -1;
 return now.getUTCFullYear()-d.getUTCFullYear()-(now.getUTCMonth()<d.getUTCMonth() || (now.getUTCMonth()===d.getUTCMonth() && now.getUTCDate()<d.getUTCDate()) ? 1:0);
}
export function publicScore(s:Score) { return {status:s.status,score:s.score,sharedCount:s.sharedCount,evidenceCount:s.evidenceCount}; }
export function sortScores(a:Score,b:Score) { return Number(a.score===null)-Number(b.score===null) || (b.score??0)-(a.score??0) || b.evidenceCount-a.evidenceCount || (a.candidateId<b.candidateId?-1:a.candidateId>b.candidateId?1:0); }
