import React, { useEffect, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from '@/hooks/use-theme';
import {
  RankedRecommendation,
  RecommendationDecision,
  useDailyRecommendations,
  useRecommendationEvent,
} from '@/hooks/use-match-discovery';
import { DiscoveryProfileCard } from '@/components/discovery/discovery-profile-card';

interface DailyRecommendationsPreviewProps {
  onViewProfile: (recommendation: RankedRecommendation) => void;
  onDecision: (recommendation: RankedRecommendation, decision: RecommendationDecision) => void;
  actionsDisabled?: boolean;
}

export function DailyRecommendationsPreview({
  onViewProfile,
  onDecision,
  actionsDisabled,
}: DailyRecommendationsPreviewProps) {
  const { colors } = useTheme();
  const { data, isLoading, isError } = useDailyRecommendations();
  const recommendations = useMemo(() => (data?.recommendations ?? []).slice(0, 5), [data?.recommendations]);
  const recommendationEvent = useRecommendationEvent();
  const shownEventIds = useRef(new Set<string>());

  useEffect(() => {
    recommendations.forEach((recommendation) => {
      if (shownEventIds.current.has(recommendation.candidateUserId)) {
        return;
      }

      shownEventIds.current.add(recommendation.candidateUserId);
      recommendationEvent.mutate({
        candidateUserId: recommendation.candidateUserId,
        source: 'daily_recommendations',
        matchType: recommendation.matchType,
        event: 'shown',
      });
    });
  }, [recommendationEvent, recommendations]);

  if (isError) return null;

  if (isLoading) {
    return (
      <View style={styles.section}>
        <View style={styles.header}>
          <Skeleton style={styles.titleSkeleton} />
          <Skeleton style={styles.subtitleSkeleton} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {[0, 1].map((item) => (
            <Skeleton key={item} style={styles.cardSkeleton} />
          ))}
        </ScrollView>
      </View>
    );
  }

  if (recommendations.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Your 5 Best Matches Today</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          That&apos;s today&apos;s shortlist. Your choices sharpen tomorrow&apos;s five.
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {recommendations.map((recommendation) => (
          <DiscoveryProfileCard
            key={recommendation.candidateUserId}
            recommendation={recommendation}
            variant="compact"
            actionsDisabled={actionsDisabled}
            onViewProfile={onViewProfile}
            onDecision={onDecision}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 4,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 25,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  row: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  titleSkeleton: {
    width: 220,
    height: 24,
    borderRadius: 8,
  },
  subtitleSkeleton: {
    width: 260,
    height: 14,
    borderRadius: 8,
  },
  cardSkeleton: {
    width: 260,
    height: 430,
    borderRadius: 24,
    marginRight: 12,
  },
});
