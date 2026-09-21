import React,{useEffect} from 'react';
import { Redirect,usePathname } from 'expo-router';
import { useExperience,useIdentity } from '@/lib/questionnaire';
import { Page,Loading,Feedback,Action } from './ui';
export function QuestionnaireRouteGate({children}:{children:React.ReactNode}){
 const path=usePathname(),identity=useIdentity(),q=useExperience();
 useEffect(()=>{void identity.refetch();},[path]);
 if(!identity.data)return <>{children}</>;
 if(q.isPending)return <Page title="Strathspace"><Loading/></Page>;
 // Network failure must not render a legacy workflow for a migrated user.
 if(q.isError)return <Page title="Strathspace"><Feedback error={q.error}/><Action label="Try again" onPress={()=>q.refetch()}/></Page>;
 if(!q.data?.shell)return <>{children}</>;
 const allowed=['/dating','/questions','/compatibility/','/verification','/legal','/settings','/app-feedback'];
 if(!allowed.some(x=>path===x||path.startsWith(x.endsWith('/')?x:x+'/'))&&!path.startsWith('/dating-setup')&&!path.startsWith('/dating-chat/')){
  const legacyChat=path.match(/^\/chat\/([^/]+)$/);
  return <Redirect href={(legacyChat?`/dating-chat/${legacyChat[1]}`:'/dating') as never}/>;
 }
 return <>{children}</>;
}
