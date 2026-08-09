import React, { useEffect, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Check } from 'lucide-react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { MATCHMAKER_HOME, RADIUS, SPACING } from '@/lib/design-tokens';

const CRITERIA = ['Intent', 'Vibe', 'Availability'] as const;
const PROGRESS_SEGMENTS = 5;

function ProgressSegment({ index, phase, reduceMotion }: {
  index: number;
  phase: SharedValue<number>;
  reduceMotion: boolean;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    if (reduceMotion) return { opacity: index < 3 ? 1 : 0.3 };
    const distance = Math.abs(phase.value * PROGRESS_SEGMENTS - index);
    return { opacity: interpolate(distance, [0, 1, 2], [1, 0.56, 0.22], 'clamp') };
  });

  return <Animated.View style={[styles.progressSegment, animatedStyle]} />;
}

export function MatchmakerSearchAnimation() {
  const reduceMotion = useReducedMotion();
  const phase = useSharedValue(reduceMotion ? 0.55 : 0);
  const drift = useSharedValue(0);
  const [cardWidth, setCardWidth] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;

    phase.value = withRepeat(
      withTiming(1, { duration: 2100, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    drift.value = withRepeat(
      withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );

    return () => {
      cancelAnimation(phase);
      cancelAnimation(drift);
    };
  }, [drift, phase, reduceMotion]);

  const frontCardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: reduceMotion ? 0 : interpolate(drift.value, [0, 1], [2, -3]) }],
  }));

  const scanStyle = useAnimatedStyle(() => ({
    opacity: cardWidth > 0 ? 1 : 0,
    transform: [{ translateX: interpolate(phase.value, [0, 1], [-28, Math.max(cardWidth - 16, 0)]) }],
  }));

  const handleCardLayout = (event: LayoutChangeEvent) => {
    setCardWidth(event.nativeEvent.layout.width);
  };

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Matchmaker is searching for people who fit what you asked for"
      accessibilityLiveRegion="polite"
      style={styles.wrap}
    >
      <View style={styles.deck}>
        <View style={[styles.card, styles.backCard, styles.backCardFar]} />
        <View style={[styles.card, styles.backCard, styles.backCardNear]} />

        <Animated.View onLayout={handleCardLayout} style={[styles.card, styles.frontCard, frontCardStyle]}>
          <LinearGradient
            colors={['rgba(52, 36, 67, 0.98)', 'rgba(29, 20, 42, 0.99)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.profileMark}>
            <View style={styles.profileHead} />
            <View style={styles.profileShoulders} />
          </View>

          <View style={styles.criteria}>
            {CRITERIA.map((criterion) => (
              <View key={criterion} style={styles.criterionRow}>
                <Text style={styles.criterionLabel}>{criterion}</Text>
                <View style={styles.checkCircle}>
                  <Check size={13} strokeWidth={3} color={MATCHMAKER_HOME.primaryForeground} />
                </View>
              </View>
            ))}
          </View>

          <Animated.View pointerEvents="none" style={[styles.scanBeam, scanStyle]}>
            <LinearGradient
              colors={['transparent', 'rgba(217, 74, 143, 0.28)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.scanGlow}
            />
            <View style={styles.scanLine} />
          </Animated.View>
        </Animated.View>
      </View>

      <View style={styles.copy}>
        <Text style={styles.eyebrow}>MATCHMAKER SEARCH</Text>
        <Text style={styles.title}>Finding people who fit what you asked for</Text>
        <Text style={styles.subtitle}>Checking intent, energy, and availability before we show anyone.</Text>
      </View>

      <View accessibilityElementsHidden style={styles.progressTrack}>
        {Array.from({ length: PROGRESS_SEGMENTS }, (_, index) => (
          <ProgressSegment key={index} index={index} phase={phase} reduceMotion={reduceMotion} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    alignItems: 'center',
    gap: SPACING.section,
    paddingHorizontal: SPACING.screenX,
  },
  deck: {
    width: '100%',
    height: 290,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  card: {
    position: 'absolute',
    width: '78%',
    maxWidth: 310,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
  },
  backCard: {
    height: 210,
    backgroundColor: MATCHMAKER_HOME.surface,
    borderColor: 'rgba(180, 138, 232, 0.28)',
  },
  backCardFar: {
    bottom: 48,
    opacity: 0.38,
    transform: [{ rotate: '-8deg' }, { translateX: -22 }, { scale: 0.94 }],
  },
  backCardNear: {
    bottom: 34,
    opacity: 0.68,
    transform: [{ rotate: '7deg' }, { translateX: 22 }, { scale: 0.97 }],
  },
  frontCard: {
    bottom: 12,
    height: 224,
    overflow: 'hidden',
    borderColor: MATCHMAKER_HOME.borderStrong,
    padding: SPACING.comfortable,
    shadowColor: MATCHMAKER_HOME.primary,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 10,
  },
  profileMark: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(180, 138, 232, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(180, 138, 232, 0.26)',
    overflow: 'hidden',
  },
  profileHead: {
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: MATCHMAKER_HOME.mutedForeground,
    opacity: 0.74,
    marginTop: 5,
  },
  profileShoulders: {
    width: 34,
    height: 18,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: MATCHMAKER_HOME.mutedForeground,
    opacity: 0.74,
    marginTop: 4,
  },
  criteria: {
    marginTop: SPACING.base,
    gap: 10,
  },
  criterionRow: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.base,
  },
  criterionLabel: {
    color: MATCHMAKER_HOME.foreground,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MATCHMAKER_HOME.primary,
  },
  scanBeam: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 56,
    alignItems: 'center',
  },
  scanGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  scanLine: {
    width: 2,
    height: '100%',
    backgroundColor: MATCHMAKER_HOME.orbRose,
    shadowColor: MATCHMAKER_HOME.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  copy: {
    width: '100%',
    alignItems: 'center',
    gap: SPACING.tight,
  },
  eyebrow: {
    color: MATCHMAKER_HOME.primary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 1.35,
  },
  title: {
    maxWidth: 350,
    color: MATCHMAKER_HOME.foreground,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    maxWidth: 330,
    color: MATCHMAKER_HOME.mutedForeground,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    textAlign: 'center',
  },
  progressTrack: {
    width: '78%',
    maxWidth: 290,
    flexDirection: 'row',
    gap: 6,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: RADIUS.full,
    backgroundColor: MATCHMAKER_HOME.primary,
  },
});
