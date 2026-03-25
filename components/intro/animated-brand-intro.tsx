import { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, AccessibilityInfo } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { GradientGlowBackground } from '@/components/intro/gradient-glow-background';
import { useTheme } from '@/hooks/use-theme';
import { getIntroPalette } from '@/constants/intro-theme';
import { Text } from '@/components/ui/text';

/** First-time users only — full cinematic intro before editorial slides */
const TIMING = { logoIn: 720, tagDelay: 420, tagIn: 560, hold: 520, out: 500 };

const easeLux = Easing.bezier(0.22, 0.99, 0.36, 1);

type Props = {
  onComplete: () => void;
};

export function AnimatedBrandIntro({ onComplete }: Props) {
  const { colorScheme, colors } = useTheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const p = getIntroPalette(scheme);
  const t = TIMING;

  const glowShift = useSharedValue(0.35);
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.96);
  const tagOpacity = useSharedValue(0);
  const tagY = useSharedValue(10);
  const stageOpacity = useSharedValue(1);
  const stageY = useSharedValue(0);
  const solidOverlay = useSharedValue(0);

  const doneRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onCompleteRef.current();
  };

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const start = async () => {
      const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled();
      if (reduceMotion) {
        logoOpacity.value = 1;
        logoScale.value = 1;
        tagOpacity.value = 1;
        tagY.value = 0;
        timer = setTimeout(finish, 400);
        return;
      }

      glowShift.value = withRepeat(
        withSequence(
          withTiming(0.72, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.28, { duration: 2200, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        false
      );

      logoOpacity.value = withTiming(1, { duration: t.logoIn, easing: easeLux });
      logoScale.value = withTiming(1, { duration: t.logoIn, easing: easeLux });

      tagOpacity.value = withDelay(t.tagDelay, withTiming(1, { duration: t.tagIn, easing: easeLux }));
      tagY.value = withDelay(t.tagDelay, withTiming(0, { duration: t.tagIn, easing: easeLux }));

      const exitStart = t.tagDelay + t.tagIn + t.hold;
      const exitDur = t.out;

      stageOpacity.value = withDelay(exitStart, withTiming(0, { duration: exitDur, easing: easeLux }));
      stageY.value = withDelay(exitStart, withTiming(-32, { duration: exitDur, easing: easeLux }));
      solidOverlay.value = withDelay(exitStart, withTiming(1, { duration: exitDur, easing: easeLux }));

      timer = setTimeout(finish, exitStart + exitDur + 40);
    };

    start();

    return () => {
      if (timer) clearTimeout(timer);
      cancelAnimation(glowShift);
      cancelAnimation(logoOpacity);
      cancelAnimation(logoScale);
      cancelAnimation(tagOpacity);
      cancelAnimation(tagY);
      cancelAnimation(stageOpacity);
      cancelAnimation(stageY);
      cancelAnimation(solidOverlay);
    };
    // Reanimated SharedValues are stable; sequence runs once per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shared values omitted intentionally
  }, [t.hold, t.logoIn, t.out, t.tagDelay, t.tagIn]);

  const logoAnim = useAnimatedStyle(() => ({
    opacity: logoOpacity.value * stageOpacity.value,
    transform: [{ scale: logoScale.value }, { translateY: stageY.value * 0.35 }],
  }));

  const tagAnim = useAnimatedStyle(() => ({
    opacity: tagOpacity.value * stageOpacity.value,
    transform: [{ translateY: tagY.value + stageY.value * 0.5 }],
  }));

  const solidStyle = useAnimatedStyle(() => ({
    opacity: solidOverlay.value,
  }));

  return (
    <View style={styles.fill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <GradientGlowBackground scheme={scheme} glowShift={glowShift} style={styles.fill} />
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }, solidStyle]}
        pointerEvents="none"
      />

      <View style={styles.centerContent}>
        <Animated.View style={[styles.logoBlock, logoAnim]}>
          <View
            style={[
              styles.logoDisc,
              {
                backgroundColor: p.logoDisc,
                borderColor: p.logoBorder,
              },
            ]}
          >
            <Image
              source={require('@/assets/images/logos/LOGO.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        </Animated.View>

        <Animated.View style={[styles.tagWrap, tagAnim]}>
          <Text style={[styles.tagline, { color: p.textPrimary }]}>Real dates. No endless swiping.</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  centerContent: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoBlock: {
    marginBottom: 28,
  },
  logoDisc: {
    width: 132,
    height: 132,
    borderRadius: 66,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 16,
  },
  logo: {
    width: 76,
    height: 76,
  },
  tagWrap: {
    maxWidth: 300,
  },
  tagline: {
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: -0.2,
    textAlign: 'center',
    lineHeight: 24,
  },
});
