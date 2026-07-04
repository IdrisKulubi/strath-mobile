import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronRight, Sparkles } from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import type { MatchmakerCandidate } from '@/types/matchmaker';

interface MatchmakerCandidateCardProps {
  candidate: MatchmakerCandidate;
  index: number;
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
  index,
  onPress,
}: MatchmakerCandidateCardProps) {
  const { colors, isDark } = useTheme();
  const labels = useMemo(() => candidate.labels.slice(0, 3), [candidate.labels]);

  return (
    <Pressable
      onPress={() => onPress(candidate)}
      style={[
        styles.card,
        {
          backgroundColor: isDark ? colors.card : '#fff',
          borderColor: colors.border,
          shadowColor: isDark ? '#000' : '#1C1524',
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>
            {getInitial(candidate.firstName)}
          </Text>
        </View>

        <View style={styles.identity}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
              {candidate.firstName || 'Someone new'}
              {candidate.age ? `, ${candidate.age}` : ''}
            </Text>
            <View style={[styles.rankBadge, { backgroundColor: colors.secondary }]}>
              <Sparkles size={11} color={colors.primary} />
              <Text style={[styles.rankText, { color: colors.primary }]}>#{index + 1}</Text>
            </View>
          </View>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
            {buildSubtitle(candidate)}
          </Text>
        </View>

        <ChevronRight size={18} color={colors.mutedForeground} />
      </View>

      <Text style={[styles.reason, { color: colors.foreground }]} numberOfLines={3}>
        {candidate.reason}
      </Text>

      {labels.length > 0 ? (
        <View style={styles.chips}>
          {labels.map((label) => (
            <View
              key={label}
              style={[
                styles.chip,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F0F5',
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.chipText, { color: colors.mutedForeground }]} numberOfLines={1}>
                {label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
  },
  identity: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  rankText: {
    fontSize: 11,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '500',
  },
  reason: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
});
