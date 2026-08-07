import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import { MatchmakerAssistantVoiceBlock } from '@/components/matchmaker/matchmaker-message-styles';
import { MatchmakerOrb } from '@/components/matchmaker/matchmaker-orb';
import { MatchmakerStreamingText } from '@/components/matchmaker/matchmaker-streaming-text';
import { Text } from '@/components/ui/text';
import type { MatchmakerConversationStyle } from '@/lib/matchmaker/conversation-ui';
import { MATCHMAKER_HOME, RADIUS, SPACING } from '@/lib/design-tokens';

interface MatchmakerVoiceBubbleProps {
  text: string;
  compact?: boolean;
  messageId?: string;
  animate?: boolean;
  conversationStyle?: MatchmakerConversationStyle;
}

export function MatchmakerVoiceBubble({
  text,
  compact = false,
  messageId,
  animate = true,
  conversationStyle,
}: MatchmakerVoiceBubbleProps) {
  const reduceMotion = useReducedMotion();

  if (conversationStyle) {
    return (
      <Animated.View entering={reduceMotion ? undefined : FadeInDown.duration(220)}>
        <MatchmakerAssistantVoiceBlock
          style={conversationStyle}
          text={text}
          messageId={messageId}
          animate={animate}
          compact={compact}
        />
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeInDown.duration(220)}
      style={[styles.wrap, compact && styles.wrapCompact]}
    >
      <MatchmakerOrb state="success" size={compact ? 28 : 32} />
      <View style={styles.bubble}>
        <MatchmakerStreamingText
          text={text}
          messageId={messageId}
          animate={animate}
          style={[styles.text, compact && styles.textCompact]}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.compact,
  },
  wrapCompact: {
    gap: SPACING.tight,
  },
  bubble: {
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
  text: {
    color: MATCHMAKER_HOME.foreground,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '600',
  },
  textCompact: {
    fontSize: 15,
    lineHeight: 21,
  },
});
