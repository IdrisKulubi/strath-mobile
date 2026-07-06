import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronRight, HeartHandshake, ImageIcon } from 'lucide-react-native';

import { CachedImage } from '@/components/ui/cached-image';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { RADIUS, SPACING } from '@/lib/design-tokens';
import type { MatchmakerCandidate } from '@/types/matchmaker';

interface MatchmakerCandidateCardProps {
  candidate: MatchmakerCandidate;
  onPress: (candidate: MatchmakerCandidate) => void;
}

function getInitial(name: string | null) {
  return name?.trim().charAt(0).toUpperCase() || '?';
}

function buildSubtitle(candidate: MatchmakerCandidate) {
  const details = [candidate.course, candidate.university].filter(Boolean);
  return details.length > 0 ? details.join(' - ') : 'Profile match';
}

export function MatchmakerCandidateCard({
  candidate,
  onPress,
}: MatchmakerCandidateCardProps) {
  const { colors, isDark } = useTheme();
  const labels = useMemo(() => candidate.labels.slice(0, 3), [candidate.labels]);
  const photo = candidate.profilePhoto ?? candidate.photos?.[0] ?? null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open profile for ${candidate.firstName || 'this match'}${candidate.age ? `, ${candidate.age}` : ''}. Suggested by your matchmaker.`}
      accessibilityHint="Opens their full profile so you can choose Interested or Pass."
      onPress={() => onPress(candidate)}
      style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            shadowColor: isDark ? colors.background : colors.foreground,
          },
          pressed && styles.pressed,
        ]}
    >
      <View style={styles.headerRow}>
        <View style={[styles.photoFrame, { backgroundColor: colors.secondary }]}>
          {photo ? (
            <CachedImage uri={photo} style={styles.photo} fallbackType="avatar" contentFit="cover" />
          ) : (
            <View style={styles.photoFallback}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {getInitial(candidate.firstName)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.identity}>
          <View style={[styles.introPill, { backgroundColor: colors.secondary }]}>
            <HeartHandshake size={12} color={colors.primary} />
            <Text style={[styles.introText, { color: colors.primary }]}>Matchmaker pick</Text>
          </View>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.foreground }]}>
              {candidate.firstName || 'Someone new'}
              {candidate.age ? `, ${candidate.age}` : ''}
            </Text>
          </View>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {buildSubtitle(candidate)}
          </Text>
        </View>
      </View>

      <View style={[styles.reasonBlock, { backgroundColor: isDark ? colors.secondary : colors.background }]}>
        <Text style={[styles.reasonLabel, { color: colors.mutedForeground }]}>Why this person</Text>
        <Text style={[styles.reason, { color: colors.foreground }]}>
          {candidate.reason}
        </Text>
      </View>

      {labels.length > 0 ? (
        <View style={styles.chips}>
          {labels.map((label) => (
            <View
              key={label}
              style={[
                styles.chip,
                {
                  backgroundColor: isDark ? colors.secondary : colors.background,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.chipText, { color: colors.mutedForeground }]}>
                {label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={[styles.openRow, { borderTopColor: colors.border }]}>
        <View style={styles.openCopy}>
          <ImageIcon size={15} color={colors.mutedForeground} />
          <Text style={[styles.openHint, { color: colors.mutedForeground }]}>
            Open profile to decide
          </Text>
        </View>
        <View style={styles.openAction}>
          <Text style={[styles.openText, { color: colors.primary }]}>View profile</Text>
          <ChevronRight size={17} color={colors.primary} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.base,
    gap: SPACING.compact,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.compact,
  },
  photoFrame: {
    width: 68,
    height: 82,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
  },
  identity: {
    flex: 1,
    minWidth: 0,
    gap: SPACING.micro,
  },
  introPill: {
    alignSelf: 'flex-start',
    minHeight: 26,
    borderRadius: RADIUS.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  introText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    flex: 1,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  reasonBlock: {
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.compact,
    paddingVertical: SPACING.tight,
    gap: 3,
  },
  reasonLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  reason: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.tight,
  },
  chip: {
    maxWidth: '100%',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  openRow: {
    minHeight: 44,
    borderTopWidth: 1,
    paddingTop: SPACING.tight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.compact,
  },
  openCopy: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  openHint: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  openAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  openText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
  },
});
