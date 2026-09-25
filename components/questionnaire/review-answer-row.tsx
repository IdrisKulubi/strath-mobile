import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';

export function ReviewAnswerRow({
  index,
  prompt,
  isPublic,
  onPress,
}: {
  index: number;
  prompt: string;
  isPublic: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderColor: colors.border, backgroundColor: colors.card, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Text style={[styles.index, { color: colors.mutedForeground }]}>{index}.</Text>
      <View style={styles.copy}>
        <Text style={[styles.prompt, { color: colors.foreground }]} numberOfLines={2}>{prompt}</Text>
        <Text style={[styles.tag, { color: colors.mutedForeground }]}>{isPublic ? 'Public' : 'Private'}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    flexDirection: 'row',
    gap: SPACING.compact,
    padding: SPACING.base,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'flex-start',
  },
  index: { ...TYPOGRAPHY.callout, fontVariant: ['tabular-nums'], width: 24 },
  copy: { flex: 1, gap: SPACING.micro },
  prompt: { ...TYPOGRAPHY.callout, fontWeight: '600' },
  tag: { ...TYPOGRAPHY.caption },
});
