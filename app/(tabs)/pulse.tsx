import { Ionicons } from '@expo/vector-icons';
import { useMinimizeOnScroll } from 'expo-glass-tabs';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { getGlassTabBarHeight } from '@/components/navigation/glass-tab-bar';
import { MatchmakerCandidateCard } from '@/components/matchmaker/matchmaker-candidate-card';
import { TabSwipeView } from '@/components/navigation/tab-swipe-view';
import { CachedImage } from '@/components/ui/cached-image';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import {
  ConnectionRequest,
  useConnectionRequests,
  useRespondToConnectionRequest,
} from '@/hooks/use-connection-requests';
import {
  getIncomingLikeFirstName,
  getIncomingLikePhoto,
  getIncomingLikeTimeAgo,
} from '@/lib/incoming-like-utils';
import { MATCHMAKER_HOME, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';

function LikesSkeleton() {
  return (
    <View style={styles.skeletonWrap}>
      <Skeleton style={styles.titleSkeleton} />
      <Skeleton style={styles.subtitleSkeleton} />
      <View style={styles.queueRow}>
        {[0, 1, 2].map((item) => <Skeleton key={item} style={styles.queueSkeleton} />)}
      </View>
      <Skeleton style={styles.cardSkeleton} />
    </View>
  );
}

function QueuePhoto({
  request,
  selected,
  onPress,
}: {
  request: ConnectionRequest;
  selected: boolean;
  onPress: () => void;
}) {
  const firstName = getIncomingLikeFirstName(request.fromUser.name);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Review ${firstName}'s like`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.queuePhotoButton,
        selected && styles.queuePhotoSelected,
        pressed && styles.pressed,
      ]}
    >
      <CachedImage
        uri={getIncomingLikePhoto(request)}
        style={styles.queuePhoto}
        contentFit="cover"
        fallbackType="avatar"
      />
    </Pressable>
  );
}

function LikeDetailCard({
  request,
  busy,
  height,
  onViewProfile,
  onAccept,
  onPass,
}: {
  request: ConnectionRequest;
  busy: boolean;
  height: number;
  onViewProfile: () => void;
  onAccept: () => void;
  onPass: () => void;
}) {
  const firstName = getIncomingLikeFirstName(request.fromUser.name);
  const timeAgo = getIncomingLikeTimeAgo(request.createdAt);
  const photo = getIncomingLikePhoto(request);
  const age = request.fromUser.profile?.age;
  const profile = request.fromUser.profile;
  const courseLine = [profile?.course, profile?.yearOfStudy ? `Year ${profile.yearOfStudy}` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <MatchmakerCandidateCard
      candidate={{
        candidateUserId: request.fromUser.id,
        firstName,
        age: age ?? null,
        university: profile?.university ?? null,
        course: courseLine || null,
        profilePhoto: photo,
        photos: profile?.photos ?? undefined,
        reason: `Liked you ${timeAgo || 'recently'}`,
        labels: [],
        availability: 'available',
      }}
      variant="likes"
      disabled={busy}
      style={{ height }}
      onPress={onViewProfile}
      onNotThisOne={onPass}
      notForMeLabel="Pass"
      onAccept={onAccept}
    />
  );
}

export default function LikesTabScreen() {
  const router = useRouter();
  const toast = useToast();
  const onScroll = useMinimizeOnScroll();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { data: requests = [], isLoading, isError, refetch } = useConnectionRequests();
  const respond = useRespondToConnectionRequest();
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const visibleRequests = useMemo(
    () => requests.filter((request) => !removedIds.has(request.requestId)),
    [removedIds, requests],
  );

  const selectedIndex = useMemo(() => {
    const index = visibleRequests.findIndex((request) => request.requestId === selectedId);
    return index >= 0 ? index : 0;
  }, [selectedId, visibleRequests]);
  const selected = visibleRequests[selectedIndex] ?? null;

  useEffect(() => {
    if (!selected && visibleRequests[0]) setSelectedId(visibleRequests[0].requestId);
  }, [selected, visibleRequests]);

  const selectRequest = useCallback((request: ConnectionRequest) => {
    Haptics.selectionAsync();
    setSelectedId(request.requestId);
  }, []);

  const viewProfile = useCallback((request: ConnectionRequest) => {
    router.push({
      pathname: '/profile/[userId]',
      params: {
        userId: request.fromUser.id,
        source: 'matchmaker',
        matchType: 'discovery',
      },
    });
  }, [router]);

  const handleResponse = useCallback(async (request: ConnectionRequest, action: 'like' | 'pass') => {
    const firstName = getIncomingLikeFirstName(request.fromUser.name);
    try {
      const result = await respond.mutateAsync({ targetUserId: request.fromUser.id, action });
      Haptics.notificationAsync(
        action === 'like'
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning,
      );
      setRemovedIds((current) => new Set(current).add(request.requestId));
      setSelectedId(null);

      if (action === 'like' && result?.isMatch) {
        toast.show({
          message: `It's mutual with ${firstName}. You can find them in Dates.`,
          variant: 'success',
          position: 'top',
          duration: 3800,
        });
        router.push('/(tabs)/dates');
        return;
      }

      toast.show({
        message: action === 'like' ? `You accepted ${firstName}'s like.` : `${firstName} was removed.`,
        variant: action === 'like' ? 'success' : 'default',
        position: 'top',
      });
    } catch {
      toast.show({
        message: 'Could not save your response. Please try again.',
        variant: 'danger',
      });
    }
  }, [respond, router, toast]);

  const confirmPass = useCallback((request: ConnectionRequest) => {
    const firstName = getIncomingLikeFirstName(request.fromUser.name);
    Alert.alert(
      `Pass on ${firstName}?`,
      'They will be removed from your likes and will not be suggested to you again.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Pass', style: 'destructive', onPress: () => void handleResponse(request, 'pass') },
      ],
    );
  }, [handleResponse]);

  const tabBarHeight = getGlassTabBarHeight(insets.bottom);
  const cardHeight = Math.max(430, Math.min(580, windowHeight - tabBarHeight - 285));

  return (
    <TabSwipeView route="/(tabs)/pulse">
      <SafeAreaView style={styles.screen} edges={['top']}>
        <Animated.ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + SPACING.base }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>People interested in you</Text>
              {!isLoading && visibleRequests.length > 0 ? (
                <View style={styles.countPill}>
                  <Text style={styles.countText}>{visibleRequests.length}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.subtitle}>Review one at a time</Text>
          </View>

          {isLoading ? (
            <LikesSkeleton />
          ) : isError ? (
            <View style={styles.stateWrap}>
              <Ionicons name="cloud-offline-outline" size={36} color={MATCHMAKER_HOME.mutedForeground} />
              <Text style={styles.stateTitle}>Could not load your likes</Text>
              <Text style={styles.stateBody}>Check your connection and try again.</Text>
              <Pressable onPress={() => refetch()} style={styles.retryButton} accessibilityRole="button">
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </View>
          ) : visibleRequests.length === 0 ? (
            <View style={styles.stateWrap}>
              <View style={styles.emptyIcon}>
                <Ionicons name="heart-outline" size={34} color={MATCHMAKER_HOME.primary} />
              </View>
              <Text style={styles.stateTitle}>No new likes yet</Text>
              <Text style={styles.stateBody}>
                When someone chooses you, they will appear here for you to review privately.
              </Text>
            </View>
          ) : selected ? (
            <View style={styles.likesContent}>
              <ScrollView
                horizontal
                style={styles.queueScroller}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.queue}
              >
                {visibleRequests.map((request) => (
                  <QueuePhoto
                    key={request.requestId}
                    request={request}
                    selected={request.requestId === selected.requestId}
                    onPress={() => selectRequest(request)}
                  />
                ))}
              </ScrollView>

              <View style={styles.cardHost}>
                <LikeDetailCard
                  request={selected}
                  busy={respond.isPending}
                  height={cardHeight}
                  onViewProfile={() => viewProfile(selected)}
                  onAccept={() => void handleResponse(selected, 'like')}
                  onPass={() => confirmPass(selected)}
                />
              </View>

              <View style={styles.progressWrap} accessibilityLabel={`${selectedIndex + 1} of ${visibleRequests.length}`}>
                <View style={styles.progressTrack}>
                  {visibleRequests.map((request, index) => (
                    <View
                      key={request.requestId}
                      style={[styles.progressSegment, index === selectedIndex && styles.progressSegmentActive]}
                    />
                  ))}
                </View>
                <Text style={styles.progressText}>{selectedIndex + 1} of {visibleRequests.length}</Text>
              </View>
            </View>
          ) : null}
        </Animated.ScrollView>
      </SafeAreaView>
    </TabSwipeView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: MATCHMAKER_HOME.background },
  content: { flexGrow: 1 },
  header: { paddingHorizontal: SPACING.screenX, paddingTop: SPACING.comfortable, paddingBottom: SPACING.base, gap: 5 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: SPACING.compact },
  title: { color: MATCHMAKER_HOME.foreground, fontSize: 27, lineHeight: 33, fontWeight: '700', letterSpacing: -0.6 },
  subtitle: { color: MATCHMAKER_HOME.mutedForeground, ...TYPOGRAPHY.body },
  likesContent: { width: '100%' },
  queueScroller: { width: '100%', height: 106, flexGrow: 0 },
  countPill: { minWidth: 34, height: 30, paddingHorizontal: 10, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center', backgroundColor: MATCHMAKER_HOME.primary },
  countText: { color: MATCHMAKER_HOME.primaryForeground, fontSize: 14, fontWeight: '700' },
  queue: { paddingHorizontal: SPACING.screenX, paddingVertical: SPACING.tight, gap: SPACING.compact },
  queuePhotoButton: { width: 82, height: 82, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: MATCHMAKER_HOME.border, padding: 2, overflow: 'hidden' },
  queuePhotoSelected: { borderColor: MATCHMAKER_HOME.primary, borderWidth: 3 },
  queuePhoto: { width: '100%', height: '100%', borderRadius: 12, backgroundColor: MATCHMAKER_HOME.surfaceStrong },
  cardHost: { paddingHorizontal: SPACING.screenX, paddingTop: SPACING.tight },
  detailCard: { borderRadius: RADIUS.xl, borderWidth: 1, borderColor: MATCHMAKER_HOME.border, overflow: 'hidden', backgroundColor: MATCHMAKER_HOME.surface },
  photoArea: { ...StyleSheet.absoluteFillObject },
  heroPhoto: { width: '100%', height: '100%', backgroundColor: MATCHMAKER_HOME.surfaceStrong },
  detailContent: { flex: 1, justifyContent: 'flex-end', padding: SPACING.comfortable, paddingTop: 170, gap: 7 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.tight, maxWidth: '100%' },
  name: { color: MATCHMAKER_HOME.foreground, fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.6, flexShrink: 1 },
  meta: { color: MATCHMAKER_HOME.photoTextMuted, fontSize: 15, lineHeight: 21, fontWeight: '500' },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.tight, marginTop: SPACING.tight },
  reason: { color: MATCHMAKER_HOME.foreground, ...TYPOGRAPHY.body, flex: 1 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.tight },
  time: { color: MATCHMAKER_HOME.mutedForeground, ...TYPOGRAPHY.caption },
  profileLink: { minHeight: 44, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 2 },
  profileLinkText: { color: MATCHMAKER_HOME.primary, ...TYPOGRAPHY.callout, fontWeight: '700' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.base, marginTop: SPACING.tight },
  passActionWrap: { alignItems: 'center', gap: 4 },
  passButton: { width: 58, height: 58, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: MATCHMAKER_HOME.borderStrong, backgroundColor: MATCHMAKER_HOME.glassSurface, alignItems: 'center', justifyContent: 'center' },
  passLabel: { color: MATCHMAKER_HOME.mutedForeground, ...TYPOGRAPHY.caption },
  acceptButton: { flex: 1, height: 58, borderRadius: RADIUS.lg, backgroundColor: MATCHMAKER_HOME.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.tight },
  acceptText: { color: MATCHMAKER_HOME.primaryForeground, fontSize: 17, lineHeight: 22, fontWeight: '700' },
  progressWrap: { alignItems: 'center', paddingVertical: SPACING.base, gap: SPACING.tight },
  progressTrack: { width: '48%', flexDirection: 'row', gap: 6 },
  progressSegment: { flex: 1, height: 3, borderRadius: RADIUS.full, backgroundColor: MATCHMAKER_HOME.border },
  progressSegmentActive: { backgroundColor: MATCHMAKER_HOME.primary },
  progressText: { color: MATCHMAKER_HOME.mutedForeground, ...TYPOGRAPHY.caption },
  stateWrap: { flex: 1, minHeight: 420, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.xl, gap: SPACING.compact },
  emptyIcon: { width: 72, height: 72, borderRadius: RADIUS.full, backgroundColor: MATCHMAKER_HOME.surface, borderWidth: 1, borderColor: MATCHMAKER_HOME.border, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.tight },
  stateTitle: { color: MATCHMAKER_HOME.foreground, ...TYPOGRAPHY.title, textAlign: 'center' },
  stateBody: { color: MATCHMAKER_HOME.mutedForeground, ...TYPOGRAPHY.body, textAlign: 'center', maxWidth: 310 },
  retryButton: { minHeight: 44, paddingHorizontal: SPACING.comfortable, borderRadius: RADIUS.full, borderWidth: 1, borderColor: MATCHMAKER_HOME.primary, alignItems: 'center', justifyContent: 'center', marginTop: SPACING.tight },
  retryText: { color: MATCHMAKER_HOME.primary, ...TYPOGRAPHY.callout, fontWeight: '700' },
  skeletonWrap: { paddingHorizontal: SPACING.screenX, gap: SPACING.compact },
  titleSkeleton: { width: '65%', height: 28, borderRadius: RADIUS.sm },
  subtitleSkeleton: { width: '38%', height: 17, borderRadius: RADIUS.sm },
  queueRow: { flexDirection: 'row', gap: SPACING.compact, paddingVertical: SPACING.tight },
  queueSkeleton: { width: 82, height: 82, borderRadius: RADIUS.lg },
  cardSkeleton: { height: 480, borderRadius: RADIUS.xl },
  pressed: { opacity: 0.72 },
});
