import React from 'react';
import { StyleSheet, View } from 'react-native';

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

function textStyleForVariant(
  variant: ReturnType<typeof getMessageDisplayVariant>,
  compact?: boolean,
) {
  if (variant === 'caption') {
    return compact ? styles.userTextCompact : styles.userText;
  }
  if (variant === 'hero') {
    return compact ? styles.heroTextCompact : styles.heroText;
  }
  return compact ? styles.bodyTextCompact : styles.bodyText;
}

export function MinimalEditorialUserRow({
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
      <View style={[styles.userBubble, compact && styles.userBubbleCompact]}>
        <MatchmakerStreamingText
          text={content}
          messageId={messageId ?? message?.id}
          animate={animate}
          showCursor={false}
          style={textStyleForVariant('caption', compact)}
        />
      </View>
    </View>
  );
}

export function MinimalEditorialAssistantRow({
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

  return (
    <View style={[styles.assistantRow, compact && styles.assistantRowCompact]}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <MatchmakerStreamingText
        text={content}
        messageId={messageId ?? message?.id}
        animate={animate}
        style={textStyleForVariant(variant, compact)}
      />
    </View>
  );
}

export function MinimalEditorialActivePrompt({
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
    <MinimalEditorialAssistantRow
      message={syntheticMessage}
      text={content}
      animate={animate}
      showEyebrow
      messageId={messageId ?? syntheticMessage.id}
    />
  );
}

export function MinimalEditorialAssistantVoice({
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
    <MinimalEditorialAssistantRow
      message={syntheticMessage}
      text={content}
      animate={animate}
      compact={compact}
      showEyebrow={false}
      messageId={messageId}
    />
  );
}

const styles = StyleSheet.create({
  userRow: {
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.screenX,
  },
  userRowCompact: {
    paddingHorizontal: SPACING.tight,
  },
  userBubble: {
    maxWidth: '88%',
    backgroundColor: MATCHMAKER_HOME.surfaceStrong,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.compact,
    paddingVertical: SPACING.tight,
  },
  userBubbleCompact: {
    maxWidth: '92%',
    paddingHorizontal: SPACING.tight,
    paddingVertical: 6,
  },
  userText: {
    color: MATCHMAKER_HOME.foreground,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '500',
  },
  userTextCompact: {
    color: MATCHMAKER_HOME.mutedForeground,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  assistantRow: {
    gap: SPACING.tight,
    paddingHorizontal: SPACING.screenX,
  },
  assistantRowCompact: {
    paddingHorizontal: SPACING.tight,
    gap: 4,
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
    fontSize: 26,
    lineHeight: 33,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  heroTextCompact: {
    color: MATCHMAKER_HOME.foreground,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  bodyText: {
    color: MATCHMAKER_HOME.foreground,
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '500',
  },
  bodyTextCompact: {
    color: MATCHMAKER_HOME.mutedForeground,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
});
