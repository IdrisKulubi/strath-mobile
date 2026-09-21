import React from 'react';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { Action, Copy, Feedback, Loading, Notice, Page, Progress } from '@/components/questionnaire/ui';
import { clearSession } from '@/lib/auth-helpers';
import { useQuestionnaire, type QuestionnaireState } from '@/lib/questionnaire';

export default function QuestionnaireProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const status = useQuestionnaire<QuestionnaireState>('status');
  return (
    <Page title="Your profile">
      {status.isPending ? <Loading label="Loading your questionnaire progress" /> : null}
      <Feedback error={status.error} />
      {status.data ? (
        <>
          <Progress value={Math.min(status.data.answerCount, 20)} total={20} label={`${status.data.answerCount} answers saved`} />
          <Copy muted>Your answers are private unless you publish them.</Copy>
          {status.data.complete ? <Notice tone="success">Questionnaire complete. You can edit or add answers at any time.</Notice> : null}
        </>
      ) : null}
      <Action label="Edit profile and preferences" tone="primary" onPress={() => router.push('/dating-setup' as never)} />
      <Action label="Answer and manage questions" onPress={() => router.push('/questions' as never)} />
      <Action label="Face verification" onPress={() => router.push({ pathname: '/verification', params: { returnTo: '/dating/profile' } })} />
      <Action label="Privacy and safety settings" onPress={() => router.push('/settings')} />
      <Action label="Sign out" tone="ghost" onPress={() => { void clearSession().then(() => { queryClient.clear(); router.replace('/(auth)/login'); }); }} />
    </Page>
  );
}
