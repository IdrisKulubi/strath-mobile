import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { DiscoveryReadinessChecklist } from '@/components/questionnaire/discovery-readiness-checklist';
import { ExpandableRow, TextLink } from '@/components/questionnaire/expandable-row';
import { ChapterProgress, ChapterProgressSkeleton } from '@/components/questionnaire/segmented-progress';
import { StickyFooter } from '@/components/questionnaire/sticky-footer';
import { Action, Copy, Feedback, Loading, Notice, Page, PersonCard, SectionLabel } from '@/components/questionnaire/ui';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { isApiError } from '@/lib/api-client';
import { firstDiscoveryStep } from '@/lib/discovery-readiness';
import { HEIGHTS, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { useExperience, useQuestionnaire, type DiscoveryResponse, type QuestionnaireState } from '@/lib/questionnaire';
import { ONBOARDING_ANSWER_TARGET } from '@/lib/questionnaire-flow';

const STARTER_TARGET = ONBOARDING_ANSWER_TARGET;

function gatePrimaryLabel(count: number) {
  if (count <= 0) return 'Start questions';
  const remaining = STARTER_TARGET - count;
  return `Continue: ${remaining} to go`;
}

function defaultDiscovery(status: QuestionnaireState | undefined) {
  return status?.discovery ?? { ready: false, missing: status?.complete ? [] : ['answers'] };
}

export default function DiscoverScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [page, setPage] = useState(0);
  const experience = useExperience();
  const status = useQuestionnaire<QuestionnaireState>('status', Boolean(experience.data?.collection));
  const discoveryMeta = defaultDiscovery(status.data);
  const discoveryEnabled = Boolean(experience.data?.matching && status.data?.complete && discoveryMeta.ready);
  const discovery = useQuestionnaire<DiscoveryResponse>(`discovery?page=${page}`, discoveryEnabled);
  const count = status.data?.answerCount ?? 0;
  const preferences = status.data?.preferences;
  const statusLoading = experience.data?.collection && status.isPending;

  const setupStep = useMemo(
    () => firstDiscoveryStep(discoveryMeta.missing),
    [discoveryMeta.missing],
  );

  if (statusLoading) {
    return (
      <Page title="Discover" eyebrow="Matches built from your answers" floatingTabBar>
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

  const setupFooter = status.data?.complete && !discoveryMeta.ready && experience.data?.collection ? (
    <StickyFooter
      primaryLabel={setupStep?.label ?? 'Finish setup'}
      onPrimaryPress={() => router.push((setupStep?.href ?? '/dating-setup') as never)}
      reserveTabBar
      primaryGlass
      floating
    />
  ) : null;

  const filterSummary = preferences ? (
    `${preferences.genders.join(', ')} · ages ${preferences.minAge}–${preferences.maxAge} · ${preferences.radiusKm !== null ? `within ${preferences.radiusKm} km` : preferences.city} · ${preferences.intentions.join(', ')}`
  ) : 'Add filters to see who fits your rhythm';

  return (
    <Page
      title="Discover"
      eyebrow="Matches built from your answers"
      footer={lockedFooter ?? setupFooter}
      floatingTabBar
      floatingFooter={Boolean(setupFooter)}
      footerReserveTabBar={Boolean(setupFooter)}
    >
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
      ) : !discoveryMeta.ready ? (
        <>
          <SectionLabel>Almost ready to discover</SectionLabel>
          <Copy muted>Finish the steps below. We will only show people when your profile is ready and verified.</Copy>
          <DiscoveryReadinessChecklist missing={discoveryMeta.missing} />
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
          <View style={[styles.filterCard, { backgroundColor: colors.control, borderColor: colors.controlBorder }]}>
            <View style={styles.filterCopy}>
              <Text style={[styles.filterTitle, { color: colors.foreground }]}>Your filters</Text>
              <Text style={[styles.filterBody, { color: colors.mutedForeground }]} numberOfLines={3}>{filterSummary}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit discovery filters"
              onPress={() => router.push('/discovery-filters' as never)}
              style={[styles.editPill, { borderColor: colors.controlBorder, backgroundColor: colors.controlActive }]}
            >
              <Text style={[styles.editPillText, { color: colors.foreground }]}>Edit</Text>
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/questions' as never)}
            style={[styles.outlineButton, { borderColor: colors.controlBorder, backgroundColor: colors.control }]}
          >
            <Text style={[styles.outlineButtonText, { color: colors.foreground }]}>Improve your matches</Text>
          </Pressable>

          {discovery.isPending ? <Loading label="Finding compatible people" /> : null}
          <Feedback error={discovery.isError ? discovery.error : null} />
          {discovery.isError && isApiError(discovery.error) && discovery.error.status === 503 ? (
            <Notice>The matching service is temporarily unavailable. Saved answers and messages still work.</Notice>
          ) : null}
          {discovery.isError ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => { void discovery.refetch(); }}
              style={[styles.pageButton, { borderColor: colors.primary, backgroundColor: colors.primary }]}
            >
              <Text style={[styles.pageButtonText, { color: colors.primaryForeground }]}>Try discovery again</Text>
            </Pressable>
          ) : null}

          {discovery.data?.items.length === 0 && !discovery.isPending && !discovery.isError ? (
            <Notice>No one currently fits all of your reciprocal filters. Your distance, city, age, and identity preferences were not widened.</Notice>
          ) : null}

          <View style={{ gap: SPACING.section }}>
            {discovery.data?.items.map((person) => <PersonCard key={person.id} person={person} />)}
          </View>

          {discovery.data ? (
            <Copy muted>{discovery.data.totalEligible} compatible {discovery.data.totalEligible === 1 ? 'profile' : 'profiles'} within your current filters</Copy>
          ) : null}

          {(page > 0 || discovery.data?.hasMore) ? (
            <View style={styles.pagination}>
              {page > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setPage((value) => Math.max(0, value - 1))}
                  style={[styles.pageButton, { borderColor: colors.controlBorder, backgroundColor: colors.control }]}
                >
                  <Text style={[styles.pageButtonText, { color: colors.foreground }]}>Previous</Text>
                </Pressable>
              ) : <View style={styles.pageSpacer} />}
              {discovery.data?.hasMore ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setPage((value) => value + 1)}
                  style={[styles.pageButton, { borderColor: colors.primary, backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.pageButtonText, { color: colors.primaryForeground }]}>Next</Text>
                </Pressable>
              ) : <View style={styles.pageSpacer} />}
            </View>
          ) : null}
        </>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  filterCard: {
    borderRadius: RADIUS.row,
    borderWidth: StyleSheet.hairlineWidth,
    padding: SPACING.compact,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.compact,
  },
  filterCopy: { flex: 1, gap: SPACING.micro },
  filterTitle: { ...TYPOGRAPHY.body, fontWeight: '700' },
  filterBody: { ...TYPOGRAPHY.caption },
  editPill: {
    minHeight: HEIGHTS.touchMin,
    paddingHorizontal: SPACING.compact,
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editPillText: { ...TYPOGRAPHY.caption, fontWeight: '700' },
  outlineButton: {
    minHeight: HEIGHTS.primaryControl,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.base,
  },
  outlineButtonText: { ...TYPOGRAPHY.body, fontWeight: '700' },
  pagination: { flexDirection: 'row', gap: SPACING.compact },
  pageButton: {
    flex: 1,
    minHeight: HEIGHTS.primaryControl,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageSpacer: { flex: 1 },
  pageButtonText: { ...TYPOGRAPHY.body, fontWeight: '700' },
});
