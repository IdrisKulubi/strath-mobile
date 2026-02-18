/**
 * Campus Pulse — Tab Screen
 *
 * Anonymous social feed for campus dating thoughts, missed connections,
 * hot takes and more. Features:
 * - Infinite-scroll feed with category filters
 * - Post composer bottom sheet
 * - Reveal flow bottom sheet
 * - Optimistic reaction toggling
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Pressable,
  Platform,
  SafeAreaView as RNSafeAreaView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { usePulseFeed } from '@/hooks/use-pulse';
import { PulsePostCard, PostComposer, RevealFlow } from '@/components/pulse';
import type { PulseCategory, PulsePost, RevealResponse } from '@/types/pulse';
import { CATEGORY_EMOJIS, CATEGORY_LABELS } from '@/types/pulse';

// ─── Category filters ─────────────────────────────────────────────────────────

const ALL_CATEGORIES: Array<PulseCategory | null> = [
  null, // "All"
  'missed_connection',
  'hot_take',
  'looking_for',
  'dating_rant',
  'campus_thought',
  'general',
];

function categoryLabel(c: PulseCategory | null): string {
  if (!c) return '✨ All';
  return `${CATEGORY_EMOJIS[c]} ${CATEGORY_LABELS[c]}`;
}

// ─── Empty / Error states ─────────────────────────────────────────────────────

function EmptyState({ category }: { category: PulseCategory | null }) {
  const { colors } = useTheme();
  return (
    <View style={states.container}>
      <Text style={states.emoji}>{category ? CATEGORY_EMOJIS[category] : '💬'}</Text>
      <Text style={[states.title, { color: colors.foreground }]}>Nothing yet</Text>
      <Text style={[states.sub, { color: colors.mutedForeground }]}>
        {category
          ? `No ${CATEGORY_LABELS[category]} posts right now.\nBe the first!`
          : 'No posts yet — start the conversation!'}
      </Text>
    </View>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={states.container}>
      <Text style={states.emoji}>😬</Text>
      <Text style={[states.title, { color: colors.foreground }]}>Couldn't load</Text>
      <TouchableOpacity onPress={onRetry} style={[states.retryBtn, { borderColor: colors.border }]}>
        <Text style={[states.retryText, { color: colors.foreground }]}>Try again</Text>
      </TouchableOpacity>
    </View>
  );
}

const states = StyleSheet.create({
  container: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emoji: { fontSize: 48 },
  title: { fontSize: 18, fontWeight: '700' },
  sub: { fontSize: 13, textAlign: 'center', lineHeight: 20, paddingHorizontal: 32 },
  retryBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  retryText: { fontSize: 14, fontWeight: '600' },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function PulseTabScreen() {
  const { colors, isDark } = useTheme();

  const [category, setCategory] = useState<PulseCategory | null>(null);
  const [composerVisible, setComposerVisible] = useState(false);
  const [revealPost, setRevealPost] = useState<PulsePost | null>(null);
  const [revealResult, setRevealResult] = useState<RevealResponse | undefined>(undefined);

  // FAB animation
  const fabScale = useSharedValue(1);
  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, refetch, isRefetching } =
    usePulseFeed(category);

  const posts = useMemo(
    () => data?.pages.flatMap((p) => p.posts) ?? [],
    [data]
  );

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleCompose = useCallback(() => {
    fabScale.value = withSpring(0.88, { damping: 6, stiffness: 400 }, () => {
      fabScale.value = withSpring(1);
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setComposerVisible(true);
  }, [fabScale]);

  const handleCategoryPress = useCallback((cat: PulseCategory | null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCategory(cat);
  }, []);

  const handleRevealPress = useCallback((post: PulsePost) => {
    setRevealPost(post);
    setRevealResult(undefined);
  }, []);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Campus Pulse</Text>
        <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
          Anonymous campus vibes
        </Text>
      </View>

      {/* ── Category filter tabs ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScroll}
      >
        {ALL_CATEGORIES.map((cat) => {
          const active = category === cat;
          return (
            <TouchableOpacity
              key={cat ?? '__all__'}
              onPress={() => handleCategoryPress(cat)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: active
                    ? colors.primary
                    : isDark
                      ? 'rgba(255,255,255,0.07)'
                      : 'rgba(0,0,0,0.05)',
                  borderColor: active
                    ? colors.primary
                    : isDark
                      ? 'rgba(255,255,255,0.1)'
                      : 'rgba(0,0,0,0.08)',
                },
              ]}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: active ? '#fff' : colors.foreground },
                ]}
              >
                {categoryLabel(cat)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Feed ── */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PulsePostCard post={item} onRevealPress={handleRevealPress} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
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
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 13,
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

