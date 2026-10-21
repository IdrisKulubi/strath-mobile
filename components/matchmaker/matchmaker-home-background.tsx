import React, { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { MATCHMAKER_HOME } from '@/lib/design-tokens';

interface MatchmakerHomeBackgroundProps {
  style?: StyleProp<ViewStyle>;
}

export function MatchmakerHomeBackground({ style }: MatchmakerHomeBackgroundProps) {
  const reduceMotion = useReducedMotion();
  const drift = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      drift.value = 0.5;
      return;
    }

    drift.value = withRepeat(
      withTiming(1, { duration: 12000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );

    return () => cancelAnimation(drift);
  }, [drift, reduceMotion]);

  const primaryGlowStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: (drift.value - 0.5) * 56 },
      { translateY: (drift.value - 0.5) * -40 },
      { scale: 1.05 + (drift.value - 0.5) * 0.08 },
    ],
    opacity: 0.95,
  }));

  const secondaryGlowStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: (0.5 - drift.value) * 48 },
      { translateY: (drift.value - 0.5) * 32 },
    ],
    opacity: 0.85,
  }));

  const accentGlowStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: (drift.value - 0.5) * 28 },
      { translateY: (drift.value - 0.5) * 20 },
    ],
    opacity: 0.55 + drift.value * 0.2,
  }));

  return (
    <View style={[styles.root, style]} pointerEvents="none">
      {/* Solid pink-tinted base so the screen never looks flat purple */}
      <View style={styles.solidBase} />

      <LinearGradient
        colors={[
          MATCHMAKER_HOME.gradientBaseTop,
          MATCHMAKER_HOME.gradientBaseMid,
          MATCHMAKER_HOME.gradientBaseBottom,
        ]}
        locations={[0, 0.45, 1]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Strong diagonal pink wash */}
      <LinearGradient
        colors={[
          'rgba(217, 74, 143, 0.42)',
          'rgba(242, 120, 177, 0.18)',
          'transparent',
        ]}
        locations={[0, 0.35, 0.75]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.7 }}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View style={[styles.glowLayer, primaryGlowStyle]}>
        <LinearGradient
          colors={[
            'transparent',
            MATCHMAKER_HOME.gradientGlowRose,
            MATCHMAKER_HOME.gradientGlowMagenta,
            'transparent',
          ]}
          locations={[0, 0.28, 0.55, 1]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.95, y: 0.9 }}
          style={styles.glowBlob}
        />
      </Animated.View>

      <Animated.View style={[styles.glowLayer, secondaryGlowStyle]}>
        <LinearGradient
          colors={[
            'transparent',
            MATCHMAKER_HOME.gradientGlowLavender,
            'transparent',
          ]}
          locations={[0, 0.5, 1]}
          start={{ x: 1, y: 0.15 }}
          end={{ x: 0, y: 0.85 }}
          style={styles.glowBlob}
        />
      </Animated.View>

      <Animated.View style={[styles.glowLayer, accentGlowStyle]}>
        <LinearGradient
          colors={[
            'transparent',
            MATCHMAKER_HOME.gradientGlowCyan,
            'transparent',
          ]}
          locations={[0, 0.45, 1]}
          start={{ x: 0.5, y: 0.85 }}
          end={{ x: 0.5, y: 0.1 }}
          style={styles.accentGlow}
        />
      </Animated.View>

      {/* Soft bottom vignette so composer stays readable */}
      <LinearGradient
        colors={['transparent', MATCHMAKER_HOME.gradientVignette]}
        locations={[0.6, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    overflow: 'hidden',
  },
  solidBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: MATCHMAKER_HOME.gradientBaseBottom,
  },
  glowLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowBlob: {
    position: 'absolute',
    width: '160%',
    height: '130%',
    top: '-15%',
  },
  accentGlow: {
    position: 'absolute',
    width: '130%',
    height: '60%',
    bottom: '-10%',
  },
});
