import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { useStartWingmanRound, useWingmanHistory, useWingmanPack, useWingmanStatus } from '@/hooks/use-wingman';
import type { AgentMatch } from '@/hooks/use-agent';
import { WingmanMatchCard, WingmanMatchDetail } from '@/components/wingman';
import { getAuthToken } from '@/lib/auth-helpers';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.strathspace.com';

export default function WingmanTabScreen() {
  const { colors, colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  const status = useWingmanStatus();
  const history = useWingmanHistory(5);
  const startRound = useStartWingmanRound();

  const [packEnabled, setPackEnabled] = useState(false);
  const pack = useWingmanPack(packEnabled);

  const [selectedMatch, setSelectedMatch] = useState<AgentMatch | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const activeLink = status.data?.activeLink;
  const linkProgress = useMemo(() => {
    if (!activeLink) return null;
    return {
      current: activeLink.currentSubmissions ?? 0,
      target: activeLink.targetSubmissions ?? 3,
      status: activeLink.status,
    };
  }, [activeLink]);

  const matches = (pack.data?.matches ?? []) as unknown as AgentMatch[];

  const handleStart = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPackEnabled(false);
    await startRound.mutateAsync();
  }, [startRound]);

  const handleShare = useCallback(async () => {
    if (!activeLink?.url) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Share.share({
      message: `Be my Wingman on StrathSpace 🪽\n\nAnswer 20s of prompts: ${activeLink.url}`,
    });
  }, [activeLink?.url]);

  const handleOpenPack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPackEnabled(true);
  }, []);

  const handleMatchPress = useCallback((match: AgentMatch) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedMatch(match);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedMatch(null);
  }, []);

  const handleConnectFromDetail = useCallback(async (match: AgentMatch, introMessage: string) => {
    try {
      setIsConnecting(true);
      const token = await getAuthToken();

      const swipeRes = await fetch(`${API_URL}/api/swipe`, {
        method: 'POST',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetUserId: match.profile.userId, action: 'like' }),
      });

      if (!swipeRes.ok) throw new Error('Failed to connect');
      const swipeJson = await swipeRes.json();
      const swipeData = swipeJson.data || swipeJson;
      const isMatch = Boolean(swipeData.isMatch);
      const matchId = swipeData.match?.id ?? null;

      if (isMatch && matchId && introMessage?.trim()) {
        const msgRes = await fetch(`${API_URL}/api/messages/${matchId}`, {
          method: 'POST',
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content: introMessage.trim() }),
        });
        if (!msgRes.ok) throw new Error('Match created but failed to send intro message');
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSelectedMatch(null);
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // ─── Loading / error ─────────────────────────────────────────────────────

  if (status.isLoading) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (status.isError) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.centered}>
          <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '700' }}>
            Couldn&apos;t load Wingman
          </Text>
          <TouchableOpacity
            onPress={() => status.refetch()}
            style={[styles.secondaryBtn, { borderColor: colors.border }]}
          >
            <Text style={{ color: colors.foreground, fontWeight: '600' }}>Try again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Wingman</Text>
        <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>Pass-the-phone. Better matches.</Text>
      </View>

      <View style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)', borderColor: colors.border }]}>
        {!activeLink ? (
          <>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Start a round</Text>
            <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
              Get 3 friends to describe you. We compile it into a Wingman Pack.
            </Text>
            <TouchableOpacity
              onPress={handleStart}
              disabled={startRound.isPending}
              style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: startRound.isPending ? 0.7 : 1 }]}
            >
              <Text style={styles.primaryBtnText}>{startRound.isPending ? 'Starting…' : 'Create Wingman Link'}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Round {activeLink.roundNumber}</Text>
            <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>Share this link with friends:</Text>
            <View style={[styles.linkRow, { borderColor: colors.border }]}> 
              <Text style={[styles.linkText, { color: colors.foreground }]} numberOfLines={1}>
                {activeLink.url}
              </Text>
              <TouchableOpacity onPress={handleShare} style={[styles.secondaryBtn, { borderColor: colors.border }]}>
                <Text style={{ color: colors.foreground, fontWeight: '600' }}>Share</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.progressText, { color: colors.mutedForeground }]}> 
              {linkProgress?.current}/{linkProgress?.target} replies
              {activeLink.status === 'ready' ? ' • Pack ready' : ''}
            </Text>

            <TouchableOpacity
              onPress={handleOpenPack}
              disabled={pack.isFetching}
              style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: pack.isFetching ? 0.7 : 1 }]}
            >
              <Text style={styles.primaryBtnText}>{pack.isFetching ? 'Opening…' : 'Open Wingman Pack'}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {packEnabled ? (
        <View style={styles.section}>
          {pack.isLoading ? (
            <View style={styles.centeredSmall}>
              <ActivityIndicator color={colors.primary} />
              <Text style={{ color: colors.mutedForeground, marginTop: 8 }}>Building your pack…</Text>
            </View>
          ) : pack.isError ? (
            <View style={styles.centeredSmall}>
              <Text style={{ color: colors.mutedForeground }}>Pack not ready yet.</Text>
            </View>
          ) : matches.length === 0 ? (
            <View style={styles.centeredSmall}>
              <Text style={{ color: colors.mutedForeground }}>No matches in this pack yet.</Text>
            </View>
          ) : (
            <>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your pack</Text>
              <View style={styles.matchesList}>
                {matches.map((m) => (
                  <WingmanMatchCard
                    key={m.profile.userId}
                    match={m}
                    onPress={handleMatchPress}
                  />
                ))}
              </View>
            </>
          )}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>History</Text>
        {history.isLoading ? (
          <Text style={{ color: colors.mutedForeground }}>Loading…</Text>
        ) : (history.data?.packs?.length ?? 0) === 0 ? (
          <Text style={{ color: colors.mutedForeground }}>No packs yet.</Text>
        ) : (
          <View style={styles.historyList}>
            {history.data?.packs.map((p) => (
              <View
                key={p.id}
                style={[styles.historyItem, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}
              >
                <Text style={{ color: colors.foreground, fontWeight: '700' }}>Round {p.roundNumber}</Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 4 }} numberOfLines={2}>
                  {typeof (p.compiledSummary as any)?.topWords?.join === 'function'
                    ? (p.compiledSummary as any).topWords.join(', ')
                    : 'Wingman pack'}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <WingmanMatchDetail
        visible={!!selectedMatch}
        match={selectedMatch}
        isConnecting={isConnecting}
        onClose={handleCloseDetail}
        onConnect={handleConnectFromDetail}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24 },
  centeredSmall: { alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12 },
  headerTitle: { fontSize: 24, fontWeight: '800' },
  headerSub: { fontSize: 13, marginTop: 4 },
  card: { marginHorizontal: 16, borderRadius: 20, borderWidth: 1, padding: 16 },
  cardTitle: { fontSize: 18, fontWeight: '800' },
  cardSub: { fontSize: 13, marginTop: 6, lineHeight: 18 },
  primaryBtn: { marginTop: 14, paddingVertical: 12, borderRadius: 16, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  secondaryBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, borderWidth: 1 },
  linkRow: { marginTop: 10, borderWidth: 1, borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  linkText: { flex: 1, fontSize: 12 },
  progressText: { marginTop: 10, fontSize: 12 },
  section: { paddingHorizontal: 16, paddingTop: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 10 },
  matchesList: { gap: 12 },
  historyList: { gap: 10, paddingBottom: 24 },
  historyItem: { borderWidth: 1, borderRadius: 16, padding: 12 },
});
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={<EmptyState category={category} />}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator
                size="small"
                color={colors.primary}
                style={{ marginVertical: 16 }}
              />
            ) : null
          }
        />
      )}

      {/* ── Floating compose button ── */}
      <Animated.View style={[styles.fab, fabStyle]}>
        <TouchableOpacity
          onPress={handleCompose}
          style={[styles.fabInner, { backgroundColor: colors.primary }]}
          activeOpacity={0.9}
        >
          <Text style={styles.fabIcon}>✏️</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* ── Composer bottom sheet ── */}
      <Modal
        visible={composerVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setComposerVisible(false)}
      >
        <View style={[styles.sheetBg, { backgroundColor: isDark ? '#1a1a2e' : '#fff' }]}>
          <PostComposer onClose={() => setComposerVisible(false)} />
        </View>
      </Modal>

      {/* ── Reveal flow bottom sheet ── */}
      <Modal
        visible={!!revealPost}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setRevealPost(null)}
      >
        <View style={[styles.sheetBg, { backgroundColor: isDark ? '#1a1a2e' : '#fff' }]}>
          {revealPost && (
            <RevealFlow
              post={revealPost}
              revealResult={revealResult}
              onClose={() => {
                setRevealPost(null);
                setRevealResult(undefined);
              }}
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 2,
  },
  headerTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  filterScroll: {
    flexGrow: 0,
    marginTop: 10,
  },
  filterRow: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 4,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 120,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 96,
    right: 20,
  },
  fabInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ec4899',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 22,
  },
  sheetBg: {
    flex: 1,
  },
});

