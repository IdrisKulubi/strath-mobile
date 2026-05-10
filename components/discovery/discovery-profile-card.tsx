import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/ui/text';
import { CachedImage } from '@/components/ui/cached-image';
import { useTheme } from '@/hooks/use-theme';
import {
  RankedRecommendation,
  RecommendationDecision,
  getMatchTypeLabel,
} from '@/hooks/use-match-discovery';

interface DiscoveryProfileCardProps {
  recommendation: RankedRecommendation;
  variant?: 'large' | 'compact';
  actionsDisabled?: boolean;
  savedDecision?: RecommendationDecision;
  onViewProfile: (recommendation: RankedRecommendation) => void;
  onDecision: (recommendation: RankedRecommendation, decision: RecommendationDecision) => void;
}

function buildIdentityLine(recommendation: RankedRecommendation) {
  const preview = recommendation.profilePreview;
  const parts = [preview.course, preview.university].filter(Boolean);
  if (parts.length === 0) return recommendation.reason || 'Curated for you';
  return parts.join(' - ');
}

export function DiscoveryProfileCard({
  recommendation,
  variant = 'large',
  actionsDisabled = false,
  savedDecision,
  onViewProfile,
  onDecision,
}: DiscoveryProfileCardProps) {
  const { colors, isDark } = useTheme();
  const preview = recommendation.profilePreview;
  const photo = preview.profilePhoto || preview.photos?.[0];
  const compact = variant === 'compact';
  const hasSavedDecision = Boolean(savedDecision);
  const decisionLabel =
    savedDecision === 'open_to_meet'
      ? 'Interest saved'
      : savedDecision === 'maybe'
        ? 'Saved for later'
        : savedDecision === 'passed'
          ? 'Passed'
          : 'Interested';

  const handleView = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onViewProfile(recommendation);
  }, [onViewProfile, recommendation]);

  const handleDecision = useCallback((decision: RecommendationDecision) => {
    Haptics.impactAsync(decision === 'open_to_meet' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
    onDecision(recommendation, decision);
  }, [onDecision, recommendation]);

  return (
    <View
      style={[
        styles.card,
        compact && styles.compactCard,
        {
          backgroundColor: isDark ? colors.card : '#fff',
          borderColor: colors.border,
          shadowColor: isDark ? '#000' : '#160b28',
        },
      ]}
    >
      <Pressable onPress={handleView} style={[styles.photoWrap, compact && styles.compactPhotoWrap]}>
        {photo ? (
          <CachedImage uri={photo} style={styles.photo} contentFit="cover" fallbackType="avatar" />
        ) : (
          <View style={[styles.photo, styles.placeholder, { backgroundColor: colors.muted }]}>
            <Ionicons name="person-circle-outline" size={48} color={colors.mutedForeground} />
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.16)', 'rgba(0,0,0,0.74)']}
          locations={[0, 0.45, 1]}
          style={styles.photoGradient}
          pointerEvents="none"
        />
        <View style={styles.photoMeta}>
          <View style={styles.badge}>
            <Ionicons name={recommendation.matchType === 'high_activity' ? 'flash' : 'sparkles'} size={11} color="#fff" />
            <Text style={styles.badgeText}>{getMatchTypeLabel(recommendation.matchType)}</Text>
          </View>
          <Text style={[styles.name, compact && styles.compactName]} numberOfLines={1}>
            {preview.firstName}{preview.age ? `, ${preview.age}` : ''}
          </Text>
          <Text style={styles.identity} numberOfLines={1}>
            {buildIdentityLine(recommendation)}
          </Text>
        </View>
      </Pressable>

      <View style={styles.body}>
        <Text style={[styles.reason, { color: colors.foreground }]} numberOfLines={compact ? 2 : 3}>
          {recommendation.reason}
        </Text>

        {!compact && preview.interests.length > 0 ? (
          <View style={styles.chipRow}>
            {preview.interests.slice(0, 3).map((interest) => (
              <View
                key={interest}
                style={[styles.chip, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)' }]}
              >
                <Text style={[styles.chipText, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {interest}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.actionRow}>
          <Pressable
            onPress={handleView}
            style={[styles.secondaryAction, { borderColor: colors.border }]}
          >
            <Text style={[styles.secondaryActionText, { color: colors.foreground }]}>View</Text>
          </Pressable>
          <Pressable
            disabled={actionsDisabled || hasSavedDecision}
            onPress={() => handleDecision('open_to_meet')}
            style={[
              styles.primaryAction,
              (actionsDisabled || hasSavedDecision) && styles.disabledAction,
              { backgroundColor: hasSavedDecision ? '#10b981' : colors.primary },
            ]}
          >
            <Text style={[styles.primaryActionText, { color: colors.primaryForeground }]}>{decisionLabel}</Text>
          </Pressable>
        </View>

        <View style={styles.smallActionRow}>
          <Pressable
            disabled={actionsDisabled || hasSavedDecision}
            onPress={() => handleDecision('maybe')}
            style={styles.smallAction}
          >
            <Ionicons
              name={savedDecision === 'maybe' ? 'checkmark-circle' : 'time-outline'}
              size={15}
              color={savedDecision === 'maybe' ? '#10b981' : colors.mutedForeground}
            />
            <Text style={[styles.smallActionText, { color: savedDecision === 'maybe' ? '#10b981' : colors.mutedForeground }]}>
              Maybe
            </Text>
          </Pressable>
          <Pressable
            disabled={actionsDisabled || hasSavedDecision}
            onPress={() => handleDecision('passed')}
            style={styles.smallAction}
          >
            <Ionicons
              name={savedDecision === 'passed' ? 'checkmark-circle' : 'close-outline'}
              size={16}
              color={savedDecision === 'passed' ? '#10b981' : colors.mutedForeground}
            />
            <Text style={[styles.smallActionText, { color: savedDecision === 'passed' ? '#10b981' : colors.mutedForeground }]}>
              Pass
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 16,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  compactCard: {
    width: 260,
    marginRight: 12,
  },
  photoWrap: {
    height: 390,
    position: 'relative',
  },
  compactPhotoWrap: {
    height: 260,
  },
  photo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#111827',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 180,
  },
  photoMeta: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
    gap: 4,
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(233,30,140,0.88)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginBottom: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  name: {
    color: '#fff',
    fontSize: 27,
    fontWeight: '800',
    lineHeight: 32,
  },
  compactName: {
    fontSize: 22,
    lineHeight: 27,
  },
  identity: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 12,
    fontWeight: '700',
  },
  body: {
    padding: 14,
    gap: 11,
  },
  reason: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    maxWidth: '48%',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryAction: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: '800',
  },
  primaryAction: {
    flex: 1.25,
    minHeight: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledAction: {
    opacity: 0.55,
  },
  primaryActionText: {
    fontSize: 13,
    fontWeight: '800',
  },
  smallActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  smallAction: {
    flex: 1,
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  smallActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
