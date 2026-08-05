import React from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';

import { MatchmakerOrb } from '@/components/matchmaker/matchmaker-orb';
import { Text } from '@/components/ui/text';
import { formatRemainingSearches } from '@/lib/matchmaker/conversation-ui';
import { MATCHMAKER_HOME, RADIUS, SPACING } from '@/lib/design-tokens';
import type { MatchmakerVisualState } from '@/lib/matchmaker/conversation-ui';
import type { MatchmakerConversationSession } from '@/types/matchmaker';

/** Floating header footprint reserved above conversation scroll. */
export const MATCHMAKER_FLOATING_HEADER_HEIGHT = 56;

const GLASS_TINT = 'rgba(30, 21, 43, 0.38)';
const GLASS_FALLBACK_OVERLAY = 'rgba(30, 21, 43, 0.52)';
const PILL_RADIUS = RADIUS.full;

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
  const remaining = session?.remainingSearches ?? 0;
  const quotaLabel = session ? formatRemainingSearches(remaining) : null;
  const quotaExhausted = remaining <= 0;

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <FloatingGlassPill style={styles.identityPill}>
        <MatchmakerOrb state={visualState} size={32} />
        <View style={styles.copy}>
          <Text style={styles.title}>Matchmaker</Text>
          <Text style={styles.status} numberOfLines={1}>
            {getVisualStatusLabel(visualState, candidateFirstName)}
          </Text>
        </View>
      </FloatingGlassPill>

      {quotaLabel ? (
        <FloatingGlassPill
          style={[styles.quotaPill, quotaExhausted && styles.quotaPillExhausted]}
        >
          <Text style={[styles.quota, quotaExhausted && styles.quotaExhausted]}>
            {quotaLabel}
          </Text>
        </FloatingGlassPill>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.tight,
    minHeight: MATCHMAKER_FLOATING_HEADER_HEIGHT,
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
    gap: SPACING.compact,
    zIndex: 1,
    paddingLeft: 6,
  },
  identityPill: {
    flex: 1,
    minWidth: 0,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
    paddingRight: 14,
    paddingVertical: 8,
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
  quotaPill: {
    maxWidth: 140,
    justifyContent: 'center',
  },
  quotaPillExhausted: {
    borderColor: 'rgba(240, 120, 120, 0.45)',
  },
  quota: {
    color: MATCHMAKER_HOME.mutedForeground,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  quotaExhausted: {
    color: MATCHMAKER_HOME.error,
  },
});
