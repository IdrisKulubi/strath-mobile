import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/hooks/use-theme';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';

export const IMPORTANCE_WEIGHTS = [0, 1, 10, 50, 250] as const;

export const IMPORTANCE_LABELS: Record<number, string> = {
  0: 'Not a big deal',
  1: 'A little important',
  10: 'Somewhat important',
  50: 'Very important',
  250: 'Dealbreaker',
};

export function ImportanceSlider({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (weight: number) => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const index = useMemo(() => {
    const found = IMPORTANCE_WEIGHTS.indexOf(value as typeof IMPORTANCE_WEIGHTS[number]);
    return found >= 0 ? found : 2;
  }, [value]);

  const setIndex = useCallback(
    (nextIndex: number) => {
      const clamped = Math.min(IMPORTANCE_WEIGHTS.length - 1, Math.max(0, nextIndex));
      const next = IMPORTANCE_WEIGHTS[clamped];
      if (next !== value) {
        void Haptics.selectionAsync();
        onChange(next);
      }
    },
    [onChange, value],
  );

  const label = IMPORTANCE_LABELS[value] ?? IMPORTANCE_LABELS[10];

  return (
    <View style={styles.wrap}>
      <Text style={[styles.liveLabel, { color: colors.foreground }]} accessibilityLiveRegion="polite">
        {label}
      </Text>
      <View
        style={styles.trackHit}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="How important is this"
        accessibilityValue={{ text: label }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'increment') setIndex(index + 1);
          if (event.nativeEvent.actionName === 'decrement') setIndex(index - 1);
        }}
      >
        <View style={[styles.track, { backgroundColor: colors.muted }]}>
          {IMPORTANCE_WEIGHTS.map((weight, weightIndex) => (
            <Pressable
              key={weight}
              disabled={disabled}
              onPress={() => setIndex(weightIndex)}
              style={styles.stopHit}
              accessibilityRole="button"
              accessibilityLabel={IMPORTANCE_LABELS[weight]}
              accessibilityState={{ selected: weightIndex === index }}
            >
              <View
                style={[
                  styles.stop,
                  {
                    backgroundColor: weightIndex <= index ? colors.primary : colors.border,
                    transform: [{ scale: weightIndex === index ? 1.35 : 1 }],
                  },
                ]}
              />
            </Pressable>
          ))}
        </View>
      </View>
      <View style={styles.tickLabels}>
        <Text style={[styles.tickLabel, { color: colors.mutedForeground }]}>Low</Text>
        <Text style={[styles.tickLabel, { color: colors.mutedForeground }]}>High</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: SPACING.compact },
  liveLabel: { ...TYPOGRAPHY.headline },
  trackHit: { height: 44, justifyContent: 'center' },
  track: {
    height: 6,
    borderRadius: RADIUS.full,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  stopHit: { flex: 1, height: 44, justifyContent: 'center', alignItems: 'center' },
  stop: { width: 8, height: 8, borderRadius: RADIUS.full },
  tickLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  tickLabel: { ...TYPOGRAPHY.caption },
});
