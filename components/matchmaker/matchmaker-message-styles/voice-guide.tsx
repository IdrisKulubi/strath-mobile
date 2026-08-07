import React from 'react';
import { StyleSheet, View } from 'react-native';

import { MatchmakerOrb } from '@/components/matchmaker/matchmaker-orb';
import { MatchmakerStreamingText } from '@/components/matchmaker/matchmaker-streaming-text';
import { Text } from '@/components/ui/text';
import {
  getMessageDisplayVariant,
  getMessageEyebrow,
} from '@/lib/matchmaker/conversation-ui';
import { MATCHMAKER_HOME, RADIUS, SPACING } from '@/lib/design-tokens';
import type { MatchmakerConversationMessage } from '@/types/matchmaker';

import type {
  MatchmakerActivePromptProps,
  MatchmakerAssistantVoiceProps,
  MatchmakerMessageRenderProps,
} from './types';

function resolveText(message?: MatchmakerConversationMessage | null, text?: string) {
  return (text ?? message?.text ?? '').trim();
}

function resolveRole(
  message?: MatchmakerConversationMessage | null,
  role?: 'user' | 'assistant',
) {
  return role ?? message?.role ?? 'assistant';
}

export function VoiceGuideUserRow({
  message,
  text,
  role,
  animate = false,
  compact = false,
  messageId,
}: MatchmakerMessageRenderProps) {
  const resolvedRole = resolveRole(message, role);
  if (resolvedRole !== 'user') return null;

  const content = resolveText(message, text);
  if (!content) return null;

  return (
    <View style={[styles.userRow, compact && styles.userRowCompact]}>
      <Text style={styles.userLabel}>You</Text>
      <MatchmakerStreamingText
        text={content}
        messageId={messageId ?? message?.id}
        animate={animate}
        showCursor={false}
        style={compact ? styles.userTextCompact : styles.userText}
      />
    </View>
  );
}

export function VoiceGuideAssistantRow({
  message,
  text,
  role,
  animate = false,
  compact = false,
  showEyebrow = true,
  messageId,
}: MatchmakerMessageRenderProps) {
  const resolvedRole = resolveRole(message, role);
  if (resolvedRole !== 'assistant') return null;

  const content = resolveText(message, text);
  if (!content) return null;

  const variant = getMessageDisplayVariant(message);
  const eyebrow = showEyebrow ? getMessageEyebrow(message) : null;
  const useBubble = variant === 'body' || compact;

  return (
    <View style={[styles.assistantRow, compact && styles.assistantRowCompact]}>
      <MatchmakerOrb state="success" size={compact ? 24 : 30} />
      <View style={styles.assistantCopy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        {useBubble ? (
          <View style={[styles.voiceBubble, compact && styles.voiceBubbleCompact]}>
            <MatchmakerStreamingText
              text={content}
              messageId={messageId ?? message?.id}
              animate={animate}
              style={compact ? styles.bodyTextCompact : styles.bodyText}
            />
          </View>
        ) : (
          <MatchmakerStreamingText
            text={content}
            messageId={messageId ?? message?.id}
            animate={animate}
            style={compact ? styles.heroTextCompact : styles.heroText}
          />
        )}
      </View>
    </View>
  );
}

export function VoiceGuideActivePrompt({
  text,
  message,
  animate = true,
  messageId,
}: MatchmakerActivePromptProps) {
  const content = text.trim();
  if (!content) return null;

  const syntheticMessage: MatchmakerConversationMessage = message ?? {
    id: messageId ?? 'active-prompt',
    role: 'assistant',
    kind: 'clarifying_question',
    text: content,
    quickReplies: [],
    metadata: {},
    createdAt: '',
  };

  return (
    <VoiceGuideAssistantRow
      message={syntheticMessage}
      text={content}
      animate={animate}
      showEyebrow
      messageId={messageId ?? syntheticMessage.id}
    />
  );
}

export function VoiceGuideAssistantVoice({
  text,
  messageId,
  animate = true,
  compact = false,
}: MatchmakerAssistantVoiceProps) {
  const content = text.trim();
  if (!content) return null;

  const syntheticMessage: MatchmakerConversationMessage = {
    id: messageId ?? 'voice',
    role: 'assistant',
    kind: 'text',
    text: content,
    quickReplies: [],
    metadata: {},
    createdAt: '',
  };

  return (
    <View style={[styles.voiceWrap, compact && styles.voiceWrapCompact]}>
      <MatchmakerOrb state="success" size={compact ? 28 : 32} />
      <View style={[styles.voiceBubble, compact && styles.voiceBubbleCompact]}>
        <MatchmakerStreamingText
          text={content}
          messageId={messageId}
          animate={animate}
          style={compact ? styles.bodyTextCompact : styles.bodyText}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  userRow: {
    alignItems: 'flex-end',
    gap: 2,
    paddingHorizontal: SPACING.screenX,
  },
  userRowCompact: {
    paddingHorizontal: SPACING.tight,
  },
  userLabel: {
    color: MATCHMAKER_HOME.subtleForeground,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  userText: {
    color: MATCHMAKER_HOME.mutedForeground,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    textAlign: 'right',
    maxWidth: '88%',
  },
  userTextCompact: {
    color: MATCHMAKER_HOME.mutedForeground,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    textAlign: 'right',
    maxWidth: '92%',
  },
  assistantRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.compact,
    paddingHorizontal: SPACING.screenX,
  },
  assistantRowCompact: {
    paddingHorizontal: SPACING.tight,
    gap: SPACING.tight,
  },
  assistantCopy: {
    flex: 1,
    minWidth: 0,
    gap: SPACING.tight,
  },
  eyebrow: {
    color: MATCHMAKER_HOME.primary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heroText: {
    color: MATCHMAKER_HOME.foreground,
    fontSize: 28,
    lineHeight: 35,
    fontWeight: '600',
    letterSpacing: -0.45,
  },
  heroTextCompact: {
    color: MATCHMAKER_HOME.foreground,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  bodyText: {
    color: MATCHMAKER_HOME.foreground,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  bodyTextCompact: {
    color: MATCHMAKER_HOME.foreground,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  voiceWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.compact,
    paddingHorizontal: SPACING.screenX,
  },
  voiceWrapCompact: {
    paddingHorizontal: SPACING.screenX,
    gap: SPACING.tight,
  },
  voiceBubble: {
    flex: 1,
    minWidth: 0,
    backgroundColor: MATCHMAKER_HOME.surface,
    borderColor: MATCHMAKER_HOME.border,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    borderTopLeftRadius: RADIUS.sm,
    paddingHorizontal: SPACING.compact,
    paddingVertical: SPACING.tight,
  },
  voiceBubbleCompact: {
    paddingHorizontal: SPACING.tight,
    paddingVertical: 6,
  },
});
