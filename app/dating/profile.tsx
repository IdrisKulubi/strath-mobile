import React from 'react';
import { useRouter } from 'expo-router';
import { useQuestionnaire,type State } from '@/lib/questionnaire';
import { clearSession } from '@/lib/auth-helpers';
import { useQueryClient } from '@tanstack/react-query';
import { Page,Copy,Action,Feedback } from '@/components/questionnaire/ui';
export default function Profile(){const router=useRouter(),client=useQueryClient(),q=useQuestionnaire<State>('status');return <Page title="Your profile"><Copy>{q.data?.count??0} questions answered. Your answers are private unless you choose to publish them.</Copy><Feedback error={q.error}/><Action label="Edit profile and preferences" onPress={()=>router.push('/dating-setup' as never)}/><Action label="Answer and manage questions" onPress={()=>router.push('/questions' as never)}/><Action label="Face verification" onPress={()=>router.push('/verification')}/><Action label="Privacy and safety settings" onPress={()=>router.push('/settings')}/><Action label="Sign out" onPress={()=>{void clearSession().then(()=>{client.clear();router.replace('/(auth)/login');});}}/></Page>;}
