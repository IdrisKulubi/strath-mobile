import React, { useCallback } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { HEIGHTS, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';

const DISTANCE_MIN = 1;
const DISTANCE_MAX = 500;

const PRESETS_KM = [10, 25, 50, 100];

export function RisingDistanceSlider({
  radiusKm,
  onChange,
  error,
}: {
  radiusKm: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const { colors } = useTheme();
  const km = clampDistance(Number(radiusKm) || 25);

  const bump = useCallback(() => {
    void Haptics.selectionAsync();
  }, []);

  const setKm = useCallback(
    (next: number) => {
      onChange(String(clampDistance(Math.round(next))));
    },
    [onChange],
  );

  return (
    <View style={styles.wrap}>
      <View style={[styles.previewCard, { backgroundColor: colors.control, borderColor: colors.controlBorder }]}>
        <Text style={[styles.previewKicker, { color: colors.mutedForeground }]}>Maximum distance</Text>
        <Text style={[styles.previewValue, { color: colors.foreground }]}>{km} km</Text>
      </View>

      <View style={styles.sliderBlock}>
        <View style={styles.sliderHeader}>
          <Text style={[styles.sliderLabel, { color: colors.foreground }]}>How far to search</Text>
          <View style={[styles.valueBadge, { backgroundColor: colors.controlActive, borderColor: colors.primary }]}>
            <Text style={[styles.valueBadgeText, { color: colors.primaryText }]}>{km}</Text>
          </View>
        </View>
        <Slider
          value={km}
          minimumValue={DISTANCE_MIN}
          maximumValue={DISTANCE_MAX}
          step={1}
          onValueChange={setKm}
          onSlidingComplete={bump}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.controlBorder}
          thumbTintColor={Platform.OS === 'ios' ? colors.primary : colors.primary}
          style={styles.slider}
          accessibilityLabel="Maximum distance in kilometres"
          accessibilityValue={{ min: DISTANCE_MIN, max: DISTANCE_MAX, now: km, text: `${km} kilometres` }}
        />
      </View>

      <View style={styles.presetRow}>
        {PRESETS_KM.map((preset) => {
          const active = km === preset;
          return (
            <Pressable
              key={preset}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => {
                bump();
                setKm(preset);
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
                {preset} km
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.tickRow}>
        <Text style={[styles.tick, { color: colors.mutedForeground }]}>{DISTANCE_MIN} km</Text>
        <Text style={[styles.tick, { color: colors.mutedForeground }]}>{DISTANCE_MAX} km</Text>
      </View>

      {error ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
    </View>
  );
}

function clampDistance(value: number) {
  return Math.min(DISTANCE_MAX, Math.max(DISTANCE_MIN, value));
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
