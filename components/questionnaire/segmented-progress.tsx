import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';
import { MOTION, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { ONBOARDING_ANSWER_TARGET } from '@/lib/questionnaire-flow';

const CHAPTER_SIZE = 5;
const CHAPTER_COUNT = Math.ceil(ONBOARDING_ANSWER_TARGET / CHAPTER_SIZE);
const TOTAL_ANSWERS = ONBOARDING_ANSWER_TARGET;

export function ChapterProgress({
  answerCount,
  showNumeral = true,
}: {
  answerCount: number;
  showNumeral?: boolean;
}) {
  const { colors } = useTheme();
  const clamped = Math.min(Math.max(0, answerCount), TOTAL_ANSWERS);
  const displayCount = Math.min(clamped, TOTAL_ANSWERS);

  return (
    <View style={styles.chapterWrap}>
      {showNumeral ? (
        <View style={styles.numeralBlock}>
          <Text style={[styles.numeralNow, { color: colors.foreground }]} accessibilityLabel={`${displayCount} of ${TOTAL_ANSWERS} answers saved`}>
            {displayCount}
          </Text>
          <Text style={[styles.numeralOf, { color: colors.mutedForeground }]}>of {TOTAL_ANSWERS}</Text>
        </View>
      ) : null}
      <View style={styles.chapterTrack} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: TOTAL_ANSWERS, now: clamped }}>
        {Array.from({ length: CHAPTER_COUNT }, (_, chapterIndex) => {
          const chapterStart = chapterIndex * CHAPTER_SIZE;
          const isComplete = clamped >= Math.min(chapterStart + CHAPTER_SIZE, TOTAL_ANSWERS);
          const isCurrent = clamped >= chapterStart && clamped < chapterStart + CHAPTER_SIZE;
          const active = isComplete || isCurrent;
          const trackColor = colors.controlBorder;
          return (
            <View
              key={chapterIndex}
              style={[
                styles.chapterPill,
                { backgroundColor: active ? colors.primary : trackColor },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

export function BatchSegmentProgress({
  value,
  total = CHAPTER_SIZE,
  label,
}: {
  value: number;
  total?: number;
  label?: string;
}) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const clamped = Math.min(Math.max(0, value), total);

  return (
    <View style={styles.batchWrap} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: total, now: clamped }} accessibilityLabel={label ?? `${clamped} of ${total}`}>
      <View style={styles.batchRow}>
        {Array.from({ length: total }, (_, index) => {
          const filled = index < clamped;
          return <BatchSegment key={index} filled={filled} reduceMotion={reduceMotion} />;
        })}
      </View>
      {label ? <Text style={[styles.batchLabel, { color: colors.mutedForeground }]}>{label}</Text> : null}
    </View>
  );
}

function BatchSegment({ filled, reduceMotion }: { filled: boolean; reduceMotion: boolean }) {
  const { colors } = useTheme();
  const scale = useSharedValue(filled ? 1 : 0);

  useEffect(() => {
    scale.value = reduceMotion
      ? (filled ? 1 : 0)
      : withTiming(filled ? 1 : 0, { duration: MOTION.short, easing: Easing.out(Easing.cubic) });
  }, [filled, reduceMotion, scale]);

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: scale.value }],
  }));

  return (
    <View style={[styles.batchSegmentTrack, { backgroundColor: colors.muted }]}>
      <Animated.View style={[styles.batchSegmentFill, { backgroundColor: colors.primary }, fillStyle]} />
    </View>
  );
}

export function ChapterProgressSkeleton() {
  const { colors } = useTheme();
  const trackColor = colors.controlBorder;
  return (
    <View style={styles.chapterWrap}>
      <View style={[styles.skeletonNumeral, { backgroundColor: colors.muted }]} />
      <View style={styles.chapterTrack}>
        {Array.from({ length: CHAPTER_COUNT }, (_, index) => (
          <View key={index} style={[styles.chapterPill, { backgroundColor: trackColor }]} />
        ))}
      </View>
    </View>
  );
}

export function chapterNumberFromAnswerCount(answerCount: number) {
  return Math.min(CHAPTER_COUNT, Math.max(1, Math.ceil(Math.max(1, answerCount) / CHAPTER_SIZE)));
}

const styles = StyleSheet.create({
  chapterWrap: { gap: SPACING.compact },
  numeralBlock: { flexDirection: 'row', alignItems: 'baseline', gap: SPACING.tight },
  numeralNow: { ...TYPOGRAPHY.display, fontVariant: ['tabular-nums'] },
  numeralOf: { ...TYPOGRAPHY.title, fontVariant: ['tabular-nums'] },
  chapterTrack: { flexDirection: 'row', gap: SPACING.tight },
  chapterPill: { flex: 1, height: 6, borderRadius: RADIUS.pill },
  batchWrap: { gap: SPACING.tight },
  batchRow: { flexDirection: 'row', gap: SPACING.tight },
  batchSegmentTrack: { flex: 1, height: 4, borderRadius: RADIUS.full, overflow: 'hidden' },
  batchSegmentFill: { height: '100%', width: '100%', borderRadius: RADIUS.full, transformOrigin: 'left' },
  batchLabel: { ...TYPOGRAPHY.caption, fontVariant: ['tabular-nums'] },
  skeletonNumeral: { width: 120, height: 34, borderRadius: RADIUS.sm },
  skeletonTrack: { width: '100%', height: 12, borderRadius: RADIUS.full },
});
