import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import {
  RankedRecommendation,
  RecommendationDecision,
} from '@/hooks/use-match-discovery';
import { DiscoveryProfileCard } from '@/components/discovery/discovery-profile-card';
import { EmptyMatches } from '@/components/home/empty-matches';

interface DailyRecommendationsPreviewProps {
  recommendations: RankedRecommendation[];
  isError?: boolean;
  onViewProfile: (recommendation: RankedRecommendation) => void;
  onDecision: (recommendation: RankedRecommendation, decision: RecommendationDecision) => void;
  actionsDisabled?: boolean;
}

export function DailyRecommendationsPreview({
  recommendations: rawRecommendations,
  isError,
  onViewProfile,
  onDecision,
  actionsDisabled,
}: DailyRecommendationsPreviewProps) {
  const { colors } = useTheme();
  const recommendations = useMemo(() => rawRecommendations.slice(0, 5), [rawRecommendations]);

  if (isError) return null;

  if (recommendations.length === 0) return <EmptyMatches />;

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
});
