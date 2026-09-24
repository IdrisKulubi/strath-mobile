import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/hooks/use-theme';
import { HEIGHTS, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';

export function OptionRow({
  label,
  selected,
  disabled,
  onPress,
  haptic = true,
}: {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
  haptic?: boolean;
}) {
  const { colors } = useTheme();

  function handlePress() {
    if (haptic) {
      void Haptics.selectionAsync();
    }
    onPress();
  }

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.row,
        {
          borderColor: selected ? colors.primary : colors.controlBorder,
          backgroundColor: colors.control,
          opacity: disabled ? 0.45 : pressed ? 0.88 : 1,
        },
      ]}
    >
      <View style={styles.rowInner}>
        <Text style={[styles.rowLabel, { color: colors.foreground }]}>{label}</Text>
        <View
          style={[
            styles.radio,
            { borderColor: selected ? colors.primary : colors.mutedForeground },
          ]}
        >
          {selected ? <View style={[styles.radioDot, { backgroundColor: colors.primary }]} /> : null}
        </View>
      </View>
    </Pressable>
  );
}

export function OptionChip({
  label,
  selected,
  disabled,
  locked,
  onPress,
}: {
  label: string;
  selected: boolean;
  disabled?: boolean;
  locked?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  function handlePress() {
    if (locked) return;
    void Haptics.selectionAsync();
    onPress();
  }

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled: Boolean(disabled || locked) }}
      disabled={disabled || locked}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.chip,
        {
          borderColor: selected ? colors.primary : colors.controlBorder,
          backgroundColor: selected ? colors.controlActive : colors.control,
          opacity: disabled ? 0.45 : locked ? 0.72 : pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text style={[styles.chipLabel, { color: colors.foreground }]} numberOfLines={2}>
        {label}
        {locked ? ' · You' : ''}
      </Text>
    </Pressable>
  );
}

export function ChipRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.chipRow}>{children}</View>;
}

const styles = StyleSheet.create({
  row: {
    minHeight: HEIGHTS.optionRow,
    paddingHorizontal: SPACING.base,
    borderRadius: RADIUS.row,
    borderWidth: 1,
    justifyContent: 'center',
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.compact,
    minHeight: HEIGHTS.optionRow - SPACING.compact * 2,
  },
  rowLabel: { ...TYPOGRAPHY.body, fontWeight: '600', flex: 1, flexShrink: 1 },
  radio: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: RADIUS.full,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.tight },
  chip: {
    minHeight: HEIGHTS.touchMin,
    paddingHorizontal: SPACING.compact,
    paddingVertical: SPACING.tight,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    maxWidth: '100%',
  },
  chipLabel: { ...TYPOGRAPHY.callout, fontWeight: '500' },
});
