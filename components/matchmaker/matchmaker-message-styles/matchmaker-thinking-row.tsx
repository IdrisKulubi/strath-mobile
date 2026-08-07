import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { MatchmakerOrb } from '@/components/matchmaker/matchmaker-orb';
import { MATCHMAKER_HOME, SPACING } from '@/lib/design-tokens';

interface MatchmakerThinkingRowProps {
  label?: string;
  showOrb?: boolean;
}

function ThinkingDot({ delay }: { delay: number }) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 0.7;
      return;
    }
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 420, delay }),
        withTiming(0.35, { duration: 420 }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(opacity);
  }, [delay, opacity, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

export function MatchmakerThinkingRow({
  label = 'Matchmaker is thinking…',
  showOrb = false,
}: MatchmakerThinkingRowProps) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={styles.wrap}
    >
      {showOrb ? <MatchmakerOrb state="thinking" size={28} /> : null}
      <View style={styles.content}>
        <View style={styles.dots}>
          <ThinkingDot delay={0} />
          <ThinkingDot delay={140} />
          <ThinkingDot delay={280} />
        </View>
        <Animated.Text style={styles.label}>{label}</Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.tight,
    paddingVertical: SPACING.tight,
  },
  content: {
    gap: 4,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: MATCHMAKER_HOME.primary,
  },
  label: {
    color: MATCHMAKER_HOME.mutedForeground,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
});
