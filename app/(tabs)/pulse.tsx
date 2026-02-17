import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';

export default function PulseTabScreen() {
  const router = useRouter();
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
          This tab is staged as preview now. Final feed UI opens below.
        </Text>

        <Pressable style={[styles.button, { backgroundColor: colors.primary }]} onPress={() => router.push({ pathname: '/ui-preview/[stage]', params: { stage: 'pulse' } })}>
          <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Open Pulse Mock</Text>
        </Pressable>
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
  button: {
    marginTop: 6,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: { fontSize: 13, fontWeight: '800' },
});
