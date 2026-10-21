import React from 'react';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import { MatchmakerAssistantVoiceBlock } from '@/components/matchmaker/matchmaker-message-styles';

interface MatchmakerVoiceBubbleProps {
  text: string;
  compact?: boolean;
  messageId?: string;
  animate?: boolean;
}

export function MatchmakerVoiceBubble({
  text,
  compact = false,
  messageId,
  animate = true,
}: MatchmakerVoiceBubbleProps) {
  const reduceMotion = useReducedMotion();

  return (
    <Animated.View entering={reduceMotion ? undefined : FadeInDown.duration(220)}>
      <MatchmakerAssistantVoiceBlock
        text={text}
        messageId={messageId}
        animate={animate}
        compact={compact}
      />
    </Animated.View>
  );
}
