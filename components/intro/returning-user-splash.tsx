import { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, AccessibilityInfo } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/use-theme';
import { getIntroPalette } from '@/constants/intro-theme';

const easeOut = Easing.bezier(0.22, 1, 0.36, 1);

/**
 * Minimal “Uber-style” open for returning users: logo only, ~1s, no tagline or slides.
 */
export function ReturningUserSplash({ onComplete }: { onComplete: () => void }) {
  const { colorScheme, colors } = useTheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const p = getIntroPalette(scheme);

  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.97);
  const rootOpacity = useSharedValue(1);

  const doneRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onCompleteRef.current();
  };

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const run = async () => {
      const reduce = await AccessibilityInfo.isReduceMotionEnabled();
      const logoIn = reduce ? 120 : 380;
      const hold = reduce ? 100 : 280;
      const outMs = reduce ? 160 : 340;
      const total = logoIn + hold + outMs + 32;

      if (reduce) {
        logoOpacity.value = 1;
        logoScale.value = 1;
        rootOpacity.value = withDelay(logoIn + hold, withTiming(0, { duration: outMs, easing: easeOut }));
      } else {
        logoOpacity.value = withTiming(1, { duration: logoIn, easing: easeOut });
        logoScale.value = withTiming(1, { duration: logoIn, easing: easeOut });
        rootOpacity.value = withDelay(
          logoIn + hold,
          withTiming(0, { duration: outMs, easing: easeOut })
        );
      }

      timer = setTimeout(finish, total);
    };

    run();

    return () => {
      if (timer) clearTimeout(timer);
      cancelAnimation(logoOpacity);
      cancelAnimation(logoScale);
      cancelAnimation(rootOpacity);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Reanimated SharedValues stable
  }, []);

  const rootStyle = useAnimatedStyle(() => ({
    opacity: rootOpacity.value,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  return (
    <Animated.View
      style={[styles.fill, rootStyle, { backgroundColor: colors.background }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <LinearGradient
        colors={[p.baseTop, p.baseBottom]}
        locations={[0, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[StyleSheet.absoluteFill, { opacity: 0.88 }]}
      />

      <View style={styles.center}>
        <Animated.View style={logoStyle}>
          <View
            style={[
              styles.disc,
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
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disc: {
    width: 108,
    height: 108,
    borderRadius: 54,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  logo: {
    width: 62,
    height: 62,
  },
});
