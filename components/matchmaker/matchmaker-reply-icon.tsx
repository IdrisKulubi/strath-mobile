import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Clock3,
  Lightbulb,
  MessageCircle,
  Moon,
  Search,
  SlidersHorizontal,
  Sparkles,
  UserRoundPen,
} from 'lucide-react-native';

import { isFeedbackReasonReply } from '@/lib/matchmaker/conversation-ui';
import { MATCHMAKER_HOME, RADIUS } from '@/lib/design-tokens';

type ReplyIcon = typeof Sparkles;

interface MatchmakerReplyIconProps {
  reply: string;
  size?: number;
}

const EXACT_ICONS: Record<string, ReplyIcon> = {
  'Help me refine my type': Sparkles,
  'What should I improve?': UserRoundPen,
  'Give me a date idea': Lightbulb,
  'Save this for tomorrow': Moon,
  'Open Messages': MessageCircle,
  "I'll wait for their response": Clock3,
  'Find another': Search,
  'Keep looking': Search,
  'Find my person': Search,
  'Go ahead and search': Search,
  'Change what I asked for': SlidersHorizontal,
  'Change something': SlidersHorizontal,
};

function resolveIcon(reply: string): ReplyIcon {
  const exact = EXACT_ICONS[reply];
  if (exact) return exact;

  const normalized = reply.trim().toLowerCase();
  if (normalized.includes('message')) return MessageCircle;
  if (normalized.includes('wait')) return Clock3;
  if (normalized.includes('date idea')) return Lightbulb;
  if (normalized.includes('save') && normalized.includes('tomorrow')) return Moon;
  if (normalized.includes('improve') || normalized.includes('profile')) return UserRoundPen;
  if (normalized.includes('refine') || normalized.includes('type')) return Sparkles;
  if (
    normalized.includes('find another')
    || normalized.includes('keep looking')
    || normalized.includes('search')
  ) {
    return Search;
  }
  if (isFeedbackReasonReply(reply)) return SlidersHorizontal;
  return SlidersHorizontal;
}

export function MatchmakerReplyIcon({ reply, size = 18 }: MatchmakerReplyIconProps) {
  const Icon = resolveIcon(reply);

  return (
    <View style={styles.wrap}>
      <Icon size={size} color={MATCHMAKER_HOME.primary} strokeWidth={2.1} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    backgroundColor: MATCHMAKER_HOME.surfaceStrong,
  },
});
