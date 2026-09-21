import React from 'react';
import { useRouter } from 'expo-router';

import { Action, Copy, Notice, Page, Progress } from '@/components/questionnaire/ui';
import { useExperience, useQuestionnaire, type QuestionnaireState } from '@/lib/questionnaire';

export default function DiscoverScreen() {
  const router = useRouter();
  const experience = useExperience();
  const status = useQuestionnaire<QuestionnaireState>('status', Boolean(experience.data?.collection));
  const count = status.data?.answerCount ?? 0;
  return (
    <Page title="Discover" eyebrow="Question-based matching">
      <Copy>Build compatibility from what matters to both of you.</Copy>
      <Progress value={Math.min(count, 20)} total={20} label={`${count} of 20 starter answers saved`} />
      {!experience.data?.collection ? (
        <Notice>Questionnaire collection is not enabled for this test account yet.</Notice>
      ) : !status.data?.complete ? (
        <>
          <Notice>Finish twenty answers before discovery opens. Existing messages remain available.</Notice>
          <Action label={count ? 'Continue your questions' : 'Start your questions'} tone="primary" onPress={() => router.push('/questions' as never)} />
          <Action label="Review profile and preferences" onPress={() => router.push('/dating-setup' as never)} />
        </>
      ) : !experience.data?.matching ? (
        <>
          <Notice tone="success">Your questionnaire is ready.</Notice>
          <Notice>Compatible discovery is still in development for this internal preview. No profiles are being fabricated or ranked yet.</Notice>
          <Action label="Review your answers" onPress={() => router.push('/questions' as never)} />
          <Action label="Update discovery preferences" onPress={() => router.push('/dating-setup' as never)} />
        </>
      ) : (
        <Notice>Discovery becomes available in Phase 4 after ranking and privacy checks pass.</Notice>
      )}
    </Page>
  );
}
