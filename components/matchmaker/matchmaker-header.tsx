import React from 'react';
import { StyleSheet, View } from 'react-native';

import { MatchmakerOrb } from '@/components/matchmaker/matchmaker-orb';
import { Text } from '@/components/ui/text';
import { formatRemainingSearches } from '@/lib/matchmaker/conversation-ui';
import { MATCHMAKER_HOME, RADIUS, SPACING } from '@/lib/design-tokens';
import type { MatchmakerVisualState } from '@/lib/matchmaker/conversation-ui';
import type { MatchmakerConversationSession } from '@/types/matchmaker';

interface MatchmakerHeaderProps {
  session: MatchmakerConversationSession | null;
  visualState: MatchmakerVisualState;
  candidateFirstName?: string | null;
}

function getVisualStatusLabel(
  state: MatchmakerVisualState,
  candidateFirstName?: string | null,
) {
  if (state === 'searching') return 'Searching thoughtfully';
  if (state === 'thinking') return 'Thinking';
  if (state === 'success') {
    return candidateFirstName
      ? `I found someone for you`
      : 'A thoughtful match';
  }
  if (state === 'error') return 'Connection needs attention';
  if (state === 'paused') return 'Paused for today';
  return 'Your private guide';
}

export function MatchmakerHeader({
  session,
  visualState,
  candidateFirstName,
}: MatchmakerHeaderProps) {
  const remaining = session?.remainingSearches ?? 0;
  const quotaLabel = session ? formatRemainingSearches(remaining) : null;
  const quotaExhausted = remaining <= 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.identity}>
        <MatchmakerOrb state={visualState} />
        <View style={styles.copy}>
          <Text style={styles.title}>Matchmaker</Text>
          <Text style={styles.status}>
            {getVisualStatusLabel(visualState, candidateFirstName)}
          </Text>
        </View>
      </View>
      {quotaLabel ? (
        <View style={[styles.quotaPill, quotaExhausted && styles.quotaPillExhausted]}>
          <Text style={[styles.quota, quotaExhausted && styles.quotaExhausted]}>
            {quotaLabel}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.compact,
    minHeight: 52,
    paddingBottom: SPACING.compact,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: MATCHMAKER_HOME.border,
  },
  identity: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.compact,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  title: {
    color: MATCHMAKER_HOME.foreground,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
  },
  status: {
    color: MATCHMAKER_HOME.subtleForeground,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  quotaPill: {
    maxWidth: 132,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: MATCHMAKER_HOME.border,
    backgroundColor: MATCHMAKER_HOME.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  quotaPillExhausted: {
    borderColor: 'rgba(240, 120, 120, 0.35)',
    backgroundColor: 'rgba(240, 120, 120, 0.10)',
  },
  quota: {
    color: MATCHMAKER_HOME.mutedForeground,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  quotaExhausted: {
    color: MATCHMAKER_HOME.error,
  },
});
