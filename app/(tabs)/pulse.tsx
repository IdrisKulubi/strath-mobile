import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  CheckCircle,
  Copy,
  Package,
  ShareNetwork,
  Users,
} from 'phosphor-react-native';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import {
  useStartWingmanRound,
  useWingmanHistory,
  useWingmanPack,
  useWingmanStatus,
} from '@/hooks/use-wingman';
import type { AgentMatch } from '@/hooks/use-agent';
import { WingmanMatchCard, WingmanMatchDetail } from '@/components/wingman';
import { clearSession, getAuthToken } from '@/lib/auth-helpers';

// ─── Progress dots ────────────────────────────────────────────────────────────
function ProgressDots({
  current,
  target,
  primary,
  border,
  isDark,
}: {
  current: number;
  target: number;
  primary: string;
  border: string;
  isDark: boolean;
}) {
  return (
    <View style={dotStyles.row}>
      {Array.from({ length: target }).map((_, i) => {
        const filled = i < current;
        return (
          <View
            key={i}
            style={[
              dotStyles.dot,
              filled
                ? { backgroundColor: primary }
                : { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: border },
            ]}
          >
            {filled && <CheckCircle size={10} color="#fff" weight="fill" />}
          </View>
        );
      })}
      <Text style={[dotStyles.label, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }]}>
        {current}/{target} replied
      </Text>
    </View>
  );
}

const dotStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 12, fontWeight: '500', marginLeft: 4 },
});

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.strathspace.com';

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function WingmanTabScreen() {
  const router = useRouter();
  const { colors, colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  const status = useWingmanStatus();
  const history = useWingmanHistory(5);
  const startRound = useStartWingmanRound();

  const [packEnabled, setPackEnabled] = useState(false);
  const pack = useWingmanPack(packEnabled);

  const [selectedMatch, setSelectedMatch] = useState<AgentMatch | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [copied, setCopied] = useState(false);

  const activeLink = status.data?.activeLink;
  const linkProgress = useMemo(() => {
    if (!activeLink) return null;
    return {
      current: activeLink.currentSubmissions ?? 0,
      target: activeLink.targetSubmissions ?? 3,
      status: activeLink.status,
    };
  }, [activeLink]);

  const isPackReady =
    linkProgress?.status === 'ready' ||
    (linkProgress?.current ?? 0) >= (linkProgress?.target ?? 3);

  const matches = (pack.data?.matches ?? []) as unknown as AgentMatch[];
  const compiledSummary = pack.data?.compiledSummary as
    | { topWords?: string[]; greenFlags?: string[]; funniestRedFlag?: string | null; hypeLines?: string[] }
    | undefined;

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleStart = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPackEnabled(false);
    await startRound.mutateAsync();
  }, [startRound]);

  const handleCopy = useCallback(async () => {
    if (!activeLink?.url) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Clipboard.setStringAsync(activeLink.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, [activeLink?.url]);

  const handleShare = useCallback(async () => {
    if (!activeLink?.url) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Share.share({
      message: `Be my Wingman on StrathSpace 🪽\n\nTakes 20s — answer a few prompts about me:\n${activeLink.url}`,
      url: activeLink.url,
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

  const handleCloseDetail = useCallback(() => setSelectedMatch(null), []);

  const handleConnectFromDetail = useCallback(
    async (match: AgentMatch, introMessage: string) => {
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
          if (!msgRes.ok) throw new Error('Match created but failed to send intro');
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSelectedMatch(null);
      } catch {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setIsConnecting(false);
      }
    },
    [],
  );

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (status.isLoading) {
    return (
      <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={s.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // ─── Error ────────────────────────────────────────────────────────────────

  if (status.isError) {
    const message = status.error instanceof Error ? status.error.message : 'Request failed';
    const isUnauthorized = /unauthorized|401/i.test(message);
    const isNotEnabled = /not enabled|migrations|501|failed to load wingman status/i.test(message);

    return (
      <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={s.centered}>
          <Text style={[s.errorTitle, { color: colors.foreground }]}>Couldn&apos;t load Wingman</Text>
          <Text style={[s.errorSub, { color: colors.mutedForeground }]}>
            {isUnauthorized
              ? 'Your session expired. Please sign in again.'
              : isNotEnabled
                ? "Wingman isn't enabled yet — missing DB migration."
                : message}
          </Text>
          <TouchableOpacity
            onPress={() => status.refetch()}
            style={[s.outlineBtn, { borderColor: colors.border }]}
          >
            <Text style={{ color: colors.foreground, fontWeight: '600' }}>Try again</Text>
          </TouchableOpacity>
          {isUnauthorized && (
            <TouchableOpacity
              onPress={async () => {
                await clearSession();
                router.replace('/(auth)/login');
              }}
              style={[s.outlineBtn, { borderColor: colors.primary, marginTop: 8 }]}
            >
              <Text style={{ color: colors.primary, fontWeight: '700' }}>Sign in again</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <Text style={[s.headerTitle, { color: colors.foreground }]}>Wingman 🪽</Text>
          <Text style={[s.headerSub, { color: colors.mutedForeground }]}>
            Let friends describe you. Get better matches.
          </Text>
        </View>

        {/* ── Status card ── */}
        {!activeLink ? (
          /* No active link → start a round */
          <View style={[s.card, {
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
            borderColor: colors.border,
          }]}>
            <View style={s.iconRow}>
              <View style={[s.iconBg, {
                backgroundColor: isDark ? 'rgba(236,72,153,0.15)' : 'rgba(236,72,153,0.08)',
              }]}>
                <Users size={24} color={colors.primary} weight="fill" />
              </View>
            </View>
            <Text style={[s.cardTitle, { color: colors.foreground }]}>Start a Wingman round</Text>
            <Text style={[s.cardSub, { color: colors.mutedForeground }]}>
              Share a link with 3 friends. They describe you in 20s each. We compile it into AI-powered matches.
            </Text>
            <TouchableOpacity
              onPress={handleStart}
              disabled={startRound.isPending}
              activeOpacity={0.85}
              style={{ marginTop: 20, borderRadius: 18, overflow: 'hidden', opacity: startRound.isPending ? 0.7 : 1 }}
            >
              <LinearGradient
                colors={['#ec4899', '#f43f5e']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.gradientBtn}
              >
                <Text style={s.gradientBtnText}>
                  {startRound.isPending ? 'Getting link…' : 'Get my Wingman link'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          /* Active link → collecting / ready */
          <View style={[s.card, {
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
            borderColor: isPackReady ? 'rgba(236,72,153,0.4)' : colors.border,
          }]}>
            {/* Round + ready badges */}
            <View style={s.roundBadgeRow}>
              <View style={[s.roundBadge, {
                backgroundColor: isDark ? 'rgba(236,72,153,0.15)' : 'rgba(236,72,153,0.08)',
              }]}>
                <Text style={[s.roundBadgeText, { color: colors.primary }]}>
                  Round {activeLink.roundNumber}
                </Text>
              </View>
              {isPackReady && (
                <View style={[s.readyBadge, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
                  <CheckCircle size={12} color="#10b981" weight="fill" />
                  <Text style={[s.readyBadgeText, { color: '#10b981' }]}>Pack ready!</Text>
                </View>
              )}
            </View>

            {/* Progress dots */}
            <View style={{ marginTop: 14 }}>
              <ProgressDots
                current={linkProgress?.current ?? 0}
                target={linkProgress?.target ?? 3}
                primary={colors.primary}
                border={colors.border}
                isDark={isDark}
              />
            </View>

            {/* Link box */}
            <View style={[s.linkBox, {
              backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              borderColor: colors.border,
            }]}>
              <Text style={[s.linkLabel, { color: colors.mutedForeground }]}>Your link</Text>
              <Text style={[s.linkUrl, { color: colors.foreground }]} numberOfLines={1}>
                {activeLink.url}
              </Text>
            </View>

            {/* Copy + Share side-by-side */}
            <View style={s.actionRow}>
              <TouchableOpacity
                onPress={handleCopy}
                activeOpacity={0.8}
                style={[s.actionBtn, {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
                  borderColor: copied ? colors.primary : colors.border,
                  flex: 1,
                }]}
              >
                <Copy
                  size={16}
                  color={copied ? colors.primary : colors.foreground}
                  weight={copied ? 'fill' : 'regular'}
                />
                <Text style={[s.actionBtnText, { color: copied ? colors.primary : colors.foreground }]}>
                  {copied ? 'Copied!' : 'Copy link'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleShare}
                activeOpacity={0.8}
                style={[s.actionBtn, {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
                  borderColor: colors.border,
                  flex: 1,
                }]}
              >
                <ShareNetwork size={16} color={colors.foreground} />
                <Text style={[s.actionBtnText, { color: colors.foreground }]}>Share</Text>
              </TouchableOpacity>
            </View>

            {/* Open pack — shown when ready and pack not yet loaded */}
            {isPackReady && !packEnabled && (
              <TouchableOpacity
                onPress={handleOpenPack}
                disabled={pack.isFetching}
                activeOpacity={0.85}
                style={{
                  marginTop: 12,
                  borderRadius: 18,
                  overflow: 'hidden',
                  opacity: pack.isFetching ? 0.7 : 1,
                }}
              >
                <LinearGradient
                  colors={['#ec4899', '#f43f5e']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.gradientBtn}
                >
                  <Package size={18} color="#fff" weight="fill" />
                  <Text style={s.gradientBtnText}>
                    {pack.isFetching ? 'Building your pack…' : 'Open Wingman Pack 🎁'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* Nudge while still collecting */}
            {!isPackReady && (
              <Text style={[s.nudgeText, { color: colors.mutedForeground }]}>
                {(linkProgress?.target ?? 3) - (linkProgress?.current ?? 0)} more friend
                {(linkProgress?.target ?? 3) - (linkProgress?.current ?? 0) !== 1 ? 's' : ''} to go — share your link above!
              </Text>
            )}
          </View>
        )}

        {/* ── Pack loading ── */}
        {packEnabled && pack.isLoading && (
          <View style={s.packLoading}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[s.packLoadingText, { color: colors.mutedForeground }]}>
              Building your pack…
            </Text>
          </View>
        )}

        {/* ── Pack error ── */}
        {packEnabled && pack.isError && (
          <View style={[s.infoBox, {
            backgroundColor: isDark ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.05)',
            borderColor: 'rgba(239,68,68,0.2)',
          }]}>
            <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '500', textAlign: 'center' }}>
              Pack not ready yet — check back once all friends have replied.
            </Text>
          </View>
        )}

        {/* ── Pack summary + matches ── */}
        {packEnabled && !pack.isLoading && !pack.isError && matches.length > 0 && (
          <>
            {/* Compiled summary */}
            {compiledSummary && (
              <View style={s.summarySection}>
                <Text style={[s.sectionTitle, { color: colors.foreground }]}>
                  How your friends see you
                </Text>

                {(compiledSummary.topWords?.length ?? 0) > 0 && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={[s.chipGroupLabel, { color: colors.mutedForeground }]}>In 3 words</Text>
                    <View style={s.chipRow}>
                      {compiledSummary.topWords!.map((word, i) => (
                        <View key={i} style={[s.chip, {
                          backgroundColor: isDark ? 'rgba(236,72,153,0.12)' : 'rgba(236,72,153,0.07)',
                          borderColor: 'rgba(236,72,153,0.25)',
                        }]}>
                          <Text style={[s.chipText, { color: colors.primary }]}>{word}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {(compiledSummary.greenFlags?.length ?? 0) > 0 && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={[s.chipGroupLabel, { color: colors.mutedForeground }]}>Green flags 🟢</Text>
                    <View style={s.chipRow}>
                      {compiledSummary.greenFlags!.map((flag, i) => (
                        <View key={i} style={[s.chip, {
                          backgroundColor: isDark ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.07)',
                          borderColor: 'rgba(16,185,129,0.25)',
                        }]}>
                          <Text style={[s.chipText, { color: '#10b981' }]}>{flag}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {compiledSummary.funniestRedFlag && (
                  <View style={[s.redFlagBox, {
                    backgroundColor: isDark ? 'rgba(249,115,22,0.08)' : 'rgba(249,115,22,0.05)',
                    borderColor: 'rgba(249,115,22,0.2)',
                  }]}>
                    <Text style={{ fontSize: 13, color: '#f97316', fontWeight: '500' }}>
                      😅 Funny red flag:{' '}
                      <Text style={{ fontStyle: 'italic' }}>
                        &quot;{compiledSummary.funniestRedFlag}&quot;
                      </Text>
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Match cards */}
            <View style={s.matchesSection}>
              <Text style={[s.sectionTitle, { color: colors.foreground }]}>Your Matches</Text>
              <Text style={[s.sectionSub, { color: colors.mutedForeground }]}>
                AI-curated based on how your friends described you
              </Text>
              <View style={{ gap: 12, marginTop: 12 }}>
                {matches.map((m, index) => (
                  <WingmanMatchCard
                    key={m.profile.userId}
                    match={m}
                    index={index}
                    onPress={handleMatchPress}
                  />
                ))}
              </View>
            </View>
          </>
        )}

        {/* ── History ── */}
        {(history.data?.packs?.length ?? 0) > 0 && (
          <View style={s.historySection}>
            <Text style={[s.sectionTitle, { color: colors.foreground }]}>Past packs</Text>
            <View style={{ gap: 8 }}>
              {history.data!.packs.map((p) => {
                const words =
                  typeof (p.compiledSummary as any)?.topWords?.join === 'function'
                    ? (p.compiledSummary as any).topWords.join(' · ')
                    : null;
                return (
                  <View
                    key={p.id}
                    style={[s.historyItem, {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                      borderColor: colors.border,
                    }]}
                  >
                    <View style={[s.historyRoundBadge, {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
                    }]}>
                      <Text style={[s.historyRoundText, { color: colors.mutedForeground }]}>
                        Round {p.roundNumber}
                      </Text>
                    </View>
                    {words && (
                      <Text style={[s.historyWords, { color: colors.foreground }]} numberOfLines={1}>
                        {words}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Match detail sheet ── */}
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

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 8 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },

  // Header
  header: { paddingTop: 20, paddingBottom: 18 },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 32,
    paddingTop: 2,
  },
  headerSub: { fontSize: 13, marginTop: 4, lineHeight: 18 },

  // Error
  errorTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  errorSub: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  outlineBtn: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },

  // Card
  card: { borderRadius: 22, borderWidth: 1, padding: 18 },
  iconRow: { alignItems: 'flex-start', marginBottom: 12 },
  iconBg: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  cardSub: { fontSize: 13, marginTop: 6, lineHeight: 19 },

  // Gradient button
  gradientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 18,
  },
  gradientBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  // Round + ready badges
  roundBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roundBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  roundBadgeText: { fontSize: 12, fontWeight: '700' },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  readyBadgeText: { fontSize: 12, fontWeight: '700' },

  // Link box
  linkBox: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  linkLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  linkUrl: { fontSize: 13, fontWeight: '500' },

  // Copy / Share action row
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
  },
  actionBtnText: { fontSize: 14, fontWeight: '700' },

  // Nudge
  nudgeText: { fontSize: 12, marginTop: 12, textAlign: 'center', lineHeight: 17 },

  // Pack loading
  packLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    justifyContent: 'center',
    paddingVertical: 28,
  },
  packLoadingText: { fontSize: 14, fontWeight: '500' },

  // Info box
  infoBox: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
  },

  // Summary section
  summarySection: { marginTop: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  sectionSub: { fontSize: 12, marginTop: 3 },
  chipGroupLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  redFlagBox: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },

  // Matches section
  matchesSection: { marginTop: 28 },

  // History
  historySection: { marginTop: 32 },
  historyItem: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  historyRoundBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  historyRoundText: { fontSize: 12, fontWeight: '600' },
  historyWords: { fontSize: 13, fontWeight: '500', flex: 1 },
});
