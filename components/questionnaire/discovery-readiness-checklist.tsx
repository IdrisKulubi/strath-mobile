import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { HEIGHTS, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { checklistRowAction, discoveryChecklistRows, type DiscoveryChecklistRow } from '@/lib/discovery-readiness';
import type { DiscoveryBlocker } from '@/lib/questionnaire';

interface DiscoveryReadinessChecklistProps {
  missing: DiscoveryBlocker[];
}

function ChecklistRow({ row, missing, onPress }: { row: DiscoveryChecklistRow; missing: DiscoveryBlocker[]; onPress: () => void }) {
  const { colors } = useTheme();
  const done = row.done;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: done }}
      disabled={done}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.control,
          borderColor: done ? colors.controlBorder : colors.primary,
          opacity: done ? 0.72 : pressed ? 0.88 : 1,
        },
      ]}
    >
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text style={[styles.label, { color: colors.foreground }]}>{row.label}</Text>
          {done ? (
            <View style={[styles.indicator, { borderColor: colors.success, backgroundColor: colors.success }]}>
              <Ionicons name="checkmark" size={16} color={colors.primaryForeground} />
            </View>
          ) : (
            <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
          )}
        </View>
        <Text style={[styles.description, { color: colors.mutedForeground }]}>{row.description}</Text>
      </View>
    </Pressable>
  );
}

export function DiscoveryReadinessChecklist({ missing }: DiscoveryReadinessChecklistProps) {
  const router = useRouter();
  const rows = discoveryChecklistRows(missing);

  return (
    <View style={styles.list}>
      {rows.map((row) => (
        <ChecklistRow
          key={row.id}
          row={row}
          missing={missing}
          onPress={() => {
            const step = checklistRowAction(row, missing);
            router.push(step.href as never);
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: SPACING.compact },
  row: {
    minHeight: HEIGHTS.optionRow,
    borderRadius: RADIUS.row,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: SPACING.compact,
    paddingVertical: SPACING.compact,
  },
  indicator: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { gap: SPACING.micro },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.tight,
  },
  label: { ...TYPOGRAPHY.body, fontWeight: '600', flex: 1 },
  description: { ...TYPOGRAPHY.caption },
});
