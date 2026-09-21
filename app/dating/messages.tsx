import React from 'react';
import { useRouter } from 'expo-router';
import { useQuestionnaire } from '@/lib/questionnaire';
import { Page,Copy,Action,Feedback,Loading } from '@/components/questionnaire/ui';
export default function Messages(){const router=useRouter(),q=useQuestionnaire<{items:{id:string;name:string;last_message:string|null;unread:number}[]}>('connections');return <Page title="Messages">{q.isPending&&<Loading/>}<Feedback error={q.error}/>{q.isError&&<Action label="Try again" onPress={()=>q.refetch()}/>} {q.data?.items.length===0&&<Copy>Your conversations will appear here after a mutual like.</Copy>}{q.data?.items.map(c=><Action key={c.id} label={`${c.name}${c.unread?` · ${c.unread} unread`:''}
${c.last_message??'Say hello'}`} onPress={()=>router.push(`/dating-chat/${c.id}` as never)}/>)}</Page>;}
