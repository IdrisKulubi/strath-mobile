import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
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
  savedDecisions?: Record<string, RecommendationDecision>;
  onViewProfile: (recommendation: RankedRecommendation) => void;
  onDecision: (recommendation: RankedRecommendation, decision: RecommendationDecision) => void;
  actionsDisabled?: boolean;
}

export function DailyRecommendationsPreview({
  recommendations: rawRecommendations,
  isError,
  savedDecisions,
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
        <Text style={[styles.title, { color: colors.foreground }]}>Today&apos;s five</Text>
        <Text variant="muted" style={{ color: colors.mutedForeground }}>
          Review each profile — your choices improve tomorrow&apos;s set.
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {recommendations.map((recommendation) => (
          <DiscoveryProfileCard
            key={recommendation.candidateUserId}
            recommendation={recommendation}
            variant="compact"
            actionsDisabled={actionsDisabled}
            savedDecision={
              savedDecisions?.[recommendation.candidateUserId]
              ?? (recommendation.currentUserDecision === 'pending' ? undefined : recommendation.currentUserDecision)
            }
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
    marginBottom: SPACING.tight,
  },
  header: {
    paddingHorizontal: SPACING.screenX,
    marginBottom: SPACING.compact,
    gap: SPACING.micro,
  },
  title: {
    ...TYPOGRAPHY.title,
  },
  row: {
    paddingHorizontal: SPACING.base,
    paddingBottom: SPACING.tight,
  },
});
