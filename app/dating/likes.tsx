import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Action, Copy, Feedback, Loading, Notice, Page } from '@/components/questionnaire/ui';
import { useTheme } from '@/hooks/use-theme';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { useExperience, useQuestionnaire, useQuestionnaireMutation, type DecisionResponse, type LikesResponse, type Person } from '@/lib/questionnaire';

export default function LikesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const experience = useExperience();
  const enabled = Boolean(experience.data?.matching);
  const likes = useQuestionnaire<LikesResponse>('likes', enabled);
  const decision = useQuestionnaireMutation<DecisionResponse>('decisions');
  const [tab, setTab] = useState<'received' | 'sent'>('received');
  const [matched, setMatched] = useState<{ name: string; matchId: string } | null>(null);
  const people = likes.data?.[tab] ?? [];

  const likeBack = (person: Person) => {
    decision.mutate({ targetId: person.id, decision: 'like' }, {
      onSuccess: (result) => {
        if (result.mutual && result.matchId) setMatched({ name: person.name, matchId: result.matchId });
      },
    });
  };

  return (
    <Page title="Likes">
      <Copy>People who liked you and likes you sent appear here without a paywall.</Copy>
      {!enabled ? <Notice>Likes open when questionnaire matching is enabled for your account.</Notice> : null}
      {enabled ? (
        <View accessibilityRole="tablist" style={styles.tabs}>
          {(['received', 'sent'] as const).map((value) => (
            <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: tab === value }} onPress={() => setTab(value)} style={[styles.tab, { borderColor: tab === value ? colors.primary : colors.border, backgroundColor: tab === value ? colors.secondary : colors.card }]}>
              <Text style={[TYPOGRAPHY.body, styles.tabText, { color: colors.foreground }]}>{value === 'received' ? 'Received' : 'Sent'}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {likes.isPending && enabled ? <Loading label="Loading likes" /> : null}
      <Feedback error={likes.error ?? decision.error} />
      {likes.isError ? <Action label="Try loading again" onPress={() => { void likes.refetch(); }} /> : null}
      {matched ? (
        <View style={[styles.match, { backgroundColor: colors.card, borderColor: colors.primary }]}>
          <Text accessibilityRole="header" style={[TYPOGRAPHY.title, { color: colors.foreground }]}>You matched with {matched.name}</Text>
          <Copy>You can message each other now. There is no date confirmation or checkout step.</Copy>
          <Action label="Send a message" tone="primary" onPress={() => router.push({ pathname: '/dating-chat/[matchId]', params: { matchId: matched.matchId } } as never)} />
        </View>
      ) : null}
      {!likes.isPending && enabled && people.length === 0 ? <Notice>{tab === 'received' ? 'No received likes yet.' : 'You have not sent any outstanding likes.'}</Notice> : null}
      {people.map((person) => (
        <View key={person.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {person.photos[0] ? <Image source={{ uri: person.photos[0] }} accessibilityLabel={`${person.name} profile photo`} style={styles.photo} /> : null}
          <View style={styles.details}>
            <Text style={[TYPOGRAPHY.title, { color: colors.foreground }]}>{person.name}, {person.age}</Text>
            <Copy muted>{person.city} · {person.intentions.join(', ')}</Copy>
            <View style={styles.actions}>
              <Action label="View profile" onPress={() => router.push({ pathname: '/compatibility/[userId]', params: { userId: person.id } } as never)} />
              {tab === 'received' ? <Action label={decision.isPending ? 'Saving…' : 'Like back'} tone="primary" disabled={decision.isPending} onPress={() => likeBack(person)} /> : null}
            </View>
          </View>
        </View>
      ))}
    </Page>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: SPACING.tight },
  tab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: RADIUS.full },
  tabText: { fontWeight: '700' },
  card: { overflow: 'hidden', borderWidth: 1, borderRadius: RADIUS.lg },
  photo: { width: '100%', aspectRatio: 4 / 3 },
  details: { gap: SPACING.tight, padding: SPACING.base },
  actions: { gap: SPACING.tight },
  match: { gap: SPACING.compact, borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.base },
});
