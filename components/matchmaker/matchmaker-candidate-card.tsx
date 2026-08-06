import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertCircle, ChevronDown, ChevronRight, ChevronUp } from 'lucide-react-native';

import { CachedImage } from '@/components/ui/cached-image';
import { Text } from '@/components/ui/text';
import { getDistinctCandidateLabels } from '@/lib/matchmaker/conversation-ui';
import { MATCHMAKER_HOME, RADIUS, SPACING } from '@/lib/design-tokens';
import type { MatchmakerCandidate } from '@/types/matchmaker';

interface MatchmakerCandidateCardProps {
  candidate: MatchmakerCandidate;
  onPress: (candidate: MatchmakerCandidate) => void;
  onNotThisOne?: () => void;
  notForMeLabel?: string;
  onExplanationToggle?: (expanded: boolean) => void;
  disabled?: boolean;
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
  notForMeLabel = 'Not this one',
  onExplanationToggle,
  disabled = false,
}: MatchmakerCandidateCardProps) {
  const [explanationExpanded, setExplanationExpanded] = useState(false);
  const photo = candidate.profilePhoto ?? candidate.photos?.[0] ?? null;
  const labels = getDistinctCandidateLabels(candidate.labels, candidate.reason);
  const subtitle = buildSubtitle(candidate);
  const unavailable = candidate.availability === 'unavailable';
  const explanation = candidate.explanation;
  const hasExplanation = Boolean(explanation && (
    explanation.fitReasons.length > 0 || explanation.tradeoff || explanation.unknown
  ));

  const toggleExplanation = () => {
    const next = !explanationExpanded;
    setExplanationExpanded(next);
    onExplanationToggle?.(next);
  };

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open profile for ${candidate.firstName || 'this match'}`}
        disabled={unavailable || disabled}
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
            colors={['transparent', MATCHMAKER_HOME.photoGradientMid, MATCHMAKER_HOME.photoGradientBottom]}
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
        {unavailable ? (
          <View accessibilityLiveRegion="polite" style={styles.unavailableRow}>
            <AlertCircle size={17} color={MATCHMAKER_HOME.warning} />
            <Text style={styles.unavailableText}>This profile is no longer available. The rest of your shortlist is unchanged.</Text>
          </View>
        ) : null}
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

        {hasExplanation ? (
          <View style={styles.explanationSection}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: explanationExpanded }}
              accessibilityLabel={`${explanationExpanded ? 'Hide' : 'Show'} why ${candidate.firstName || 'this person'} was suggested`}
              onPress={toggleExplanation}
              style={({ pressed }) => [styles.explanationToggle, pressed && styles.pressedSecondary]}
            >
              <Text style={styles.explanationToggleText}>Why this person?</Text>
              {explanationExpanded ? <ChevronUp size={18} color={MATCHMAKER_HOME.primary} /> : <ChevronDown size={18} color={MATCHMAKER_HOME.primary} />}
            </Pressable>
            {explanationExpanded ? (
              <View style={styles.explanationBody}>
                {explanation?.fitReasons.map((reason) => (
                  <View key={reason} style={styles.reasonRow}>
                    <View style={styles.reasonDot} />
                    <Text style={styles.explanationText}>{reason}</Text>
                  </View>
                ))}
                {explanation?.tradeoff ? <View style={styles.contextRow}><Text style={styles.contextLabel}>Worth noting</Text><Text style={styles.contextText}>{explanation.tradeoff}</Text></View> : null}
                {explanation?.unknown ? <View style={styles.contextRow}><Text style={styles.contextLabel}>Still unclear</Text><Text style={styles.contextText}>{explanation.unknown}</Text></View> : null}
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View profile for ${candidate.firstName || 'this match'}`}
            disabled={unavailable || disabled}
            onPress={() => onPress(candidate)}
            style={({ pressed }) => [styles.primaryAction, (unavailable || disabled) && styles.disabled, pressed && styles.primaryActionPressed]}
          >
            <Text style={styles.primaryActionText}>View profile</Text>
            <ChevronRight size={18} color={MATCHMAKER_HOME.primaryForeground} />
          </Pressable>

          {onNotThisOne ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${notForMeLabel}: ${candidate.firstName || 'this person'}`}
              disabled={unavailable || disabled}
              onPress={onNotThisOne}
              style={({ pressed }) => [styles.secondaryAction, (unavailable || disabled) && styles.disabled, pressed && styles.pressedSecondary]}
            >
              <Text style={styles.secondaryActionText}>{notForMeLabel}</Text>
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
    color: MATCHMAKER_HOME.photoTextMuted,
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
  primaryAction: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.tight,
    paddingHorizontal: SPACING.base,
    borderRadius: RADIUS.md,
    backgroundColor: MATCHMAKER_HOME.primary,
  },
  primaryActionPressed: {
    backgroundColor: MATCHMAKER_HOME.primaryPressed,
    opacity: 0.96,
  },
  primaryActionText: {
    color: MATCHMAKER_HOME.primaryForeground,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },
  unavailableRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.tight,
    padding: SPACING.compact,
    borderRadius: RADIUS.md,
    backgroundColor: MATCHMAKER_HOME.surface,
  },
  unavailableText: {
    flex: 1,
    color: MATCHMAKER_HOME.warning,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  explanationSection: {
    borderTopWidth: 1,
    borderTopColor: MATCHMAKER_HOME.border,
  },
  explanationToggle: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.tight,
  },
  explanationToggleText: {
    color: MATCHMAKER_HOME.primary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  explanationBody: {
    gap: SPACING.compact,
    paddingBottom: SPACING.tight,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.tight,
  },
  reasonDot: {
    width: 5,
    height: 5,
    marginTop: 8,
    borderRadius: RADIUS.full,
    backgroundColor: MATCHMAKER_HOME.primary,
  },
  explanationText: {
    flex: 1,
    color: MATCHMAKER_HOME.foreground,
    fontSize: 14,
    lineHeight: 20,
  },
  contextRow: {
    gap: 3,
    padding: SPACING.compact,
    borderRadius: RADIUS.md,
    backgroundColor: MATCHMAKER_HOME.surface,
  },
  contextLabel: {
    color: MATCHMAKER_HOME.subtleForeground,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contextText: {
    color: MATCHMAKER_HOME.mutedForeground,
    fontSize: 13,
    lineHeight: 19,
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
  disabled: {
    opacity: 0.48,
  },
});
