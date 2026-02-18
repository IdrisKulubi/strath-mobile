import React, { useCallback, useEffect, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, View, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { useWeeklyDrop, WeeklyDropMatch } from '@/hooks/use-weekly-drop';
import { ConnectionSentPopup, WeeklyDrop } from '@/components/wingman';
import { useAgent } from '@/hooks/use-agent';
import * as Haptics from 'expo-haptics';

export default function DropsTabScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const weeklyDrop = useWeeklyDrop();
  const agent = useAgent();
  const [connectionSentFor, setConnectionSentFor] = React.useState<string | null>(null);
  const [sentConnectionsByUserId, setSentConnectionsByUserId] = React.useState<Record<string, true>>({});
  const autoDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoading = weeklyDrop.isCurrentLoading || weeklyDrop.isHistoryLoading;
  const hasDropData = Boolean(weeklyDrop.currentDrop) || weeklyDrop.dropHistory.length > 0;

  useEffect(() => {
    if (!connectionSentFor) return;

    if (autoDismissRef.current) {
      clearTimeout(autoDismissRef.current);
      autoDismissRef.current = null;
    }

    // Modal blocks all touches; auto-dismiss keeps Drops usable.
    autoDismissRef.current = setTimeout(() => {
      setConnectionSentFor(null);
      autoDismissRef.current = null;
    }, 1800);

    return () => {
      if (autoDismissRef.current) {
        clearTimeout(autoDismissRef.current);
        autoDismissRef.current = null;
      }
    };
  }, [connectionSentFor]);

  const handleConnectFromDrop = useCallback(async (dropMatch: WeeklyDropMatch) => {
    if (sentConnectionsByUserId[dropMatch.userId]) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Alert.alert('Already sent', 'You already sent a connection to this person.');
      return { matched: false, matchId: null };
    }

    try {
      const introMessage = dropMatch.starters?.[0];
      const result = await agent.connectWithIntro(dropMatch.userId, introMessage);

      setSentConnectionsByUserId((prev) => ({ ...prev, [dropMatch.userId]: true }));

      if (result.matched && result.matchId) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.push({ pathname: '/chat/[matchId]', params: { matchId: result.matchId } });
        return { matched: true, matchId: result.matchId };
      }

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setConnectionSentFor(dropMatch.profile?.firstName || 'They');
      return { matched: false, matchId: null };
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const message = error instanceof Error ? error.message : 'Failed to connect';
      Alert.alert('Connect', message);
      return { matched: false, matchId: null };
    }
  }, [agent, router, sentConnectionsByUserId]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Weekly Drops</Text>
        </View>

        {isLoading && !hasDropData ? (
          <View style={[styles.stateCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <View style={[styles.skeletonLine, { backgroundColor: colors.border, width: '55%' }]} />
            <View style={[styles.skeletonLine, { backgroundColor: colors.border, width: '85%' }]} />
            <View style={[styles.skeletonLine, { backgroundColor: colors.border, width: '70%' }]} />
          </View>
        ) : !hasDropData ? (
          <View style={[styles.stateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No weekly drop yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>Your next curated drop will appear here once generated.</Text>
            <Pressable style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={() => router.push('/(tabs)/explore')}>
              <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>Go to Find</Text>
            </Pressable>
          </View>
        ) : (
          <WeeklyDrop
            currentDrop={weeklyDrop.currentDrop}
            history={weeklyDrop.dropHistory}
            isLoading={isLoading}
            onRefresh={() => {
              weeklyDrop.refetchCurrent();
              weeklyDrop.refetchHistory();
            }}
            onTalkToAgent={() => router.push('/(tabs)/explore')}
            onViewHistory={() => router.push('/weekly-drop-history')}
            onConnect={handleConnectFromDrop}
            disabledConnectUserIds={Object.keys(sentConnectionsByUserId)}
          />
        )}
      </ScrollView>

      <ConnectionSentPopup
        visible={Boolean(connectionSentFor)}
        firstName={connectionSentFor}
        onClose={() => setConnectionSentFor(null)}
      />
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
  title: { fontSize: 26, fontWeight: '800', lineHeight: 32, paddingTop: 1 },
  stateCard: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 21,
    paddingTop: 1,
  },
  emptySubtitle: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  primaryButton: {
    marginTop: 4,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
