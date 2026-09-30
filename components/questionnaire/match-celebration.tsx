import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'expo-router';
import { Heart, MessageCircle, X } from 'lucide-react-native';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { HEIGHTS, PROFILE_PHOTO, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { type MatchAnnouncement, type ActiveConnection, planMatchAnnouncements } from '@/lib/match-announcements';
import { useExperience, useIdentity, useQuestionnaire } from '@/lib/questionnaire';

type ConnectionsResponse = { items: ActiveConnection[] };
type AnnounceMatch = (match: MatchAnnouncement) => void;

const MatchAnnouncementContext = createContext<AnnounceMatch>(() => undefined);
const storageKey = (userId: string) => `strathspace:seen-matches:${userId}`;

export const useMatchAnnouncement = () => useContext(MatchAnnouncementContext);

export function MatchCelebrationProvider({ children }: { children: React.ReactNode }) {
  const identity = useIdentity();
  return <MatchCelebrationSession key={identity.data ?? 'signed-out'} userId={identity.data ?? null}>{children}</MatchCelebrationSession>;
}

function MatchCelebrationSession({ children, userId }: { children: React.ReactNode; userId: string | null }) {
  const router = useRouter();
  const path = usePathname();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const experience = useExperience();
  const enabled = Boolean(userId && experience.data?.matching);
  const connections = useQuestionnaire<ConnectionsResponse>('connections', enabled);
  const [loaded, setLoaded] = useState(false);
  const [queue, setQueue] = useState<MatchAnnouncement[]>([]);
  const seenRef = useRef(new Set<string>());
  const firstLoadRef = useRef(true);
  const writeRef = useRef<Promise<unknown>>(Promise.resolve());
  const active = queue[0];
  const visiblePath = path === '/dating' || path.startsWith('/dating/') || path.startsWith('/compatibility/');

  const saveSeen = useCallback((id: string) => {
    const snapshot = [...seenRef.current];
    writeRef.current = writeRef.current
      .catch(() => undefined)
      .then(() => AsyncStorage.setItem(storageKey(id), JSON.stringify(snapshot)));
  }, []);

  const announce = useCallback<AnnounceMatch>((match) => {
    if (!userId || !match.matchId || seenRef.current.has(match.matchId)) return;
    seenRef.current.add(match.matchId);
    setQueue((current) => [...current, match]);
    if (loaded) saveSeen(userId);
    void queryClient.invalidateQueries({ queryKey: ['conversations'] });
  }, [loaded, queryClient, saveSeen, userId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void AsyncStorage.getItem(storageKey(userId)).then((stored) => {
      if (cancelled) return;
      let saved: string[] = [];
      if (stored) {
        try {
          const parsed: unknown = JSON.parse(stored);
          if (Array.isArray(parsed)) saved = parsed.filter((value): value is string => typeof value === 'string');
        } catch { /* Corrupt local state should not block matches. */ }
      }
      const pending = [...seenRef.current];
      seenRef.current = new Set([...saved, ...pending]);
      firstLoadRef.current = stored === null;
      setLoaded(true);
      if (pending.length) saveSeen(userId);
    }).catch(() => {
      if (!cancelled) setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [saveSeen, userId]);

  useEffect(() => {
    if (!enabled || !loaded || !userId || !connections.data) return;
    const items = connections.data.items;
    const firstLoad = firstLoadRef.current;
    firstLoadRef.current = false;
    // First install celebrates the newest match once, without a cascade of
    // older matches. Later launches announce every genuinely unseen match.
    const plan = planMatchAnnouncements(items, seenRef.current, firstLoad);
    if (firstLoad) {
      plan.markSeen.forEach((matchId) => seenRef.current.add(matchId));
      saveSeen(userId);
      if (plan.announcements.length && queue.length === 0) {
        setQueue((current) => [...current, ...plan.announcements]);
        void queryClient.invalidateQueries({ queryKey: ['conversations'] });
      }
    } else {
      plan.announcements.forEach(announce);
    }
  }, [announce, connections.data, enabled, loaded, queryClient, queue.length, saveSeen, userId]);

  const refreshConnections = connections.refetch;
  useEffect(() => {
    if (!enabled) return;
    const refresh = () => { void refreshConnections(); };
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') refresh();
    }, 45_000);
    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, [enabled, refreshConnections]);

  const dismiss = () => setQueue((current) => current.slice(1));
  const openChat = () => {
    if (!active) return;
    const matchId = active.matchId;
    dismiss();
    router.push({ pathname: '/dating-chat/[matchId]', params: { matchId, partnerName: active.name, ...(active.photo ? { partnerPhoto: active.photo } : {}) } } as never);
  };

  return (
    <MatchAnnouncementContext.Provider value={announce}>
      {children}
      <Modal visible={Boolean(active && visiblePath)} transparent animationType="fade" statusBarTranslucent onRequestClose={dismiss}>
        <View style={[styles.backdrop, { backgroundColor: PROFILE_PHOTO.control }]}>
          <View accessibilityViewIsModal style={[styles.dialog, { backgroundColor: colors.sheet, borderColor: colors.controlBorder }]}>
            <Pressable accessibilityRole="button" accessibilityLabel="Close match announcement" onPress={dismiss} style={[styles.close, { backgroundColor: colors.control }]}>
              <X size={22} color={colors.foreground} />
            </Pressable>
            <View style={[styles.portraitFrame, { borderColor: colors.primary, backgroundColor: colors.control }]}>
              {active?.photo ? <Image source={{ uri: active.photo }} accessibilityLabel={`${active.name}'s profile photo`} style={styles.portrait} /> : <Heart size={58} color={colors.primaryText} />}
              <View style={[styles.heartBadge, { backgroundColor: colors.primary, borderColor: colors.sheet }]}>
                <Heart size={22} color={colors.primaryForeground} fill={colors.primaryForeground} />
              </View>
            </View>
            <Text accessibilityRole="header" style={[styles.title, { color: colors.primaryText }]}>It’s a match!</Text>
            <Text style={[styles.description, { color: colors.foreground }]}>You and {active?.name} liked each other.</Text>
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>A good conversation starts with hello.</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`Message ${active?.name ?? 'your match'}`} onPress={openChat} style={[styles.messageButton, { backgroundColor: colors.primary }]}>
              <MessageCircle size={21} color={colors.primaryForeground} />
              <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Send a message</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={dismiss} style={[styles.laterButton, { borderColor: colors.controlBorder, backgroundColor: colors.control }]}>
              <Text style={[styles.buttonText, { color: colors.foreground }]}>Keep browsing</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </MatchAnnouncementContext.Provider>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.screenX },
  dialog: { width: '100%', maxWidth: 400, borderWidth: 1, borderRadius: RADIUS.sheet, padding: SPACING.section, alignItems: 'center', gap: SPACING.compact },
  close: { alignSelf: 'flex-end', width: HEIGHTS.touchMin, height: HEIGHTS.touchMin, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center' },
  portraitFrame: { width: 164, height: 164, borderRadius: RADIUS.full, borderWidth: 3, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.tight },
  portrait: { width: '100%', height: '100%', borderRadius: RADIUS.full },
  heartBadge: { position: 'absolute', right: -2, bottom: -2, width: 48, height: 48, borderRadius: RADIUS.full, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  title: { ...TYPOGRAPHY.display, textAlign: 'center' },
  description: { ...TYPOGRAPHY.headline, textAlign: 'center' },
  hint: { ...TYPOGRAPHY.callout, textAlign: 'center', marginBottom: SPACING.tight },
  messageButton: { width: '100%', minHeight: HEIGHTS.primaryControl, borderRadius: RADIUS.full, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.tight, paddingHorizontal: SPACING.base },
  laterButton: { width: '100%', minHeight: HEIGHTS.input, borderRadius: RADIUS.full, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.base },
  buttonText: { ...TYPOGRAPHY.body, fontWeight: '700' },
});
