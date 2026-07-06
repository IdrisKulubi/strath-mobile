import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Check, SlidersHorizontal } from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { RADIUS, SPACING } from '@/lib/design-tokens';
import type { MatchmakerConversationMessage } from '@/types/matchmaker';

const FEEDBACK_REASON_REPLIES = new Set([
  'Not my vibe',
  'Too social',
  'Too quiet',
  'Not serious enough',
  'Not active enough',
  'Different lifestyle',
]);

interface MatchmakerFeedbackPanelProps {
  message: MatchmakerConversationMessage;
  replies: string[];
  busy: boolean;
  onSelect: (reply: string) => void;
}

function displayReply(reply: string) {
  return reply === 'Skip feedback' ? 'Skip' : reply;
}

function isReasonStep(replies: string[]) {
  return replies.some((reply) => FEEDBACK_REASON_REPLIES.has(reply));
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
}: MatchmakerFeedbackPanelProps) {
  const { colors, isDark } = useTheme();
  const awaitingReason = isReasonStep(replies);
  const summary = memorySummary(message);

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: isDark ? colors.card : colors.background,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={[styles.icon, { backgroundColor: colors.secondary }]}>
          {awaitingReason ? (
            <SlidersHorizontal size={16} color={colors.primary} />
          ) : (
            <Check size={16} color={colors.primary} />
          )}
        </View>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {awaitingReason ? 'What should I adjust?' : 'Saved for the next search'}
          </Text>
          <Text style={[styles.body, { color: colors.mutedForeground }]}>
            {awaitingReason
              ? 'Pick one reason or skip. This does not use a search.'
              : summary ?? 'I will use that when I look again.'}
          </Text>
        </View>
      </View>

      <View style={styles.replies}>
        {replies.map((reply) => {
          const isSkip = reply === 'Skip feedback';
          return (
            <Pressable
              key={reply}
              accessibilityRole="button"
              accessibilityLabel={isSkip ? 'Skip feedback' : `Feedback reason: ${reply}`}
              accessibilityHint={isSkip ? 'Skips feedback and continues with the matchmaker.' : 'Saves this reason so the matchmaker can adjust.'}
              disabled={busy}
              onPress={() => onSelect(reply)}
              style={({ pressed }) => [
                  styles.reply,
                  {
                    backgroundColor: isSkip ? 'transparent' : colors.card,
                    borderColor: colors.border,
                  },
                  pressed && !busy && styles.pressed,
                  busy && styles.disabled,
                ]}
            >
              {busy ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : null}
              <Text
                style={[
                  styles.replyText,
                  { color: isSkip ? colors.mutedForeground : colors.foreground },
                ]}
              >
                {displayReply(reply)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function isMatchmakerFeedbackReply(reply: string) {
  return FEEDBACK_REASON_REPLIES.has(reply) || reply === 'Skip feedback';
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.compact,
    gap: SPACING.compact,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.tight,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },
  body: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  replies: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.tight,
  },
  reply: {
    minHeight: 44,
    maxWidth: '100%',
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: 13,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.tight,
  },
  replyText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.55,
  },
});
