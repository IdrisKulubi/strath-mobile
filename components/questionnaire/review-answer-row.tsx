import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { HEIGHTS, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';

export function ReviewAnswerRow({
  index,
  prompt,
  onPress,
}: {
  index: number;
  prompt: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Edit answer ${index}: ${prompt}`}
      onPress={onPress}
      style={[
        styles.row,
        {
          backgroundColor: colors.control,
          borderColor: colors.controlBorder,
        },
      ]}
    >
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text style={[styles.indexPrefix, { color: colors.mutedForeground }]}>{index}.</Text>
          <Text style={[styles.prompt, { color: colors.foreground }]} numberOfLines={3}>{prompt}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: HEIGHTS.optionRow,
    padding: SPACING.compact,
    borderRadius: RADIUS.row,
    borderWidth: StyleSheet.hairlineWidth,
  },
  copy: { gap: SPACING.tight },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.tight,
  },
  indexPrefix: {
    ...TYPOGRAPHY.body,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    minWidth: 28,
    lineHeight: TYPOGRAPHY.body.lineHeight,
  },
  prompt: { ...TYPOGRAPHY.body, fontWeight: '600', flex: 1 },
});
