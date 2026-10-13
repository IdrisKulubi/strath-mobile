import { useEffect, useRef } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/hooks/use-theme';
import { SPACING, TYPOGRAPHY } from '@/lib/design-tokens';

const easeOut = Easing.bezier(0.22, 1, 0.36, 1);

/** A brief connection gesture, shared by first and subsequent launches. */
export function ConnectionSplash({ onComplete, preview = false }: {
  onComplete: () => void;
  /** Hold the final composition for the development preview. */
  preview?: boolean;
}) {
  const { colors, isDark } = useTheme();
  const reduceMotion = useReducedMotion();
  const join = useSharedValue(1);
  const reveal = useSharedValue(1);
  const completeRef = useRef(onComplete);
  useEffect(() => { completeRef.current = onComplete; }, [onComplete]);

  useEffect(() => {
    if (preview) return;
    if (!reduceMotion) {
      join.value = 0;
      reveal.value = 0;
      join.value = withTiming(1, { duration: 440, easing: easeOut });
      reveal.value = withDelay(120, withTiming(1, { duration: 220, easing: easeOut }));
    }
    // No looping animation, launch haptic, or blank fade before the next screen.
    const timer = setTimeout(() => completeRef.current(), reduceMotion ? 250 : 850);
    return () => {
      clearTimeout(timer);
      cancelAnimation(join);
      cancelAnimation(reveal);
    };
  }, [join, preview, reduceMotion, reveal]);

  const leftRing = useAnimatedStyle(() => ({ transform: [{ translateX: -16 * (1 - join.value) }] }));
  const rightRing = useAnimatedStyle(() => ({ transform: [{ translateX: 16 * (1 - join.value) }] }));
  const wordmark = useAnimatedStyle(() => ({ opacity: reveal.value, transform: [{ translateY: 8 * (1 - reveal.value) }] }));

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={styles.composition} accessible accessibilityLabel="StrathSpace. Good connections start here.">
        <View style={styles.mark} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Animated.View style={[styles.ring, styles.left, { borderColor: colors.controlBorder }, leftRing]} />
          <Animated.View style={[styles.ring, styles.right, { borderColor: colors.controlBorder }, rightRing]} />
          <View style={[styles.disc, { backgroundColor: colors.sheet }]}>
            <Image source={require('@/assets/images/logos/LOGO.png')} style={styles.logo} resizeMode="contain" />
          </View>
        </View>
        <Animated.View style={[styles.copy, wordmark]}>
          <Text style={[styles.name, { color: colors.foreground }]}>StrathSpace<Text style={{ color: colors.primaryText }}>.</Text></Text>
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>Good connections start here.</Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, width: '100%' },
  composition: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.large, paddingBottom: SPACING.xl },
  mark: { width: 240, height: 188, justifyContent: 'center', alignItems: 'center' },
  ring: { position: 'absolute', width: 164, height: 164, borderRadius: 82, borderWidth: 1 },
  left: { left: 6, top: 12 },
  right: { right: 6, top: 12 },
  disc: { width: 116, height: 116, borderRadius: 58, justifyContent: 'center', alignItems: 'center' },
  logo: { width: 88, height: 88 },
  copy: { alignItems: 'center', gap: SPACING.compact, marginTop: SPACING.section },
  name: { ...TYPOGRAPHY.display, textAlign: 'center', letterSpacing: -0.6 },
  tagline: { ...TYPOGRAPHY.callout, textAlign: 'center' },
});
