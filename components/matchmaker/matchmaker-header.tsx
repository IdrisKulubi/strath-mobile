import React, { createContext, use, useMemo, type PropsWithChildren } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { MINIMIZE_SPRING } from 'expo-glass-tabs';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MatchmakerOrb } from '@/components/matchmaker/matchmaker-orb';
import { Text } from '@/components/ui/text';
import { formatRemainingSearches } from '@/lib/matchmaker/conversation-ui';
import { MATCHMAKER_HOME, RADIUS, SPACING } from '@/lib/design-tokens';
import type { MatchmakerVisualState } from '@/lib/matchmaker/conversation-ui';
import type { MatchmakerConversationSession } from '@/types/matchmaker';

/** Floating header row height (excluding status-bar inset). */
export const MATCHMAKER_FLOATING_HEADER_HEIGHT = 56;

/** Total floating header footprint including status bar. */
export function getMatchmakerFloatingHeaderHeight(topInset: number): number {
  return topInset + MATCHMAKER_FLOATING_HEADER_HEIGHT;
}

const GLASS_TINT = 'rgba(30, 21, 43, 0.38)';
const GLASS_FALLBACK_OVERLAY = 'rgba(30, 21, 43, 0.52)';
const PILL_RADIUS = RADIUS.full;

type HeaderMinimizeState = {
  progress: SharedValue<number>;
  target: SharedValue<number>;
};

const HeaderMinimizeContext = createContext<HeaderMinimizeState | null>(null);

export function MatchmakerHeaderScrollProvider({ children }: PropsWithChildren) {
  const progress = useSharedValue(0);
  const target = useSharedValue(0);
  const state = useMemo(() => ({ progress, target }), [progress, target]);
  return <HeaderMinimizeContext.Provider value={state}>{children}</HeaderMinimizeContext.Provider>;
}

export function useMatchmakerHeaderMinimizeState(): HeaderMinimizeState {
  const shared = use(HeaderMinimizeContext);
  const progress = useSharedValue(0);
  const target = useSharedValue(0);
  const local = useMemo(() => ({ progress, target }), [progress, target]);
  return shared ?? local;
}

export function useMatchmakerHeaderMinimized(): SharedValue<number> {
  return useMatchmakerHeaderMinimizeState().progress;
}

export function setMatchmakerHeaderMinimized(state: HeaderMinimizeState, next: 0 | 1) {
  'worklet';
  if (state.target.value !== next) {
    state.target.value = next;
    state.progress.value = withSpring(next, MINIMIZE_SPRING);
  }
}

/** Normalized scroll offset that accounts for iOS contentInset. */
export function getNormalizedScrollOffsetY(
  contentOffsetY: number,
  contentInsetTop = 0,
  contentSizeHeight: number,
  layoutHeight: number,
) {
  'worklet';
  const maxY = Math.max(contentSizeHeight - layoutHeight + contentInsetTop, 0);
  return Math.min(Math.max(contentOffsetY + contentInsetTop, 0), maxY);
}

interface MatchmakerHeaderProps {
  session: MatchmakerConversationSession | null;
  visualState: MatchmakerVisualState;
  candidateFirstName?: string | null;
}

function getVisualStatusLabel(
  state: MatchmakerVisualState,
  candidateFirstName?: string | null,
) {
  if (state === 'searching') return 'Searching thoughtfully';
  if (state === 'thinking') return 'Thinking';
  if (state === 'success') {
    return candidateFirstName
      ? `I found someone for you`
      : 'A thoughtful match';
  }
  if (state === 'error') return 'Connection needs attention';
  if (state === 'paused') return 'Paused for today';
  return 'Your private guide';
}

function FloatingGlassPill({
  style,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const useLiquidGlass = isLiquidGlassAvailable();

  return (
    <View style={[styles.pillHost, style]}>
      {useLiquidGlass ? (
        <GlassView
          glassEffectStyle="regular"
          tintColor={GLASS_TINT}
          colorScheme="dark"
          style={[StyleSheet.absoluteFill, styles.glassSurface]}
        />
      ) : (
        <>
          <BlurView
            intensity={Platform.OS === 'ios' ? 55 : 40}
            tint="dark"
            style={[StyleSheet.absoluteFill, styles.glassSurface]}
          />
          <View style={[StyleSheet.absoluteFill, styles.blurOverlay]} />
        </>
      )}
      <View style={styles.pillContent}>{children}</View>
    </View>
  );
}

export function MatchmakerHeader({
  session,
  visualState,
  candidateFirstName,
}: MatchmakerHeaderProps) {
  const insets = useSafeAreaInsets();
  const headerProgress = useMatchmakerHeaderMinimized();
  const remaining = session?.remainingSearches ?? 0;
  const quotaLabel = session ? formatRemainingSearches(remaining) : null;
  const quotaExhausted = remaining <= 0;
  const hideDistance = getMatchmakerFloatingHeaderHeight(insets.top);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -headerProgress.value * hideDistance }],
    opacity: 1 - headerProgress.value * 0.35,
  }));

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingTop: insets.top }, animatedStyle]}
    >
      <FloatingGlassPill style={[styles.bar, quotaExhausted && styles.barExhausted]}>
        <View style={styles.identity}>
          <MatchmakerOrb state={visualState} size={32} />
          <View style={styles.copy}>
            <Text style={styles.title} numberOfLines={1}>Matchmaker</Text>
            <Text style={styles.status} numberOfLines={1}>
              {getVisualStatusLabel(visualState, candidateFirstName)}
            </Text>
          </View>
        </View>

        {quotaLabel ? (
          <Text style={[styles.quota, quotaExhausted && styles.quotaExhausted]} numberOfLines={2}>
            {quotaLabel}
          </Text>
        ) : null}
      </FloatingGlassPill>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: MATCHMAKER_FLOATING_HEADER_HEIGHT,
    paddingHorizontal: 12,
  },
  pillHost: {
    borderRadius: PILL_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: MATCHMAKER_HOME.navBorder,
    // Avoid overflow:hidden — it kills liquid glass on iOS.
  },
  glassSurface: {
    borderRadius: PILL_RADIUS,
    borderCurve: 'continuous',
  },
  blurOverlay: {
    borderRadius: PILL_RADIUS,
    backgroundColor: GLASS_FALLBACK_OVERLAY,
    borderCurve: 'continuous',
  },
  pillContent: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.compact,
    zIndex: 1,
    paddingLeft: 6,
    paddingRight: 14,
    paddingVertical: 8,
  },
  bar: {
    flex: 1,
    minWidth: 0,
  },
  barExhausted: {
    borderColor: 'rgba(240, 120, 120, 0.35)',
  },
  identity: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.compact,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  title: {
    color: MATCHMAKER_HOME.foreground,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
  },
  status: {
    color: MATCHMAKER_HOME.subtleForeground,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500',
  },
  quota: {
    flexShrink: 0,
    maxWidth: '42%',
    color: MATCHMAKER_HOME.mutedForeground,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  quotaExhausted: {
    color: MATCHMAKER_HOME.error,
  },
});
