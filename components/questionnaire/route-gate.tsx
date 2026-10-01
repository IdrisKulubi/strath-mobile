import React, { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Action, Feedback, Loading, Page } from './ui';
import { useExperience, useIdentity } from '@/lib/questionnaire';

const questionnaireRoutes = [
  '/dating',
  '/dating-setup',
  '/dating-profile-edit',
  '/dating-chat',
  '/compatibility',
  '/discovery-filters',
  '/questions',
  '/verification',
  '/legal',
  '/settings',
  '/app-feedback',
];

export function isQuestionnaireRoute(path: string) {
  if (__DEV__ && (path === '/ui-preview' || path.startsWith('/ui-preview/'))) return true;
  return questionnaireRoutes.some((route) => path === route || path.startsWith(`${route}/`));
}

function replacementForLegacyRoute(path: string) {
  if (path === '/onboarding') return '/dating-setup';
  const conversation = path.match(/^\/chat\/([^/]+)$/);
  if (conversation) return `/dating-chat/${conversation[1]}`;
  if (path === '/chats') return '/dating/messages';
  return '/dating';
}

export function QuestionnaireRouteGate({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const redirectRef = useRef<string | null>(null);
  const identity = useIdentity();
  const experience = useExperience();
  const { data: identityData, isError: identityError, isPending: identityPending, refetch: refetchIdentity } = identity;

  useEffect(() => {
    void refetchIdentity();
  }, [path, refetchIdentity]);

  const target = !identityPending && !identityError && identityData
    && !experience.isPending && !experience.isError && experience.data?.shell
    && !isQuestionnaireRoute(path) && path !== '/waitlist'
    ? replacementForLegacyRoute(path) : null;

  useEffect(() => {
    if (!target) {
      redirectRef.current = null;
      return;
    }
    const transition = `${path}:${target}`;
    if (redirectRef.current === transition) return;
    redirectRef.current = transition;
    router.replace(target as never);
  }, [path, router, target]);

  let overlay: React.ReactNode = null;
  if (identityPending) overlay = <Page title="Strathspace"><Loading label="Checking your account" /></Page>;
  else if (identityError) overlay = <Page title="Strathspace"><Feedback error={identity.error} /><Action label="Try again" tone="primary" onPress={() => { void refetchIdentity(); }} /></Page>;
  else if (identityData && experience.isPending) overlay = <Page title="Strathspace"><Loading label="Opening your experience" /></Page>;
  else if (identityData && experience.isError) {
    overlay = (
      <Page title="Strathspace">
        <Feedback error={experience.error} />
        <Action label="Try again" tone="primary" onPress={() => { void experience.refetch(); }} />
      </Page>
    );
  } else if (identityData && !experience.data?.shell) overlay = <Page title="Strathspace"><Feedback error={new Error('The new experience is temporarily unavailable. Please try again.')} /><Action label="Try again" tone="primary" onPress={() => { void experience.refetch(); }} /></Page>;
  else if (target) overlay = <Page title="Strathspace"><Loading label="Opening your experience" /></Page>;

  // The gate wraps the root navigator. Removing children here remounts every
  // query observer and native Modal during auth, which can trigger a refetch /
  // unmount loop. Keep navigation alive while blocking access with an overlay.
  return (
    <View style={styles.container}>
      <View style={styles.container} pointerEvents={overlay ? 'none' : 'auto'} accessibilityElementsHidden={Boolean(overlay)} importantForAccessibility={overlay ? 'no-hide-descendants' : 'auto'}>
        {children}
      </View>
      {overlay ? <View style={styles.overlay}>{overlay}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 100 },
});
