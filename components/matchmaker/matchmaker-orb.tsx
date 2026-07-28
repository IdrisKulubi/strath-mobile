import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { MATCHMAKER_HOME } from '@/lib/design-tokens';
import type { MatchmakerVisualState } from '@/lib/matchmaker/conversation-ui';

interface MatchmakerOrbProps {
  state: MatchmakerVisualState;
  size?: number;
}

function stateColor(state: MatchmakerVisualState) {
  if (state === 'success') return MATCHMAKER_HOME.success;
  if (state === 'error') return MATCHMAKER_HOME.error;
  if (state === 'paused') return MATCHMAKER_HOME.warning;
  return MATCHMAKER_HOME.orbRose;
}

export function MatchmakerOrb({ state, size = 34 }: MatchmakerOrbProps) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const isActive = state === 'thinking' || state === 'searching';

  useEffect(() => {
    cancelAnimation(progress);
    progress.value = 0;

    if (isActive && !reduceMotion) {
      progress.value = withRepeat(
        withTiming(1, {
          duration: state === 'searching' ? 900 : 1300,
          easing: Easing.inOut(Easing.quad),
        }),
        -1,
        true,
      );
    }

    return () => cancelAnimation(progress);
  }, [isActive, progress, reduceMotion, state]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.86 + progress.value * 0.14,
    transform: [{ scale: 1 + progress.value * 0.045 }],
  }));
  const accent = stateColor(state);

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[styles.frame, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
        <Svg width={size} height={size} viewBox="0 0 40 40">
          <Defs>
            <RadialGradient id="orb" cx="32%" cy="24%" rx="72%" ry="72%">
              <Stop offset="0%" stopColor={MATCHMAKER_HOME.primaryForeground} stopOpacity="0.96" />
              <Stop offset="30%" stopColor={MATCHMAKER_HOME.orbCyan} stopOpacity="0.92" />
              <Stop offset="64%" stopColor={MATCHMAKER_HOME.orbLavender} stopOpacity="0.94" />
              <Stop offset="100%" stopColor={accent} stopOpacity="0.98" />
            </RadialGradient>
          </Defs>
          <Circle cx="20" cy="20" r="18.5" fill="url(#orb)" />
          <Circle
            cx="20"
            cy="20"
            r="18.5"
            fill="none"
            stroke={MATCHMAKER_HOME.primaryForeground}
            strokeOpacity="0.46"
            strokeWidth="1"
          />
          <Circle
            cx="14"
            cy="11.5"
            r="4.5"
            fill={MATCHMAKER_HOME.primaryForeground}
            fillOpacity="0.38"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    backgroundColor: MATCHMAKER_HOME.surfaceStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: MATCHMAKER_HOME.borderStrong,
    shadowColor: MATCHMAKER_HOME.orbLavender,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
});
