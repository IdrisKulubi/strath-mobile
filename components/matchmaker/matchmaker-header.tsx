import React from 'react';
import { StyleSheet, View } from 'react-native';

import { MatchmakerOrb } from '@/components/matchmaker/matchmaker-orb';
import { Text } from '@/components/ui/text';
import { formatRemainingSearches } from '@/lib/matchmaker/conversation-ui';
import { MATCHMAKER_HOME, SPACING } from '@/lib/design-tokens';
import type { MatchmakerVisualState } from '@/lib/matchmaker/conversation-ui';
import type { MatchmakerConversationSession } from '@/types/matchmaker';

interface MatchmakerHeaderProps {
  session: MatchmakerConversationSession | null;
  visualState: MatchmakerVisualState;
}

function getVisualStatusLabel(state: MatchmakerVisualState) {
  if (state === 'searching') return 'Searching thoughtfully';
  if (state === 'thinking') return 'Thinking';
  if (state === 'success') return 'A promising direction';
  if (state === 'error') return 'Connection needs attention';
  if (state === 'paused') return 'Paused for today';
  return 'Your private guide';
}

export function MatchmakerHeader({ session, visualState }: MatchmakerHeaderProps) {
  const quotaLabel = session ? formatRemainingSearches(session.remainingSearches) : null;

  return (
    <View style={styles.wrap}>
      <View style={styles.identity}>
        <MatchmakerOrb state={visualState} />
        <View style={styles.copy}>
          <Text style={styles.title}>Matchmaker</Text>
          <Text style={styles.status}>{getVisualStatusLabel(visualState)}</Text>
        </View>
      </View>
      {quotaLabel ? <Text style={styles.quota}>{quotaLabel}</Text> : null}
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
  quota: {
    color: MATCHMAKER_HOME.mutedForeground,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    textAlign: 'right',
  },
});
