import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { BatchSegmentProgress } from '@/components/questionnaire/segmented-progress';
import { useTheme } from '@/hooks/use-theme';
import { SPACING, TYPOGRAPHY } from '@/lib/design-tokens';

export function QuestionTopBar({
  batchProgress,
  batchLabel,
  onSkip,
  skipDisabled,
}: {
  batchProgress: number;
  batchLabel?: string;
  onSkip: () => void;
  skipDisabled?: boolean;
}) {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/dating' as never))}
          hitSlop={8}
          style={styles.backHit}
        >
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <View style={styles.progress}>
          <BatchSegmentProgress value={batchProgress} label={batchLabel} />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Skip question"
          disabled={skipDisabled}
          onPress={onSkip}
          hitSlop={8}
          style={[styles.skipHit, { opacity: skipDisabled ? 0.4 : 1 }]}
        >
          <Text style={[styles.skip, { color: colors.mutedForeground }]}>Skip</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: SPACING.tight },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.tight },
  backHit: { minWidth: 44, minHeight: 44, alignItems: 'flex-start', justifyContent: 'center' },
  progress: { flex: 1 },
  skipHit: { minWidth: 44, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' },
  skip: { ...TYPOGRAPHY.callout, fontWeight: '600' },
});
