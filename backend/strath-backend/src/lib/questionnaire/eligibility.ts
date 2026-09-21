import { ageOn, type Preferences } from "./contracts";
export type Candidate = {id:string;revision:number;birth_date:string|null;preferences:Preferences|null;answer_count:number;profile:Record<string,unknown>;deleted_at:unknown;incoming_like:boolean};
function distance(a:Preferences,b:Preferences){
 if(a.latitude===null||a.longitude===null||b.latitude===null||b.longitude===null)return Infinity;
 const rad=(n:number)=>n*Math.PI/180;
 const dlat=rad(b.latitude-a.latitude),dlon=rad(b.longitude-a.longitude);
 const h=Math.sin(dlat/2)**2+Math.cos(rad(a.latitude))*Math.cos(rad(b.latitude))*Math.sin(dlon/2)**2;
 return 6371*2*Math.asin(Math.sqrt(Math.min(1,h)));
}
export function ready(p:Candidate){
 const age=ageOn(p.birth_date??"");
 return !p.deleted_at && age>=18 && age<=120 && p.answer_count>=20 && !!p.preferences &&
  (p.profile.profile_completed===true||p.profile.is_complete===true) && p.profile.is_visible===true &&
  p.profile.discovery_paused!==true && p.profile.anonymous!==true && p.profile.face_verification_status==='verified';
}
export function eligible(a:Candidate,b:Candidate){
 if(a.id===b.id||!ready(a)||!ready(b))return false;
 const ap=a.preferences!,bp=b.preferences!,aa=ageOn(a.birth_date!),ba=ageOn(b.birth_date!);
 if(!ap.genders.includes(String(b.profile.gender) as 'male')||!bp.genders.includes(String(a.profile.gender) as 'male'))return false;
 if(ba<ap.minAge||ba>ap.maxAge||aa<bp.minAge||aa>bp.maxAge)return false;
 // Incognito appears only to recipients of that person's like. Never infer visibility.
 if((b.profile.incognito_mode===true||b.profile.visibility_mode==='incognito')&&!b.incoming_like)return false;
 const d=distance(ap,bp);
 for(const [x,y] of [[ap,bp],[bp,ap]]){
  if(x.radiusKm!==null ? d>x.radiusKm : x.city.trim().toLowerCase()!==y.city.trim().toLowerCase())return false;
 }
 return true;
}
export function card(p:Candidate){
 return {id:p.id,name:String(p.profile.first_name||'Member'),age:ageOn(p.birth_date??''),gender:p.profile.gender,city:p.preferences?.city??'',intentions:p.preferences?.intentions??[],bio:String(p.profile.about_me||p.profile.bio||''),photos:Array.isArray(p.profile.photos)?p.profile.photos.filter((x):x is string=>typeof x==='string'):[],verified:p.profile.face_verification_status==='verified'};
}
