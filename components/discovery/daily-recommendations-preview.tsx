import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { useTheme } from '@/hooks/use-theme';
import {
  RankedRecommendation,
  RecommendationDecision,
} from '@/hooks/use-match-discovery';
import { EmptyMatches } from '@/components/home/empty-matches';
import { FocusMatchCarousel } from '@/components/home/focus-match-carousel';
import { HomeIntroCard, HomeIntroCardData } from '@/components/home/home-intro-card';

interface DailyRecommendationsPreviewProps {
  recommendations: RankedRecommendation[];
  isError?: boolean;
  savedDecisions?: Record<string, RecommendationDecision>;
  onViewProfile: (recommendation: RankedRecommendation) => void;
  onDecision: (recommendation: RankedRecommendation, decision: RecommendationDecision) => void;
  actionsDisabled?: boolean;
  onFocusedIndexChange?: (index: number) => void;
  cardHeight: number;
  itemWidthRatio?: number;
  sectionCompact?: boolean;
}

function buildIdentityLine(recommendation: RankedRecommendation) {
  const preview = recommendation.profilePreview;
  const parts = [preview.course, preview.university].filter(Boolean);
  if (parts.length === 0) return 'Curated for you';
  return parts.join(' · ');
}

function toIntroCardData(
  recommendation: RankedRecommendation,
  savedDecisions?: Record<string, RecommendationDecision>,
): HomeIntroCardData {
  const preview = recommendation.profilePreview;
  const saved = savedDecisions?.[recommendation.candidateUserId];
  const decision =
    saved
    ?? (recommendation.currentUserDecision === 'pending'
      ? 'pending'
      : recommendation.currentUserDecision);

  return {
    id: recommendation.candidateUserId,
    photo: preview.profilePhoto || preview.photos?.[0],
    firstName: preview.firstName,
    age: preview.age,
    identityLine: buildIdentityLine(recommendation),
    reason: recommendation.reason,
    decision,
  };
}

export function DailyRecommendationsPreview({
  recommendations: rawRecommendations,
  isError,
  savedDecisions,
  onViewProfile,
  onDecision,
  actionsDisabled,
  onFocusedIndexChange,
  cardHeight,
  itemWidthRatio,
  sectionCompact = false,
}: DailyRecommendationsPreviewProps) {
  const { colors } = useTheme();
  const recommendations = useMemo(() => rawRecommendations.slice(0, 5), [rawRecommendations]);

  const cardDataList = useMemo(
    () => recommendations.map((item) => toIntroCardData(item, savedDecisions)),
    [recommendations, savedDecisions],
  );

  const recommendationById = useMemo(
    () => new Map(recommendations.map((item) => [item.candidateUserId, item])),
    [recommendations],
  );

  const renderCard = useCallback(
    (data: HomeIntroCardData) => {
      const recommendation = recommendationById.get(data.id);
      if (!recommendation) return null;

      return (
        <HomeIntroCard
          data={data}
          height={cardHeight}
          actionsDisabled={actionsDisabled}
          onPhotoPress={() => onViewProfile(recommendation)}
          onInterested={() => onDecision(recommendation, 'open_to_meet')}
          onPass={() => onDecision(recommendation, 'passed')}
        />
      );
    },
    [actionsDisabled, cardHeight, onDecision, onViewProfile, recommendationById],
  );

  if (isError) return null;

  if (recommendations.length === 0) return <EmptyMatches />;

  return (
    <View style={styles.section}>
      <View style={[styles.header, sectionCompact && styles.headerCompact]}>
        <Text style={[sectionCompact ? styles.titleCompact : styles.title, { color: colors.foreground }]}>
          Today&apos;s five
        </Text>
        {!sectionCompact ? (
          <Text variant="muted" style={{ color: colors.mutedForeground }}>
            Intros refresh in ~12h
          </Text>
        ) : null}
      </View>

      <FocusMatchCarousel
        items={cardDataList}
        keyExtractor={(item) => item.id}
        renderItem={(item) => renderCard(item)}
        onIndexChange={onFocusedIndexChange}
        cardHeight={cardHeight}
        itemWidthRatio={itemWidthRatio}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    flex: 1,
  },
  header: {
    paddingHorizontal: SPACING.screenX,
    marginBottom: SPACING.compact,
    gap: SPACING.micro,
  },
  headerCompact: {
    marginBottom: SPACING.tight,
  },
  title: {
    ...TYPOGRAPHY.title,
  },
  titleCompact: {
    ...TYPOGRAPHY.headline,
  },
});
