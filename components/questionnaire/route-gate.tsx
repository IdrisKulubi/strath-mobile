import React, { useEffect } from 'react';
import { Redirect, usePathname } from 'expo-router';

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
  const identity = useIdentity();
  const experience = useExperience();
  const { data: identityData, isError: identityError, isPending: identityPending, refetch: refetchIdentity } = identity;

  useEffect(() => {
    void refetchIdentity();
  }, [path, refetchIdentity]);

  if (identityPending) return <Page title="Strathspace"><Loading label="Checking your account" /></Page>;
  if (identityError) return <Page title="Strathspace"><Feedback error={identity.error} /><Action label="Try again" tone="primary" onPress={() => { void refetchIdentity(); }} /></Page>;
  if (!identityData) return <>{children}</>;
  if (experience.isPending) return <Page title="Strathspace"><Loading label="Opening your experience" /></Page>;
  if (experience.isError) {
    return (
      <Page title="Strathspace">
        <Feedback error={experience.error} />
        <Action label="Try again" tone="primary" onPress={() => { void experience.refetch(); }} />
      </Page>
    );
  }
  if (!experience.data?.shell) return <Page title="Strathspace"><Feedback error={new Error('The new experience is temporarily unavailable. Please try again.')} /><Action label="Try again" tone="primary" onPress={() => { void experience.refetch(); }} /></Page>;
  if (isQuestionnaireRoute(path) || path === '/waitlist') return <>{children}</>;
  return <Redirect href={replacementForLegacyRoute(path) as never} />;
}
