import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Pressable,
  AccessibilityInfo,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { GradientGlowBackground } from '@/components/intro/gradient-glow-background';
import { IntroHeadlineBlock } from '@/components/intro/intro-headline-block';
import { useTheme } from '@/hooks/use-theme';
import { markIntroSlidesCompleted } from '@/lib/intro-storage';
import { Colors } from '@/constants/theme';
import { Text } from '@/components/ui/text';

const SLIDES = [
  {
    id: '1',
    headline: 'Skip the endless swiping',
    subheadline: 'We show you a few people you’re actually likely to click with.',
  },
  {
    id: '2',
    headline: 'Mutual interest, made intentional',
    subheadline: 'Only real possibilities. No crowded inboxes. No randomness.',
  },
  {
    id: '3',
    headline: 'Built for real-world dates',
    subheadline: 'From curated matches to quick calls to real meetups.',
  },
];

type Props = {
  onComplete: () => void;
};

export function FirstLaunchIntroSlides({ onComplete }: Props) {
  const { width, height } = useWindowDimensions();
  const { colorScheme } = useTheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const c = Colors[scheme];
  const listRef = useRef<FlatList>(null);
  const [page, setPage] = useState(0);

  const complete = useCallback(async () => {
    await markIntroSlidesCompleted();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onComplete();
  }, [onComplete]);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const i = Math.round(x / width);
      if (i !== page && i >= 0 && i < SLIDES.length) setPage(i);
    },
    [page, width]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: (typeof SLIDES)[0]; index: number }) => (
      <View style={[styles.slide, { width, minHeight: height * 0.58 }]}>
        <View style={styles.visualMount}>
          {index === 0 ? <VisualStack scheme={scheme} /> : null}
          {index === 1 ? <VisualConnection scheme={scheme} /> : null}
          {index === 2 ? <VisualPath scheme={scheme} /> : null}
        </View>
        <IntroHeadlineBlock
          scheme={scheme}
          headline={item.headline}
          subheadline={item.subheadline}
          align="left"
        />
      </View>
    ),
    [scheme, width, height]
  );

  return (
    <View style={styles.root} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <GradientGlowBackground scheme={scheme} style={styles.fill} />
      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable
            onPress={complete}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Skip intro"
          >
            <Text style={[styles.skip, { color: c.mutedForeground }]}>Skip</Text>
          </Pressable>
        </View>

        <FlatList
          ref={listRef}
          data={SLIDES}
          keyExtractor={(it) => it.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          renderItem={renderItem}
          onScroll={onScroll}
          scrollEventThrottle={16}
          decelerationRate="fast"
          snapToInterval={width}
          snapToAlignment="start"
          style={styles.list}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          onScrollToIndexFailed={({ index }) => {
            setTimeout(() => {
              listRef.current?.scrollToIndex({ index, animated: true });
            }, 100);
          }}
        />

        <View style={styles.footer}>
          <View style={styles.dots}>
            {SLIDES.map((s, i) => (
              <View
                key={s.id}
                style={[
                  styles.dot,
                  { backgroundColor: i === page ? c.primary : c.muted },
                  i === page && styles.dotActive,
                ]}
              />
            ))}
          </View>
          {page === SLIDES.length - 1 ? (
            <Pressable
              style={[styles.cta, { backgroundColor: c.primary }]}
              onPress={complete}
              accessibilityRole="button"
              accessibilityLabel="Enter StrathSpace"
            >
              <Text style={styles.ctaText}>Enter StrathSpace</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.ctaGhost, { borderColor: c.border }]}
              onPress={() => listRef.current?.scrollToIndex({ index: page + 1, animated: true })}
              accessibilityRole="button"
              accessibilityLabel="Next intro slide"
            >
              <Text style={[styles.ctaGhostText, { color: c.foreground }]}>Next</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

function useFloat(amp: number, duration: number, reduce: boolean) {
  const y = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    y.value = withRepeat(
      withSequence(
        withTiming(-amp, { duration, easing: Easing.inOut(Easing.quad) }),
        withTiming(amp, { duration, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    return () => cancelAnimation(y);
  }, [amp, duration, reduce, y]);
  return useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
}

function VisualStack({ scheme }: { scheme: 'light' | 'dark' }) {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
  }, []);
  const a1 = useFloat(5, 2400, reduce);
  const a2 = useFloat(7, 2800, reduce);
  const c = Colors[scheme];
  const card = scheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.85)';
  const border = scheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(233,30,140,0.15)';

  return (
    <View style={styles.vStack}>
      <Animated.View style={[styles.cardGhost, { backgroundColor: card, borderColor: border }, a2, { left: 18, top: 8 }]} />
      <Animated.View style={[styles.cardGhost, { backgroundColor: card, borderColor: border }, a1, { left: 0, top: 0 }]} />
      <LinearGradient
        colors={[c.primary + '55', c.accent + '44']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.cardFront, { borderColor: c.primary + '44' }]}
      >
        <View style={[styles.avatarPlaceholder, { backgroundColor: c.muted }]} />
        <View style={styles.lineShort} />
      </LinearGradient>
    </View>
  );
}

function VisualConnection({ scheme }: { scheme: 'light' | 'dark' }) {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
  }, []);
  const dx = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    dx.value = withRepeat(
      withSequence(
        withTiming(6, { duration: 2000, easing: Easing.inOut(Easing.quad) }),
        withTiming(-4, { duration: 2000, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    return () => cancelAnimation(dx);
  }, [reduce, dx]);
  const move = useAnimatedStyle(() => ({
    transform: [{ translateX: dx.value }],
  }));
  const c = Colors[scheme];
  const cardBg = scheme === 'dark' ? 'rgba(61,36,89,0.95)' : '#ffffff';

  return (
    <View style={styles.vConn}>
      <View style={[styles.connCard, { backgroundColor: cardBg, borderColor: c.border }]}>
        <View style={[styles.miniAv, { backgroundColor: c.muted }]} />
      </View>
      <Animated.View style={[styles.glowLineWrap, move]}>
        <LinearGradient
          colors={['transparent', c.primary, 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.glowLine}
        />
      </Animated.View>
      <View style={[styles.connCard, { backgroundColor: cardBg, borderColor: c.border }]}>
        <View style={[styles.miniAv, { backgroundColor: c.muted }]} />
      </View>
    </View>
  );
}

function VisualPath({ scheme }: { scheme: 'light' | 'dark' }) {
  const c = Colors[scheme];
  const steps = [c.primary, c.accent, c.chart4];
  return (
    <View style={styles.vPath}>
      {steps.map((col, i) => (
        <View key={i} style={styles.pathRow}>
          <LinearGradient
            colors={[col + 'cc', col + '44']}
            style={[styles.pathDot, { borderColor: col + '88' }]}
          />
          {i < steps.length - 1 ? (
            <View style={[styles.pathDash, { backgroundColor: c.border }]} />
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  fill: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 22,
    paddingTop: 4,
    paddingBottom: 8,
  },
  skip: {
    fontSize: 16,
    fontWeight: '500',
  },
  slide: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 12,
    justifyContent: 'flex-start',
  },
  visualMount: {
    height: 220,
    marginBottom: 28,
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: 28,
    paddingBottom: 12,
    gap: 18,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    opacity: 0.45,
  },
  dotActive: {
    width: 22,
    opacity: 1,
    borderRadius: 4,
  },
  cta: {
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  ctaGhost: {
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  ctaGhostText: {
    fontSize: 17,
    fontWeight: '600',
  },
  vStack: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardGhost: {
    position: 'absolute',
    width: 200,
    height: 132,
    borderRadius: 22,
    borderWidth: 1,
  },
  cardFront: {
    width: 210,
    height: 138,
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    justifyContent: 'flex-end',
  },
  avatarPlaceholder: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  lineShort: {
    height: 8,
    width: '55%',
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  vConn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  connCard: {
    width: 88,
    height: 118,
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    justifyContent: 'flex-start',
  },
  miniAv: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  glowLineWrap: {
    width: 44,
    height: 4,
    justifyContent: 'center',
  },
  glowLine: {
    flex: 1,
    borderRadius: 2,
  },
  vPath: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  pathRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pathDot: {
    width: 56,
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
  },
  pathDash: {
    width: 28,
    height: 3,
    borderRadius: 2,
    marginHorizontal: 4,
    opacity: 0.6,
  },
});
