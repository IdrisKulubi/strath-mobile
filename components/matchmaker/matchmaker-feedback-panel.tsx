import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { MatchmakerReplyIcon } from '@/components/matchmaker/matchmaker-reply-icon';
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
  remainingSearches?: number;
  onUndo?: (changeId: string) => Promise<void>;
}

function displayReply(reply: string) {
  return reply === 'Skip feedback' ? 'Skip' : reply;
}

function learningUpdate(message: MatchmakerConversationMessage) {
  const value = message.metadata?.learningUpdate;
  if (!value || typeof value !== 'object') return null;
  const update = value as Record<string, unknown>;
  if (typeof update.summary !== 'string' || typeof update.changeId !== 'string') return null;
  return { summary: update.summary, changeId: update.changeId };
}

export function MatchmakerFeedbackPanel({
  message,
  replies,
  busy,
  onSelect,
  outcome,
  remainingSearches = 0,
  onUndo,
}: MatchmakerFeedbackPanelProps) {
  const [undone, setUndone] = useState(false);
  const awaitingReason = replies.some((reply) => isFeedbackReasonReply(reply));
  const update = learningUpdate(message);
  const isInterested = outcome === 'interested';
  const hasSearchesLeft = remainingSearches > 0;

  return (
    <View style={styles.wrap}>
      <Text style={styles.prompt}>{message.text}</Text>
      {isInterested && !awaitingReason ? (
        <Text style={styles.hint}>
          {hasSearchesLeft
            ? "They're deciding. You can keep looking or wait for their response."
            : "They're deciding. You can wait for their response or fine-tune for tomorrow."}
        </Text>
      ) : null}
      {update ? (
        <View style={styles.updateRow}>
          <View style={styles.updateCopy}><Text style={styles.updateLabel}>Match brief updated</Text><Text style={styles.summary}>{undone ? 'Change undone.' : update.summary}</Text></View>
          {onUndo && !undone ? <Pressable accessibilityRole="button" disabled={busy} onPress={async () => { await onUndo(update.changeId); setUndone(true); }} style={({ pressed }) => [styles.undoButton, pressed && styles.pressed]}><Text style={styles.undoText}>Undo</Text></Pressable> : null}
        </View>
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
                  <MatchmakerReplyIcon reply={reply} />
                )}
                <Text style={[styles.replyText, isSkip && styles.replyTextSkip]}>
                  {displayReply(reply)}
                </Text>
                {!busy ? (
                  <View style={styles.replyChevron}>
                    <ChevronRight size={16} color={MATCHMAKER_HOME.subtleForeground} />
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
  updateRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: SPACING.compact, padding: SPACING.compact, borderRadius: RADIUS.md, backgroundColor: MATCHMAKER_HOME.surface },
  updateCopy: { flex: 1, gap: 2 },
  updateLabel: { color: MATCHMAKER_HOME.success, fontSize: 11, lineHeight: 15, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  undoButton: { minWidth: 52, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  undoText: { color: MATCHMAKER_HOME.primary, fontSize: 14, lineHeight: 18, fontWeight: '800' },
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
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.compact,
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
    width: 24,
    height: 32,
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
