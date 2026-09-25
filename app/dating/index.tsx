import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { ExpandableRow, TextLink } from '@/components/questionnaire/expandable-row';
import { ChapterProgress, ChapterProgressSkeleton } from '@/components/questionnaire/segmented-progress';
import { StickyFooter } from '@/components/questionnaire/sticky-footer';
import { Action, Copy, Feedback, Loading, Notice, Page, PersonCard, SectionLabel } from '@/components/questionnaire/ui';
import { isApiError } from '@/lib/api-client';
import { SPACING } from '@/lib/design-tokens';
import { useExperience, useQuestionnaire, type DiscoveryResponse, type QuestionnaireState } from '@/lib/questionnaire';
import { ONBOARDING_ANSWER_TARGET } from '@/lib/questionnaire-flow';

const STARTER_TARGET = ONBOARDING_ANSWER_TARGET;

function gatePrimaryLabel(count: number) {
  if (count <= 0) return 'Start questions';
  const remaining = STARTER_TARGET - count;
  return `Continue: ${remaining} to go`;
}

export default function DiscoverScreen() {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const experience = useExperience();
  const status = useQuestionnaire<QuestionnaireState>('status', Boolean(experience.data?.collection));
  const discovery = useQuestionnaire<DiscoveryResponse>(`discovery?page=${page}`, Boolean(experience.data?.matching && status.data?.complete));
  const count = status.data?.answerCount ?? 0;
  const preferences = status.data?.preferences;
  const statusLoading = experience.data?.collection && status.isPending;

  if (statusLoading) {
    return (
      <Page title="Discover" eyebrow="Matches built from your answers">
        <ChapterProgressSkeleton />
        <Copy muted>Loading your progress…</Copy>
      </Page>
    );
  }

  const lockedFooter = !status.data?.complete && experience.data?.collection ? (
    <StickyFooter
      primaryLabel={gatePrimaryLabel(count)}
      onPrimaryPress={() => router.push('/questions' as never)}
      reserveTabBar
    />
  ) : null;

  return (
    <Page title="Discover" eyebrow="Matches built from your answers" footer={lockedFooter}>
      {!experience.data?.collection ? (
        <Notice>Questionnaire collection is not enabled for this test account yet.</Notice>
      ) : !status.data?.complete ? (
        <>
          <ChapterProgress answerCount={count} />
          <Copy>Answer {STARTER_TARGET} questions to start discovering people whose answers fit yours.</Copy>
          <ExpandableRow title="How matching works">
            Compatibility reflects both people’s answers. It is not a prediction of relationship success.
          </ExpandableRow>
          <TextLink label="Review profile and preferences" onPress={() => router.push('/dating-setup' as never)} />
        </>
      ) : !experience.data?.matching ? (
        <>
          <ChapterProgress answerCount={STARTER_TARGET} />
          <Notice tone="success">Your questionnaire is ready.</Notice>
          <Copy muted>Compatible discovery is disabled for this account. No profiles are being fabricated or ranked.</Copy>
          <Action label="Review your answers" onPress={() => router.push('/questions' as never)} />
          <Action label="Update discovery preferences" onPress={() => router.push('/discovery-filters' as never)} />
        </>
      ) : (
        <>
          <SectionLabel>Your filters</SectionLabel>
          {preferences ? (
            <Copy muted>
              {preferences.genders.join(', ')} · ages {preferences.minAge}–{preferences.maxAge} · {preferences.radiusKm !== null ? `within ${preferences.radiusKm} km` : preferences.city} · {preferences.intentions.join(', ')}
            </Copy>
          ) : null}
          <Action label="Edit filters" onPress={() => router.push('/discovery-filters' as never)} />
          <Action label="Improve your matches" tone="ghost" onPress={() => router.push('/questions' as never)} />

          {discovery.isPending ? <Loading label="Finding compatible people" /> : null}
          <Feedback error={discovery.error} />
          {discovery.isError ? (
            <>
              {isApiError(discovery.error) && discovery.error.status === 503 ? <Notice>The matching service is temporarily unavailable. Saved answers and messages still work.</Notice> : null}
              {isApiError(discovery.error) && discovery.error.status === 428 ? <Action label="Finish discovery setup" onPress={() => router.push('/dating-setup' as never)} /> : null}
              <Action label="Try discovery again" tone="primary" onPress={() => { void discovery.refetch(); }} />
            </>
          ) : null}
          {discovery.data?.items.length === 0 ? (
            <Notice>No one currently fits all of your reciprocal filters. Your distance, city, age, and identity preferences were not widened.</Notice>
          ) : null}
          <View style={{ gap: SPACING.section }}>
            {discovery.data?.items.map((person) => <PersonCard key={person.id} person={person} />)}
          </View>
          {discovery.data ? (
            <Copy muted>{discovery.data.totalEligible} compatible {discovery.data.totalEligible === 1 ? 'profile' : 'profiles'} within your current filters</Copy>
          ) : null}
          <View style={{ flexDirection: 'row', gap: SPACING.compact }}>
            {page > 0 ? <View style={{ flex: 1 }}><Action label="Previous" onPress={() => setPage((value) => Math.max(0, value - 1))} /></View> : null}
            {discovery.data?.hasMore ? <View style={{ flex: 1 }}><Action label="Next" tone="primary" onPress={() => setPage((value) => value + 1)} /></View> : null}
          </View>
        </>
      )}
    </Page>
  );
}
