import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/use-theme';
import { SPACING, TYPOGRAPHY } from '@/lib/design-tokens';

export function ExpandableRow({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((value) => !value)}
        style={styles.header}
      >
        <Text style={[styles.title, { color: colors.mutedForeground }]}>{title}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.mutedForeground} />
      </Pressable>
      {open ? <Text style={[styles.body, { color: colors.mutedForeground }]}>{children}</Text> : null}
    </View>
  );
}

export function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  const linkColor = colors.primaryText;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.linkHit}>
      <Text style={[styles.link, { color: linkColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: SPACING.tight },
  header: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.tight },
  title: { ...TYPOGRAPHY.callout, fontWeight: '600', flex: 1 },
  body: { ...TYPOGRAPHY.caption, maxWidth: 640 },
  linkHit: { minHeight: 44, justifyContent: 'center' },
  link: { ...TYPOGRAPHY.callout, fontWeight: '600' },
});
