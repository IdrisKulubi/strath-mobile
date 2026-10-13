import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowUpRight, Heart } from 'lucide-react-native';

import { useMatchAnnouncement } from '@/components/questionnaire/match-celebration';
import { Action, Copy, Feedback, Loading, Notice, Page } from '@/components/questionnaire/ui';
import { useTheme } from '@/hooks/use-theme';
import { HEIGHTS, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { useExperience, useQuestionnaire, useQuestionnaireMutation, type DecisionResponse, type LikesResponse, type Person } from '@/lib/questionnaire';

export default function LikesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const experience = useExperience();
  const enabled = Boolean(experience.data?.matching);
  const likes = useQuestionnaire<LikesResponse>('likes', enabled);
  const decision = useQuestionnaireMutation<DecisionResponse>('decisions');
  const announceMatch = useMatchAnnouncement();
  const [tab, setTab] = useState<'received' | 'sent'>('received');
  const people = likes.data?.[tab] ?? [];

  const likeBack = (person: Person) => {
    decision.mutate({ targetId: person.id, decision: 'like' }, {
      onSuccess: (result) => {
        if (result.mutual && result.matchId) announceMatch({ matchId: result.matchId, name: person.name, photo: person.photos[0] ?? null });
      },
    });
  };

  return (
    <Page title="Likes" floatingTabBar>
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
      {!likes.isPending && enabled && people.length === 0 ? <Notice>{tab === 'received' ? 'No received likes yet.' : 'You have not sent any outstanding likes.'}</Notice> : null}
      {people.map((person) => (
        <View key={person.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {person.photos[0] ? <Image source={{ uri: person.photos[0] }} accessibilityLabel={`${person.name} profile photo`} style={styles.photo} /> : null}
          <View style={styles.details}>
            <Text style={[TYPOGRAPHY.title, { color: colors.foreground }]}>{person.name}, {person.age}</Text>
            <Copy muted>{person.city} · {person.intentions.join(', ')}</Copy>
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`View ${person.name}'s profile`}
                onPress={() => router.push({ pathname: '/compatibility/[userId]', params: { userId: person.id, ...(tab === 'sent' ? { like: 'sent' } : {}) } } as never)}
                style={[
                  styles.likeAction,
                  styles.likeActionSecondary,
                  {
                    borderColor: colors.controlBorder,
                    backgroundColor: colors.control,
                  },
                ]}
              >
                <ArrowUpRight size={18} color={colors.foreground} strokeWidth={2.2} />
                <Text style={[styles.likeActionLabel, { color: colors.foreground }]}>View profile</Text>
              </Pressable>
              {tab === 'received' ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Like ${person.name} back`}
                  accessibilityState={{ disabled: decision.isPending }}
                  disabled={decision.isPending}
                  onPress={() => likeBack(person)}
                  style={[
                    styles.likeAction,
                    {
                      backgroundColor: colors.primary,
                      opacity: decision.isPending ? 0.45 : 1,
                    },
                  ]}
                >
                  <Heart size={18} color={colors.primaryForeground} fill={colors.primaryForeground} strokeWidth={2.2} />
                  <Text style={[styles.likeActionLabel, { color: colors.primaryForeground }]}>
                    {decision.isPending ? 'Saving…' : 'Like back'}
                  </Text>
                </Pressable>
              ) : null}
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
  actions: { flexDirection: 'row', gap: SPACING.compact, marginTop: SPACING.tight },
  likeAction: {
    flex: 1,
    minHeight: HEIGHTS.primaryControl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.tight,
    paddingHorizontal: SPACING.compact,
    borderRadius: RADIUS.full,
  },
  likeActionSecondary: { borderWidth: 1 },
  likeActionLabel: { ...TYPOGRAPHY.callout, fontWeight: '700', textAlign: 'center' },
});
