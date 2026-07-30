import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import { isFeedbackReasonReply } from '@/lib/matchmaker/conversation-ui';
import { MATCHMAKER_HOME, RADIUS, SPACING } from '@/lib/design-tokens';
import type { MatchmakerConversationMessage } from '@/types/matchmaker';

interface MatchmakerFeedbackPanelProps {
  message: MatchmakerConversationMessage;
  replies: string[];
  busy: boolean;
  onSelect: (reply: string) => void;
  outcome?: string | null;
}

function displayReply(reply: string) {
  return reply === 'Skip feedback' ? 'Skip' : reply;
}

function memorySummary(message: MatchmakerConversationMessage) {
  const value = message.metadata?.memorySummary;
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

export function MatchmakerFeedbackPanel({
  message,
  replies,
  busy,
  onSelect,
  outcome,
}: MatchmakerFeedbackPanelProps) {
  const awaitingReason = replies.some((reply) => isFeedbackReasonReply(reply));
  const summary = memorySummary(message);
  const isInterested = outcome === 'interested';

  return (
    <View style={styles.wrap}>
      <Text style={styles.prompt}>{message.text}</Text>
      {isInterested && !awaitingReason ? (
        <Text style={styles.hint}>
          They&apos;re deciding. You can keep looking or wait for their response.
        </Text>
      ) : null}
      {!awaitingReason && summary ? (
        <Text style={styles.summary}>{summary}</Text>
      ) : null}
      {awaitingReason ? (
        <Text style={styles.hint}>Optional. This does not use a search.</Text>
      ) : null}

      <View style={styles.replies}>
        {replies.map((reply) => {
          const isSkip = reply === 'Skip feedback';
          return (
            <Pressable
              key={reply}
              accessibilityRole="button"
              accessibilityLabel={isSkip ? 'Skip feedback' : `Feedback reason: ${reply}`}
              disabled={busy}
              onPress={() => onSelect(reply)}
              style={({ pressed }) => [
                styles.reply,
                isSkip && styles.replySkip,
                pressed && !busy && styles.pressed,
                busy && styles.disabled,
              ]}
            >
              <View style={styles.replyContent}>
                {busy ? (
                  <ActivityIndicator size="small" color={MATCHMAKER_HOME.primary} />
                ) : (
                  <View style={styles.replyMarker} />
                )}
                <Text style={[styles.replyText, isSkip && styles.replyTextSkip]}>
                  {displayReply(reply)}
                </Text>
                {!busy ? (
                  <View style={styles.replyChevron}>
                    <ChevronRight size={18} color={MATCHMAKER_HOME.primary} />
                  </View>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export { isFeedbackReasonReply as isMatchmakerFeedbackReply };

const styles = StyleSheet.create({
  wrap: {
    gap: SPACING.compact,
  },
  prompt: {
    color: MATCHMAKER_HOME.foreground,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
  },
  summary: {
    color: MATCHMAKER_HOME.mutedForeground,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  hint: {
    color: MATCHMAKER_HOME.mutedForeground,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  replies: {
    gap: SPACING.compact,
  },
  reply: {
    width: '100%',
    minHeight: 56,
    borderWidth: 1,
    borderColor: MATCHMAKER_HOME.border,
    backgroundColor: MATCHMAKER_HOME.backgroundRaised,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.compact,
    overflow: 'hidden',
  },
  replyContent: {
    width: '100%',
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.compact,
  },
  replyMarker: {
    width: 7,
    height: 7,
    flexShrink: 0,
    borderRadius: RADIUS.full,
    backgroundColor: MATCHMAKER_HOME.orbLavender,
  },
  replySkip: {
    backgroundColor: 'transparent',
  },
  replyText: {
    flex: 1,
    flexShrink: 1,
    color: MATCHMAKER_HOME.foreground,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  replyTextSkip: {
    color: MATCHMAKER_HOME.mutedForeground,
  },
  replyChevron: {
    width: 28,
    height: 40,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    backgroundColor: MATCHMAKER_HOME.surfacePressed,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.55,
  },
});
