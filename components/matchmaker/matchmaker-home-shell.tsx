import React from 'react';
import { StyleSheet, View } from 'react-native';
import { HeartHandshake } from 'lucide-react-native';

import { MatchmakerConversation } from '@/components/matchmaker/matchmaker-conversation';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';

export function MatchmakerHomeShell() {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      <View style={styles.statusRow}>
        <View style={[styles.statusIcon, { backgroundColor: colors.secondary }]}>
          <HeartHandshake size={18} color={colors.primary} />
        </View>
        <View style={styles.statusCopy}>
          <Text style={[styles.statusLabel, { color: colors.mutedForeground }]}>
            Today's matchmaker
          </Text>
          <Text style={[styles.statusTitle, { color: colors.foreground }]}>
            I will help you choose one person worth meeting.
          </Text>
        </View>
      </View>

      <MatchmakerConversation />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: SPACING.comfortable,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.compact,
  },
  statusIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCopy: {
    flex: 1,
    minWidth: 0,
  },
  statusLabel: {
    ...TYPOGRAPHY.label,
  },
  statusTitle: {
    marginTop: 2,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
  },
});
