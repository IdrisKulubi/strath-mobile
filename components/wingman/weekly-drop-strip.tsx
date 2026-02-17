import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { WeeklyDropCurrent } from '@/hooks/use-weekly-drop';
import { Sparkle } from 'phosphor-react-native';

interface WeeklyDropStripProps {
  drop: WeeklyDropCurrent;
  onOpen: () => void;
}

function formatCountdown(totalSeconds: number) {
  if (totalSeconds <= 0) return 'Expired';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

export function WeeklyDropStrip({ drop, onOpen }: WeeklyDropStripProps) {
  const { colors, isDark } = useTheme();
  const [secondsLeft, setSecondsLeft] = useState(drop.remainingSeconds);

  useEffect(() => {
    setSecondsLeft(drop.remainingSeconds);
  }, [drop.remainingSeconds]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Pressable
      onPress={onOpen}
      style={[
        styles.container,
        {
          backgroundColor: isDark ? 'rgba(233,30,140,0.12)' : 'rgba(233,30,140,0.08)',
          borderColor: isDark ? 'rgba(233,30,140,0.22)' : 'rgba(233,30,140,0.2)',
        },
      ]}
    >
      <View style={styles.left}>
        <Sparkle size={14} color={colors.primary} weight="fill" />
        <Text style={[styles.title, { color: colors.foreground }]}>Weekly Drop 🎯</Text>
      </View>

      <View style={styles.right}>
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>{drop.matchCount} matches</Text>
        <Text style={[styles.meta, { color: colors.primary }]}>• {formatCountdown(secondsLeft)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
  },
  meta: {
    fontSize: 12,
    fontWeight: '700',
  },
});
