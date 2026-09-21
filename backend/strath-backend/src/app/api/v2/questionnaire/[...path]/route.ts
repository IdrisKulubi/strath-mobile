import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSessionWithBearerFallback } from "@/lib/security";
import { flags } from "@/lib/questionnaire/flags";
import { query } from "@/lib/questionnaire/db";
import * as service from "@/lib/questionnaire/service";
export const dynamic="force-dynamic";
async function handle(req:NextRequest,{params}:{params:Promise<{path:string[]}>}){
 try{
  const session=await getSessionWithBearerFallback(req);
  if(!session?.user?.id)return NextResponse.json({error:'Authentication required',code:'UNAUTHENTICATED'},{status:401});
  const id=session.user.id, f=flags(id), {path}=await params, resource=path[0];
  if(resource==='experience'){
   if(f.shell)await query('INSERT INTO q_state(user_id,enrolled) VALUES($1,true) ON CONFLICT(user_id) DO UPDATE SET enrolled=true',[id]);
   return NextResponse.json(f);
  }
  if(process.env.QUESTIONNAIRE_SCHEMA_READY!=='true')return NextResponse.json({error:'Not available'},{status:404});
  const [account]=await query('SELECT deleted_at FROM "user" WHERE id=$1',[id]);
  if(!account||account.deleted_at)return NextResponse.json({error:'Account unavailable'},{status:403});
  // Connections survive feature rollback and never inherit date/payment gates.
  if(!['connections','unmatch','block','report'].includes(resource)&&!f.collection)return NextResponse.json({error:'Questionnaire unavailable'},{status:404});
  if(['discovery','comparison','decisions','likes'].includes(resource)&&!f.matching)return NextResponse.json({error:'Matching is temporarily unavailable',retryable:true},{status:503});
  if(req.method==='GET'){
   if(resource==='status')return NextResponse.json(await service.status(id));
   if(resource==='profile')return NextResponse.json(await service.ownProfile(id));
   if(resource==='questions')return NextResponse.json(await service.questions(id));
   if(resource==='discovery'){
    const page=Number(req.nextUrl.searchParams.get('page')??0);
    if(!Number.isInteger(page)||page<0||page>500)throw new service.DomainError('Invalid page');
    return NextResponse.json(await service.discovery(id,page));
   }
   if(resource==='comparison'&&path[1])return NextResponse.json(await service.comparison(id,path[1]));
   if(resource==='likes')return NextResponse.json(await service.likes(id));
   if(resource==='connections')return NextResponse.json(await service.connections(id));
  }
  // Enforce byte limits even if Content-Length is missing.
  const reader=req.body?.getReader();let bytes=0,text='';const decoder=new TextDecoder();
  if(reader)while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>32768){await reader.cancel();throw new service.DomainError('Request too large',413);}text+=decoder.decode(value,{stream:true});}
  text+=decoder.decode();
  let body:unknown;try{body=JSON.parse(text||'{}');}catch{throw new service.DomainError('Invalid JSON');}
  if(req.method==='PUT'&&resource==='answers')return NextResponse.json(await service.saveAnswer(id,body));
  if(req.method==='DELETE'&&resource==='answers')return NextResponse.json(await service.deleteAnswer(id,body));
  if(req.method==='PUT'&&resource==='preferences')return NextResponse.json(await service.preferences(id,body));
  if(req.method==='PUT'&&resource==='profile')return NextResponse.json(await service.saveProfile(id,body));
  if(req.method==='POST'&&resource==='skip')return NextResponse.json(await service.skipQuestion(id,body));
  if(req.method==='POST'&&resource==='decisions')return NextResponse.json(await service.decision(id,body));
  if(req.method==='POST'&&resource==='unmatch')return NextResponse.json(await service.unmatch(id,body));
  if(req.method==='POST'&&(resource==='block'||resource==='report'))return NextResponse.json(await service.safety(id,body,resource));
  return NextResponse.json({error:'Not found'},{status:404});
 }catch(e){
  const code=e instanceof service.DomainError?e.status:e instanceof ZodError?400:500;
  // Never log answer bodies, validation payloads or database error values.
  return NextResponse.json({error:e instanceof service.DomainError?e.message:e instanceof ZodError?'Please check your selections.':'Unable to complete the request.',retryable:code>=500},{status:code});
 }
}
export const GET=handle,POST=handle,PUT=handle,DELETE=handle;
