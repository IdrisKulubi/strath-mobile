import React from 'react';
import { StyleSheet, View } from 'react-native';

import { MatchmakerOrb } from '@/components/matchmaker/matchmaker-orb';
import { MatchmakerStreamingText } from '@/components/matchmaker/matchmaker-streaming-text';
import { Text } from '@/components/ui/text';
import { getMessageEyebrow } from '@/lib/matchmaker/conversation-ui';
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

export function BubbleChatUserRow({
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
    <View style={[styles.userRow, compact && styles.rowCompact]}>
      <View style={[styles.userBubble, compact && styles.bubbleCompact]}>
        <MatchmakerStreamingText
          text={content}
          messageId={messageId ?? message?.id}
          animate={animate}
          showCursor={false}
          style={compact ? styles.userTextCompact : styles.userText}
        />
      </View>
    </View>
  );
}

export function BubbleChatAssistantRow({
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

  const eyebrow = showEyebrow ? getMessageEyebrow(message) : null;

  return (
    <View style={[styles.assistantRow, compact && styles.rowCompact]}>
      <MatchmakerOrb state="success" size={compact ? 22 : 26} />
      <View style={[styles.assistantBubble, compact && styles.bubbleCompact]}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <MatchmakerStreamingText
          text={content}
          messageId={messageId ?? message?.id}
          animate={animate}
          style={compact ? styles.assistantTextCompact : styles.assistantText}
        />
      </View>
    </View>
  );
}

export function BubbleChatActivePrompt({
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
    <BubbleChatAssistantRow
      message={syntheticMessage}
      text={content}
      animate={animate}
      showEyebrow
      messageId={messageId ?? syntheticMessage.id}
    />
  );
}

export function BubbleChatAssistantVoice({
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
    <BubbleChatAssistantRow
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
    marginVertical: 2,
  },
  assistantRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.tight,
    paddingHorizontal: SPACING.screenX,
    marginVertical: 2,
  },
  rowCompact: {
    paddingHorizontal: SPACING.tight,
    marginVertical: 1,
  },
  userBubble: {
    maxWidth: '82%',
    backgroundColor: MATCHMAKER_HOME.primary,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  assistantBubble: {
    maxWidth: '78%',
    backgroundColor: MATCHMAKER_HOME.surface,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  bubbleCompact: {
    maxWidth: '88%',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  userText: {
    color: MATCHMAKER_HOME.primaryForeground,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
  userTextCompact: {
    color: MATCHMAKER_HOME.primaryForeground,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  assistantText: {
    color: MATCHMAKER_HOME.foreground,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
  assistantTextCompact: {
    color: MATCHMAKER_HOME.foreground,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  eyebrow: {
    color: MATCHMAKER_HOME.primary,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});
