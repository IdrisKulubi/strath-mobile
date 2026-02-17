import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { useWeeklyDrop } from '@/hooks/use-weekly-drop';
import { WeeklyDrop } from '@/components/wingman';

export default function DropsTabScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const weeklyDrop = useWeeklyDrop();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Weekly Drops</Text>
          <Pressable onPress={() => router.push({ pathname: '/ui-preview/[stage]', params: { stage: 'weekly-drop' } })}>
            <Text style={[styles.link, { color: colors.primary }]}>Preview flow</Text>
          </Pressable>
        </View>

        <WeeklyDrop
          currentDrop={weeklyDrop.currentDrop}
          history={weeklyDrop.dropHistory}
          isLoading={weeklyDrop.isCurrentLoading}
          onRefresh={() => {
            weeklyDrop.refetchCurrent();
            weeklyDrop.refetchHistory();
          }}
          onTalkToAgent={() => router.push('/(tabs)/explore')}
          onViewHistory={() => router.push('/weekly-drop-history')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingTop: 10, paddingBottom: 24 },
  header: {
    paddingHorizontal: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 26, fontWeight: '800' },
  link: { fontSize: 12, fontWeight: '700' },
});
