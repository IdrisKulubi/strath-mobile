import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import { MatchmakerOrb } from '@/components/matchmaker/matchmaker-orb';
import { Text } from '@/components/ui/text';
import { MATCHMAKER_HOME, RADIUS, SPACING } from '@/lib/design-tokens';

interface MatchmakerVoiceBubbleProps {
  text: string;
  compact?: boolean;
}

export function MatchmakerVoiceBubble({ text, compact = false }: MatchmakerVoiceBubbleProps) {
  const reduceMotion = useReducedMotion();
  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeInDown.duration(220)}
      style={[styles.wrap, compact && styles.wrapCompact]}
    >
      <MatchmakerOrb state="success" size={compact ? 28 : 32} />
      <View style={styles.bubble}>
        <Text style={[styles.text, compact && styles.textCompact]}>{text}</Text>
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
