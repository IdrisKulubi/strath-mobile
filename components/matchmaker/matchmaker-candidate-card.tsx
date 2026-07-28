import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight } from 'lucide-react-native';

import { Button } from '@/components/ui/button';
import { CachedImage } from '@/components/ui/cached-image';
import { Text } from '@/components/ui/text';
import { getDistinctCandidateLabels } from '@/lib/matchmaker/conversation-ui';
import { MATCHMAKER_HOME, RADIUS, SPACING } from '@/lib/design-tokens';
import type { MatchmakerCandidate } from '@/types/matchmaker';

interface MatchmakerCandidateCardProps {
  candidate: MatchmakerCandidate;
  onPress: (candidate: MatchmakerCandidate) => void;
  onNotThisOne?: () => void;
}

function getInitial(name: string | null) {
  return name?.trim().charAt(0).toUpperCase() || '?';
}

function buildSubtitle(candidate: MatchmakerCandidate) {
  const details = [candidate.course, candidate.university].filter(Boolean);
  return details.length > 0 ? details.join(' · ') : null;
}

export function MatchmakerCandidateCard({
  candidate,
  onPress,
  onNotThisOne,
}: MatchmakerCandidateCardProps) {
  const photo = candidate.profilePhoto ?? candidate.photos?.[0] ?? null;
  const labels = getDistinctCandidateLabels(candidate.labels, candidate.reason);
  const subtitle = buildSubtitle(candidate);

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open profile for ${candidate.firstName || 'this match'}`}
        onPress={() => onPress(candidate)}
        style={({ pressed }) => [styles.photoPressable, pressed && styles.pressedPhoto]}
      >
        <View style={styles.photoFrame}>
          {photo ? (
            <CachedImage uri={photo} style={styles.photo} fallbackType="avatar" contentFit="cover" />
          ) : (
            <View style={styles.photoFallback}>
              <Text style={styles.avatarText}>{getInitial(candidate.firstName)}</Text>
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(19, 13, 29, 0.35)', 'rgba(19, 13, 29, 0.92)']}
            style={styles.photoGradient}
          />
          <View style={styles.photoOverlay}>
            <Text style={styles.name}>
              {candidate.firstName || 'Someone new'}
              {candidate.age ? `, ${candidate.age}` : ''}
            </Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        </View>
      </Pressable>

      <View style={styles.body}>
        <Text style={styles.reason}>{candidate.reason}</Text>

        {labels.length > 0 ? (
          <View style={styles.chips}>
            {labels.map((label) => (
              <View key={label} style={styles.chip}>
                <Text style={styles.chipText}>{label}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.actions}>
          <Button
            accessibilityLabel={`View profile for ${candidate.firstName || 'this match'}`}
            onPress={() => onPress(candidate)}
            className="h-[52px] w-full rounded-xl bg-[#D94A8F] active:bg-[#BD3778]"
          >
            <Text className="text-[15px] font-extrabold text-[#FFF8FC]">View profile</Text>
            <ChevronRight size={18} color="#FFF8FC" />
          </Button>

          {onNotThisOne ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Not this one"
              onPress={onNotThisOne}
              style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressedSecondary]}
            >
              <Text style={styles.secondaryActionText}>Not this one</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderColor: MATCHMAKER_HOME.border,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: MATCHMAKER_HOME.backgroundRaised,
  },
  photoPressable: {
    width: '100%',
  },
  photoFrame: {
    width: '100%',
    aspectRatio: 0.74,
    backgroundColor: MATCHMAKER_HOME.surface,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MATCHMAKER_HOME.surface,
  },
  avatarText: {
    color: MATCHMAKER_HOME.primary,
    fontSize: 48,
    fontWeight: '800',
  },
  photoGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  photoOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: SPACING.base,
    paddingBottom: SPACING.base,
    gap: 2,
  },
  name: {
    color: MATCHMAKER_HOME.foreground,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  subtitle: {
    color: 'rgba(248, 244, 251, 0.82)',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
  body: {
    gap: SPACING.compact,
    padding: SPACING.base,
  },
  reason: {
    color: MATCHMAKER_HOME.mutedForeground,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
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
    paddingVertical: 5,
  },
  chipText: {
    color: MATCHMAKER_HOME.subtleForeground,
    fontSize: 12,
    fontWeight: '700',
  },
  actions: {
    gap: SPACING.tight,
    marginTop: SPACING.tight,
  },
  secondaryAction: {
    minHeight: 44,
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
  pressedPhoto: {
    opacity: 0.96,
  },
  pressedSecondary: {
    opacity: 0.8,
  },
});
