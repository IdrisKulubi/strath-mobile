import React, { useCallback } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { HEIGHTS, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';

const AGE_MIN = 18;
const AGE_MAX = 100;

const PRESETS: { label: string; min: number; max: number }[] = [
  { label: '18–24', min: 18, max: 24 },
  { label: '25–34', min: 25, max: 34 },
  { label: '35–44', min: 35, max: 44 },
  { label: '45+', min: 45, max: 60 },
];

export function RisingAgeRangeSlider({
  minAge,
  maxAge,
  onChange,
  error,
}: {
  minAge: string;
  maxAge: string;
  onChange: (min: string, max: string) => void;
  error?: string;
}) {
  const { colors } = useTheme();
  const min = clampAge(Number(minAge) || AGE_MIN);
  const max = clampAge(Number(maxAge) || 40);
  const safeMin = Math.min(min, max);
  const safeMax = Math.max(min, max);

  const bump = useCallback(() => {
    void Haptics.selectionAsync();
  }, []);

  const setRange = useCallback(
    (nextMin: number, nextMax: number) => {
      const lo = clampAge(Math.min(nextMin, nextMax));
      const hi = clampAge(Math.max(nextMin, nextMax));
      onChange(String(lo), String(hi));
    },
    [onChange],
  );

  return (
    <View style={styles.wrap}>
      <View style={[styles.previewCard, { backgroundColor: colors.control, borderColor: colors.controlBorder }]}>
        <Text style={[styles.previewKicker, { color: colors.mutedForeground }]}>You are open to meeting</Text>
        <Text style={[styles.previewValue, { color: colors.foreground }]}>
          {safeMin === safeMax ? `Age ${safeMin}` : `Ages ${safeMin}–${safeMax}`}
        </Text>
      </View>

      <View style={styles.sliderBlock}>
        <View style={styles.sliderHeader}>
          <Text style={[styles.sliderLabel, { color: colors.foreground }]}>Youngest</Text>
          <View style={[styles.valueBadge, { backgroundColor: colors.controlActive, borderColor: colors.primary }]}>
            <Text style={[styles.valueBadgeText, { color: colors.primaryText }]}>{safeMin}</Text>
          </View>
        </View>
        <Slider
          value={safeMin}
          minimumValue={AGE_MIN}
          maximumValue={safeMax}
          step={1}
          onValueChange={(value) => setRange(Math.round(value), safeMax)}
          onSlidingComplete={bump}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.controlBorder}
          thumbTintColor={Platform.OS === 'ios' ? colors.primary : colors.primary}
          style={styles.slider}
          accessibilityLabel="Youngest age"
        />
      </View>

      <View style={styles.sliderBlock}>
        <View style={styles.sliderHeader}>
          <Text style={[styles.sliderLabel, { color: colors.foreground }]}>Oldest</Text>
          <View style={[styles.valueBadge, { backgroundColor: colors.controlActive, borderColor: colors.primary }]}>
            <Text style={[styles.valueBadgeText, { color: colors.primaryText }]}>{safeMax}</Text>
          </View>
        </View>
        <Slider
          value={safeMax}
          minimumValue={safeMin}
          maximumValue={AGE_MAX}
          step={1}
          onValueChange={(value) => setRange(safeMin, Math.round(value))}
          onSlidingComplete={bump}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.controlBorder}
          thumbTintColor={Platform.OS === 'ios' ? colors.primary : colors.primary}
          style={styles.slider}
          accessibilityLabel="Oldest age"
        />
      </View>

      <View style={styles.presetRow}>
        {PRESETS.map((preset) => {
          const active = safeMin === preset.min && safeMax === preset.max;
          return (
            <Pressable
              key={preset.label}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => {
                bump();
                setRange(preset.min, preset.max);
              }}
              style={({ pressed }) => [
                styles.presetPill,
                {
                  borderColor: active ? colors.primary : colors.controlBorder,
                  backgroundColor: active ? colors.controlActive : colors.control,
                  opacity: pressed ? 0.88 : 1,
                },
              ]}
            >
              <Text style={[styles.presetText, { color: active ? colors.primaryText : colors.foreground }]}>
                {preset.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.tickRow}>
        <Text style={[styles.tick, { color: colors.mutedForeground }]}>{AGE_MIN}</Text>
        <Text style={[styles.tick, { color: colors.mutedForeground }]}>{AGE_MAX}</Text>
      </View>

      {error ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
    </View>
  );
}

function clampAge(value: number) {
  return Math.min(AGE_MAX, Math.max(AGE_MIN, value));
}

const styles = StyleSheet.create({
  wrap: { gap: SPACING.compact },
  previewCard: {
    borderRadius: RADIUS.row,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: SPACING.section,
    paddingHorizontal: SPACING.base,
    alignItems: 'center',
    gap: SPACING.micro,
  },
  previewKicker: { ...TYPOGRAPHY.caption, fontWeight: '600' },
  previewValue: { ...TYPOGRAPHY.title, fontWeight: '700', textAlign: 'center' },
  sliderBlock: { gap: SPACING.tight },
  sliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sliderLabel: { ...TYPOGRAPHY.body, fontWeight: '600' },
  valueBadge: {
    minWidth: 44,
    minHeight: 32,
    paddingHorizontal: SPACING.compact,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueBadgeText: { ...TYPOGRAPHY.body, fontWeight: '700', fontVariant: ['tabular-nums'] },
  slider: {
    width: '100%',
    height: Platform.OS === 'ios' ? 40 : 48,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.tight,
    justifyContent: 'center',
  },
  presetPill: {
    minHeight: HEIGHTS.touchMin,
    paddingHorizontal: SPACING.compact,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetText: { ...TYPOGRAPHY.caption, fontWeight: '600' },
  tickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.micro,
  },
  tick: { ...TYPOGRAPHY.caption },
  error: { ...TYPOGRAPHY.caption, textAlign: 'center' },
});
