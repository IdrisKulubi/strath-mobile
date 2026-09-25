import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { HEIGHTS, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';

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
  const visibilityLabel = isPublic ? 'On your profile' : 'Matching only';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Edit answer ${index}: ${prompt}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.control,
          borderColor: colors.controlBorder,
          opacity: pressed ? 0.88 : 1,
        },
      ]}
    >
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text style={[styles.indexPrefix, { color: colors.mutedForeground }]}>{index}.</Text>
          <Text style={[styles.prompt, { color: colors.foreground }]} numberOfLines={3}>{prompt}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
        </View>
        <View style={styles.metaRow}>
          <View
            style={[
              styles.visibilityPill,
              {
                borderColor: isPublic ? colors.primary : colors.controlBorder,
                backgroundColor: isPublic ? colors.controlActive : 'transparent',
              },
            ]}
          >
            <Ionicons
              name={isPublic ? 'eye-outline' : 'lock-closed-outline'}
              size={12}
              color={isPublic ? colors.primaryText : colors.mutedForeground}
            />
            <Text style={[styles.visibilityText, { color: isPublic ? colors.primaryText : colors.mutedForeground }]}>
              {visibilityLabel}
            </Text>
          </View>
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
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  visibilityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.micro,
    paddingHorizontal: SPACING.tight,
    paddingVertical: SPACING.micro,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  visibilityText: { ...TYPOGRAPHY.caption, fontWeight: '600' },
});
