import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCurrentUserId } from '@/lib/auth-helpers';
import { apiFetch } from '@/lib/api-client';
export type Experience={collection:boolean;matching:boolean;shell:boolean};
export type Compatibility={status:'ready'|'insufficient_evidence';score:number|null;sharedCount:number;evidenceCount:number};
export type Person={id:string;name:string;age:number;gender:string;city:string;bio:string;photos:string[];intentions:string[];compatibility?:Compatibility};
export type Preferences={birthDate:string;genders:string[];minAge:number;maxAge:number;city:string;radiusKm:number|null;latitude:number|null;longitude:number|null;intentions:string[]};
export type State={count:number;required:number;complete:boolean;revision:number;birth_date:string|null;preferences:Preferences|null;skipped:string[]};
export type Question={id:string;prompt:string;category:string;sensitive:boolean;options:{id:string;label:string}[];answer_id:string|null;acceptable:string[]|null;weight:number|null;public:boolean|null;explanation:string|null};
const prefix='/api/v2/questionnaire/';
export function useIdentity(){return useQuery({queryKey:['questionnaire-identity'],queryFn:getCurrentUserId,staleTime:0});}
export function useQuestionnaire<T>(resource:string,enabled=true){
 const identity=useIdentity();
 return useQuery({queryKey:['questionnaire',identity.data,resource],queryFn:()=>apiFetch<T>(prefix+resource),enabled:enabled&&!!identity.data,retry:false,staleTime:10000});
}
export function useExperience(){return useQuestionnaire<Experience>('experience');}
export function useQuestionnaireMutation<T=unknown>(resource:string,method='POST'){
 const client=useQueryClient();
 return useMutation({mutationFn:(body:Record<string,unknown>)=>apiFetch<T>(prefix+resource,{method,body}),onSuccess:()=>{client.invalidateQueries({queryKey:['questionnaire']});client.invalidateQueries({queryKey:['profile']});}});
}
export const compatibilityLabel=(c?:Compatibility)=>c?.score!=null?`${Math.round(c.score)}% compatible · ${c.sharedCount} shared answers`:'Answer more questions to compare';
