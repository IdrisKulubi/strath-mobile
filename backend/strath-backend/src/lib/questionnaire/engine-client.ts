import { z } from "zod";
import { scoreSchema, type EnginePerson, type Score } from "./contracts";
export async function rank(viewer:EnginePerson,candidates:EnginePerson[]):Promise<Score[]> {
 const base=process.env.MATCHING_SERVICE_URL, secret=process.env.MATCHING_SERVICE_SECRET;
 if (!base || !secret) throw new Error("Matching service unavailable");
 const url=new URL(base);
 if (url.protocol!=="https:" && !(process.env.NODE_ENV!=="production" && ["localhost","127.0.0.1"].includes(url.hostname))) throw new Error("Matching service requires HTTPS");
 for(let attempt=0;attempt<2;attempt++) {
  try {
   const res=await fetch(new URL('/v1/rank',url),{method:"POST",headers:{Authorization:`Bearer ${secret}`,"Content-Type":"application/json"},body:JSON.stringify({viewer,candidates}),signal:AbortSignal.timeout(5000),cache:"no-store"});
   if(!res.ok) throw new Error("Matching service unavailable");
   const data=z.object({results:z.array(scoreSchema)}).strict().parse(await res.json());
   if(data.results.length!==candidates.length || new Set(data.results.map(x=>x.candidateId)).size!==candidates.length) throw new Error("Invalid engine response");
   for(const result of data.results) {
    const c=candidates.find(c=>c.id===result.candidateId);
    if(!c || result.viewerRevision!==viewer.revision || result.candidateRevision!==c.revision) throw new Error("Invalid engine revision");
   }
   return data.results;
  } catch { if(attempt===1) throw new Error("Matching service unavailable"); }
 }
 throw new Error("Matching service unavailable");
}
