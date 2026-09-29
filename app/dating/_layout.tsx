import React, { useMemo } from 'react';
import { Redirect, useRouter } from 'expo-router';
import { TabList, Tabs, TabSlot, TabTrigger } from 'expo-router/ui';
import { TabBarMinimizeProvider, renderFadingTabScreen } from 'expo-glass-tabs';
import { StyleSheet } from 'react-native';

import { buildGlassTabItems, DATING_TAB_ROUTES } from '@/components/navigation/glass-tab-config';
import { StrathGlassTabBar, StrathGlassTabButton } from '@/components/navigation/strath-glass-tab-bar';
import { Action, Feedback, Loading, Page } from '@/components/questionnaire/ui';
import { useSetupResumeTarget } from '@/hooks/use-setup-resume-target';
import { useTheme } from '@/hooks/use-theme';
import { useExperience, useQuestionnaire, type QuestionnaireState } from '@/lib/questionnaire';

function DatingTabsShell() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const glassTabItems = useMemo(
    () =>
      buildGlassTabItems(DATING_TAB_ROUTES, {
        badgeBackground: colors.primary,
        badgeColor: colors.primaryForeground,
      }),
    [colors.primary, colors.primaryForeground],
  );

  const barTheme = useMemo(
    () => ({
      activeTint: colors.primary,
      inactiveTint: colors.tabIconDefault,
      highlight: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)',
      glassTint: isDark ? 'rgba(28, 23, 36, 0.45)' : 'rgba(255, 255, 255, 0.18)',
      solidFallback: isDark ? 'rgba(28, 23, 36, 0.88)' : 'rgba(255, 255, 255, 0.82)',
    }),
    [colors.primary, colors.tabIconDefault, isDark],
  );

  return (
    <TabBarMinimizeProvider>
      <Tabs>
        <TabSlot style={styles.slot} renderFn={renderFadingTabScreen} />
        <TabList style={styles.hiddenTabList}>
          {DATING_TAB_ROUTES.map((route) => (
            <TabTrigger key={route.name} name={route.name} href={route.href as never} />
          ))}
        </TabList>
        <StrathGlassTabBar
          theme={barTheme}
          onIndexSelected={(index) => router.navigate(DATING_TAB_ROUTES[index].href as never)}
        >
          {glassTabItems.map((item, index) => (
            <TabTrigger key={item.name} name={item.name} asChild>
              <StrathGlassTabButton item={item} index={index} />
            </TabTrigger>
          ))}
        </StrathGlassTabBar>
      </Tabs>
    </TabBarMinimizeProvider>
  );
}

export default function DatingLayout() {
  const experience = useExperience();
  const setupResume = useSetupResumeTarget();
  const status = useQuestionnaire<QuestionnaireState>('status', Boolean(experience.data?.collection));
  if (experience.isPending) return <Page title="Strathspace"><Loading label="Opening your dating experience" /></Page>;
  if (experience.isError) return <Page title="Strathspace"><Feedback error={experience.error} /><Action label="Try again" tone="primary" onPress={() => { void experience.refetch(); }} /></Page>;
  if (!experience.data?.shell) return <Redirect href="/(tabs)" />;
  if (setupResume.pending) return <Page title="Strathspace"><Loading label="Loading your profile progress" /></Page>;
  if (setupResume.shouldResumeSetup) return <Redirect href="/dating-setup" />;
  if (experience.data.collection && status.isPending) return <Page title="Strathspace"><Loading label="Loading your question progress" /></Page>;
  if (experience.data.collection && status.isError) return <Page title="Strathspace"><Feedback error={status.error} /><Action label="Try again" tone="primary" onPress={() => { void status.refetch(); }} /></Page>;
  if (experience.data.collection && status.data && status.data.answerCount > 0 && !status.data.complete) return <Redirect href="/questions" />;
  return <DatingTabsShell />;
}

const styles = StyleSheet.create({
  slot: { flex: 1 },
  hiddenTabList: { display: 'none' },
});
