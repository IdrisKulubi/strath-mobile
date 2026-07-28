import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { CachedImage } from '@/components/ui/cached-image';
import { Text } from '@/components/ui/text';
import { MATCHMAKER_HOME, RADIUS, SPACING } from '@/lib/design-tokens';
import type { MatchmakerCandidate } from '@/types/matchmaker';

interface MatchmakerCandidateCardProps {
  candidate: MatchmakerCandidate;
  introductionText?: string;
  onPress: (candidate: MatchmakerCandidate) => void;
  onNotThisOne?: () => void;
}

function getInitial(name: string | null) {
  return name?.trim().charAt(0).toUpperCase() || '?';
}

function buildSubtitle(candidate: MatchmakerCandidate) {
  const details = [candidate.course, candidate.university].filter(Boolean);
  return details.length > 0 ? details.join(' · ') : 'Profile match';
}

export function MatchmakerCandidateCard({
  candidate,
  introductionText,
  onPress,
  onNotThisOne,
}: MatchmakerCandidateCardProps) {
  const labels = candidate.labels.slice(0, 3);
  const photo = candidate.profilePhoto ?? candidate.photos?.[0] ?? null;
  const reason = introductionText?.trim() || candidate.reason;

  return (
    <View style={styles.card}>
      <View style={styles.photoFrame}>
        {photo ? (
          <CachedImage uri={photo} style={styles.photo} fallbackType="avatar" contentFit="cover" />
        ) : (
          <View style={styles.photoFallback}>
            <Text style={styles.avatarText}>
              {getInitial(candidate.firstName)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.identity}>
        <Text style={styles.name}>
          {candidate.firstName || 'Someone new'}
          {candidate.age ? `, ${candidate.age}` : ''}
        </Text>
        <Text style={styles.subtitle}>
          {buildSubtitle(candidate)}
        </Text>
      </View>

      <View style={styles.reasonBlock}>
        <Text style={styles.reason}>
          {reason}
        </Text>
      </View>

      {labels.length > 0 ? (
        <View style={styles.chips}>
          {labels.map((label) => (
            <View
              key={label}
              style={styles.chip}
            >
              <Text style={styles.chipText}>
                {label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View profile for ${candidate.firstName || 'this match'}`}
          accessibilityHint="Opens their full profile so you can choose Interested or Pass."
          onPress={() => onPress(candidate)}
          style={({ pressed }) => [
            styles.primaryAction,
            pressed && styles.pressedPrimary,
          ]}
        >
          <View style={styles.primaryActionContent}>
            <Text style={styles.primaryActionText}>View profile</Text>
            <ChevronRight size={19} color={MATCHMAKER_HOME.primaryForeground} />
          </View>
        </Pressable>

        {onNotThisOne ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Not this one"
            onPress={onNotThisOne}
            style={({ pressed }) => [
              styles.secondaryAction,
              pressed && styles.pressedSecondary,
            ]}
          >
            <Text style={styles.secondaryActionText}>Not this one</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: MATCHMAKER_HOME.backgroundRaised,
    borderColor: MATCHMAKER_HOME.border,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.base,
    gap: SPACING.compact,
  },
  photoFrame: {
    width: '100%',
    aspectRatio: 0.82,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoFallback: {
    flex: 1,
    backgroundColor: MATCHMAKER_HOME.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: MATCHMAKER_HOME.primary,
    fontSize: 42,
    fontWeight: '800',
  },
  identity: {
    gap: 2,
  },
  name: {
    color: MATCHMAKER_HOME.foreground,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
  },
  subtitle: {
    color: MATCHMAKER_HOME.mutedForeground,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  reasonBlock: {
    backgroundColor: MATCHMAKER_HOME.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.compact,
    paddingVertical: SPACING.tight,
  },
  reason: {
    color: MATCHMAKER_HOME.foreground,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '600',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.tight,
  },
  chip: {
    backgroundColor: MATCHMAKER_HOME.surface,
    borderColor: MATCHMAKER_HOME.border,
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: {
    color: MATCHMAKER_HOME.mutedForeground,
    fontSize: 12,
    fontWeight: '700',
  },
  actions: {
    gap: SPACING.tight,
    paddingTop: SPACING.tight,
  },
  primaryAction: {
    backgroundColor: MATCHMAKER_HOME.primary,
    minHeight: 52,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.compact,
  },
  primaryActionContent: {
    width: '100%',
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.tight,
  },
  primaryActionText: {
    color: MATCHMAKER_HOME.primaryForeground,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
  },
  secondaryAction: {
    borderColor: MATCHMAKER_HOME.border,
    minHeight: 44,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.compact,
  },
  secondaryActionText: {
    color: MATCHMAKER_HOME.mutedForeground,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  pressedPrimary: {
    backgroundColor: MATCHMAKER_HOME.primaryPressed,
    transform: [{ scale: 0.99 }],
  },
  pressedSecondary: {
    backgroundColor: MATCHMAKER_HOME.surfacePressed,
    transform: [{ scale: 0.99 }],
  },
});
