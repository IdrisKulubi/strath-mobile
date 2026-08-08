import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertCircle, ArrowRight, ChevronDown, ChevronUp, Info, X } from 'lucide-react-native';

import { CachedImage } from '@/components/ui/cached-image';
import { Text } from '@/components/ui/text';
import { Fonts } from '@/constants/theme';
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
  style?: StyleProp<ViewStyle>;
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
  style,
}: MatchmakerCandidateCardProps) {
  const [explanationExpanded, setExplanationExpanded] = useState(false);
  const photo = candidate.profilePhoto ?? candidate.photos?.[0] ?? null;
  const labels = getDistinctCandidateLabels(candidate.labels, candidate.reason);
  const statusLabel = labels.find((label) => /active|online/i.test(label)) ?? null;
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
    <View style={[styles.card, style]}>
      <View style={styles.photoFrame}>
        {photo ? (
          <CachedImage uri={photo} style={styles.photo} fallbackType="avatar" contentFit="cover" />
        ) : (
          <View style={styles.photoFallback}>
            <Text style={styles.avatarText}>{getInitial(candidate.firstName)}</Text>
          </View>
        )}

        <LinearGradient
          colors={[MATCHMAKER_HOME.photoTopScrim, 'transparent', 'transparent', MATCHMAKER_HOME.photoGradientMid]}
          locations={[0, 0.18, 0.62, 1]}
          style={styles.photoGradient}
        />

        <View style={styles.topBar}>
          {statusLabel ? (
            <View style={styles.statusChip}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText} numberOfLines={1}>{statusLabel}</Text>
            </View>
          ) : <View />}

          {onNotThisOne ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${notForMeLabel}: ${candidate.firstName || 'this person'}`}
              disabled={unavailable || disabled}
              onPress={onNotThisOne}
              style={({ pressed }) => [
                styles.dismissButton,
                (unavailable || disabled) && styles.secondaryDisabled,
                pressed && styles.controlPressed,
              ]}
            >
              <X size={24} color={MATCHMAKER_HOME.foreground} strokeWidth={2} />
            </Pressable>
          ) : null}
        </View>

        {unavailable ? (
          <View accessibilityLiveRegion="polite" style={styles.unavailableRow}>
            <AlertCircle size={16} color={MATCHMAKER_HOME.warning} />
            <Text style={styles.unavailableText}>Profile no longer available</Text>
          </View>
        ) : null}

        <View style={[styles.infoSheet, explanationExpanded && styles.infoSheetExpanded]}>
          <View style={styles.infoSheetTop}>
            <View style={styles.identityRow}>
              <View style={styles.identityCopy}>
                <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit>
                  {candidate.firstName || 'Someone new'}
                </Text>
                {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
              </View>
              {candidate.age ? (
                <View style={styles.agePill}>
                  <Text style={styles.ageText}>{candidate.age}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.divider} />

            {hasExplanation ? (
              <View style={styles.explanationSection}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: explanationExpanded }}
                  accessibilityLabel={`${explanationExpanded ? 'Hide' : 'Show'} why ${candidate.firstName || 'this person'} was suggested`}
                  onPress={toggleExplanation}
                  style={({ pressed }) => [styles.explanationToggle, pressed && styles.controlPressed]}
                >
                  <View style={styles.explanationToggleContent}>
                    <View style={styles.infoIcon}>
                      <Info size={19} color={MATCHMAKER_HOME.foreground} strokeWidth={2} />
                    </View>
                    <Text style={styles.explanationToggleText}>Why this person?</Text>
                    <View style={styles.explanationChevron}>
                      {explanationExpanded
                        ? <ChevronUp size={18} color={MATCHMAKER_HOME.foreground} strokeWidth={2} />
                        : <ChevronDown size={18} color={MATCHMAKER_HOME.foreground} strokeWidth={2} />}
                    </View>
                  </View>
                </Pressable>

                {explanationExpanded ? (
                  <ScrollView
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={false}
                    style={styles.explanationScroll}
                    contentContainerStyle={styles.explanationBody}
                  >
                    {explanation?.fitReasons.map((reason) => (
                      <View key={reason} style={styles.reasonRow}>
                        <View style={styles.reasonDot} />
                        <Text style={styles.explanationText}>{reason}</Text>
                      </View>
                    ))}
                    {explanation?.tradeoff ? (
                      <View style={styles.contextRow}>
                        <Text style={styles.contextLabel}>Worth noting</Text>
                        <Text style={styles.contextText}>{explanation.tradeoff}</Text>
                      </View>
                    ) : null}
                    {explanation?.unknown ? (
                      <View style={styles.contextRow}>
                        <Text style={styles.contextLabel}>Still unclear</Text>
                        <Text style={styles.contextText}>{explanation.unknown}</Text>
                      </View>
                    ) : null}
                  </ScrollView>
                ) : null}
              </View>
            ) : (
              <View style={styles.reasonSummary}>
                <Info size={19} color={MATCHMAKER_HOME.foreground} strokeWidth={2} />
                <Text style={styles.reasonSummaryText} numberOfLines={2}>{candidate.reason}</Text>
              </View>
            )}
          </View>

          <View style={styles.actions}>
            {onNotThisOne ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${notForMeLabel}: ${candidate.firstName || 'this person'}`}
                disabled={unavailable || disabled}
                onPress={onNotThisOne}
                style={styles.rejectActionPressable}
              >
                {({ pressed }) => (
                  <View
                    style={[
                      styles.rejectAction,
                      (unavailable || disabled) && styles.secondaryDisabled,
                      pressed && styles.rejectActionPressed,
                    ]}
                  >
                    <X size={22} color={MATCHMAKER_HOME.foreground} strokeWidth={2.5} />
                  </View>
                )}
              </Pressable>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`View profile for ${candidate.firstName || 'this match'}`}
              disabled={unavailable || disabled}
              onPress={() => onPress(candidate)}
              style={styles.primaryActionPressable}
            >
              {({ pressed }) => (
                <View
                  style={[
                    styles.primaryAction,
                    (unavailable || disabled) && styles.primaryActionDisabled,
                    pressed && styles.primaryActionPressed,
                  ]}
                >
                  <Text style={styles.primaryActionText}>View profile</Text>
                  <ArrowRight size={20} color={MATCHMAKER_HOME.primaryForeground} strokeWidth={2.5} />
                </View>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderColor: MATCHMAKER_HOME.border,
    borderRadius: RADIUS.xl + 8,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: MATCHMAKER_HOME.backgroundRaised,
  },
  photoFrame: {
    flex: 1,
    width: '100%',
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
  topBar: {
    position: 'absolute',
    top: SPACING.base,
    left: SPACING.base,
    right: SPACING.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.tight,
  },
  statusChip: {
    minHeight: 40,
    maxWidth: '68%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 15,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: MATCHMAKER_HOME.glassBorder,
    backgroundColor: MATCHMAKER_HOME.glassSurface,
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: RADIUS.full,
    backgroundColor: MATCHMAKER_HOME.success,
  },
  statusText: {
    flexShrink: 1,
    color: MATCHMAKER_HOME.foreground,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  dismissButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.full,
    backgroundColor: MATCHMAKER_HOME.glassSurface,
    borderWidth: 1,
    borderColor: MATCHMAKER_HOME.glassBorder,
  },
  unavailableRow: {
    position: 'absolute',
    top: SPACING.base + 54,
    left: SPACING.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: MATCHMAKER_HOME.glassSurface,
  },
  unavailableText: {
    color: MATCHMAKER_HOME.warning,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  infoSheet: {
    position: 'absolute',
    left: SPACING.compact,
    right: SPACING.compact,
    bottom: SPACING.compact,
    height: 176,
    paddingHorizontal: SPACING.compact,
    paddingTop: 12,
    paddingBottom: 10,
    borderRadius: RADIUS.xl + 4,
    borderWidth: 1,
    borderColor: MATCHMAKER_HOME.glassBorder,
    backgroundColor: 'rgba(24, 17, 34, 0.88)',
    overflow: 'hidden',
    flexDirection: 'column',
    gap: 6,
  },
  infoSheetExpanded: {
    height: 268,
  },
  infoSheetTop: {
    flexShrink: 1,
    minHeight: 0,
    gap: 2,
    overflow: 'hidden',
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.tight,
  },
  identityCopy: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: MATCHMAKER_HOME.foreground,
    fontFamily: Fonts.serif,
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '600',
    letterSpacing: -0.6,
  },
  agePill: {
    minWidth: 44,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: MATCHMAKER_HOME.glassBorder,
    backgroundColor: MATCHMAKER_HOME.surfaceStrong,
  },
  ageText: {
    color: MATCHMAKER_HOME.foreground,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '500',
  },
  subtitle: {
    color: MATCHMAKER_HOME.foreground,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '500',
    letterSpacing: 0.2,
    opacity: 0.82,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginTop: 3,
    backgroundColor: MATCHMAKER_HOME.glassBorder,
  },
  explanationSection: {
    overflow: 'hidden',
  },
  explanationToggle: {
    minHeight: 32,
  },
  explanationToggleContent: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.tight,
  },
  infoIcon: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: MATCHMAKER_HOME.borderStrong,
  },
  explanationToggleText: {
    flex: 1,
    minWidth: 0,
    color: MATCHMAKER_HOME.foreground,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
  },
  explanationChevron: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  explanationScroll: {
    maxHeight: 76,
  },
  explanationBody: {
    gap: SPACING.tight,
    paddingBottom: SPACING.tight,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  reasonDot: {
    width: 5,
    height: 5,
    marginTop: 7,
    borderRadius: RADIUS.full,
    backgroundColor: MATCHMAKER_HOME.primary,
  },
  explanationText: {
    flex: 1,
    color: MATCHMAKER_HOME.foreground,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  contextRow: {
    gap: 2,
    padding: SPACING.tight,
    borderRadius: RADIUS.md,
    backgroundColor: MATCHMAKER_HOME.surface,
  },
  contextLabel: {
    color: MATCHMAKER_HOME.subtleForeground,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.45,
  },
  contextText: {
    color: MATCHMAKER_HOME.photoTextMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  reasonSummary: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reasonSummaryText: {
    flex: 1,
    color: MATCHMAKER_HOME.foreground,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    opacity: 0.9,
  },
  actions: {
    flexShrink: 0,
    width: '100%',
    height: 50,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: SPACING.tight,
  },
  rejectActionPressable: {
    width: 50,
    alignSelf: 'stretch',
  },
  rejectAction: {
    flex: 1,
    width: 50,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: MATCHMAKER_HOME.glassBorder,
    backgroundColor: MATCHMAKER_HOME.surfaceStrong,
  },
  rejectActionPressed: {
    backgroundColor: MATCHMAKER_HOME.surfacePressed,
    opacity: 0.9,
  },
  primaryActionPressable: {
    flex: 1,
    minWidth: 0,
    alignSelf: 'stretch',
  },
  primaryAction: {
    flex: 1,
    width: '100%',
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.compact,
    paddingHorizontal: SPACING.base,
    borderRadius: RADIUS.full,
    backgroundColor: MATCHMAKER_HOME.primary,
  },
  primaryActionPressed: {
    backgroundColor: MATCHMAKER_HOME.primaryPressed,
  },
  primaryActionDisabled: {
    opacity: 0.55,
  },
  primaryActionText: {
    color: MATCHMAKER_HOME.primaryForeground,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '700',
  },
  controlPressed: {
    opacity: 0.76,
  },
  secondaryDisabled: {
    opacity: 0.62,
  },
});
