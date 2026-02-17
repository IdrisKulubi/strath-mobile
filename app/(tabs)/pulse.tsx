import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';

export default function PulseTabScreen() {
  const { colors, isDark } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Campus Pulse</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Campus Pulse is coming soon. This section will host anonymous campus posts and reactions.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 13, fontWeight: '600' },
});
