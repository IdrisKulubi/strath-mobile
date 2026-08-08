import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { MatchmakerCandidateCard } from '@/components/matchmaker/matchmaker-candidate-card';
import { MatchmakerShortlistDeck } from '@/components/matchmaker/matchmaker-shortlist-deck';
import { Text } from '@/components/ui/text';
import { MATCHMAKER_HOME, RADIUS, SPACING } from '@/lib/design-tokens';
import {
  getCachedShortlistPosition,
  rememberShortlistPosition,
  restoreShortlistPosition,
} from '@/lib/matchmaker/shortlist-position';
import type { MatchmakerBrief, MatchmakerCandidate, MatchmakerShortlist } from '@/types/matchmaker';

export type MatchmakerShortlistEvent =
  | 'shortlist_viewed'
  | 'shortlist_page_changed'
  | 'explanation_expanded'
  | 'compare_opened'
  | 'comparison_row_viewed'
  | 'shortlist_profile_opened'
  | 'candidate_unavailable';

interface Props {
  shortlist: MatchmakerShortlist;
  brief?: MatchmakerBrief;
  onOpenCandidate: (candidate: MatchmakerCandidate, position: number) => void;
  onNotForMe: (candidate: MatchmakerCandidate, position: number) => void;
  onEvent?: (event: MatchmakerShortlistEvent, position?: number) => void;
  busy?: boolean;
}

const CARD_ASPECT = 0.64;

function candidateName(candidate: MatchmakerCandidate, index: number) {
  return candidate.firstName?.trim() || `Person ${index + 1}`;
}

export function MatchmakerShortlistView({ shortlist, onOpenCandidate, onNotForMe, onEvent, busy = false }: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = Math.max(260, windowWidth - (SPACING.screenX * 2));
  const cardHeight = cardWidth / CARD_ASPECT;
  const [position, setPosition] = useState(() => getCachedShortlistPosition(shortlist.id, shortlist.candidates.length));
  const viewedShortlists = useRef(new Set<string>());
  const multiple = shortlist.candidates.length > 1;

  useEffect(() => {
    if (viewedShortlists.current.has(shortlist.id)) return;
    viewedShortlists.current.add(shortlist.id);
    onEvent?.('shortlist_viewed', position);
    shortlist.candidates.forEach((candidate, index) => {
      if (candidate.availability === 'unavailable') onEvent?.('candidate_unavailable', index);
    });
  }, [onEvent, position, shortlist.candidates, shortlist.id]);

  useEffect(() => {
    let active = true;
    restoreShortlistPosition(shortlist.id, shortlist.candidates.length).then((restored) => {
      if (!active) return;
      setPosition(restored);
      if (restored > 0) {
        AccessibilityInfo.announceForAccessibility(`Returned to candidate ${restored + 1} of ${shortlist.candidates.length}.`);
      }
    });
    return () => { active = false; };
  }, [shortlist.candidates.length, shortlist.id]);

  const savePosition = useCallback((next: number) => {
    setPosition(next);
    rememberShortlistPosition(shortlist.id, next, shortlist.candidates.length).catch(() => undefined);
  }, [shortlist.candidates.length, shortlist.id]);

  const moveToPosition = useCallback((nextPosition: number) => {
    const next = Math.max(0, Math.min(nextPosition, shortlist.candidates.length - 1));
    if (next === position) return;
    savePosition(next);
    onEvent?.('shortlist_page_changed', next);
  }, [onEvent, position, savePosition, shortlist.candidates.length]);

  const openCandidate = useCallback((candidate: MatchmakerCandidate, index: number) => {
    savePosition(index);
    onEvent?.('shortlist_profile_opened', index);
    onOpenCandidate(candidate, index);
  }, [onEvent, onOpenCandidate, savePosition]);

  const renderCandidate = useCallback((item: MatchmakerCandidate, index: number) => (
    <View
      style={{ width: cardWidth, height: cardHeight }}
      accessibilityLabel={`${candidateName(item, index)}, ${index + 1} of ${shortlist.candidates.length}`}
    >
      <MatchmakerCandidateCard
        candidate={item}
        disabled={busy}
        notForMeLabel="Not for me"
        onPress={() => openCandidate(item, index)}
        onNotThisOne={() => onNotForMe(item, index)}
        onExplanationToggle={(expanded) => { if (expanded) onEvent?.('explanation_expanded', index); }}
        style={{ width: cardWidth, height: cardHeight }}
      />
    </View>
  ), [busy, cardHeight, cardWidth, onEvent, onNotForMe, openCandidate, shortlist.candidates.length]);

  return (
    <View style={styles.wrap}>
      {multiple ? (
        <>
          <View style={styles.positionRow}>
            <Text accessibilityLiveRegion="polite" style={styles.positionText}>
              {position + 1} of {shortlist.candidates.length}
            </Text>
            <View accessibilityElementsHidden style={styles.dots}>
              {shortlist.candidates.map((candidate, index) => (
                <Pressable
                  key={candidate.candidateUserId}
                  accessibilityRole="button"
                  accessibilityLabel={`Go to ${candidateName(candidate, index)}`}
                  onPress={() => moveToPosition(index)}
                  hitSlop={8}
                >
                  <View style={[styles.dot, index === position && styles.dotActive]} />
                </Pressable>
              ))}
            </View>
          </View>

          <View
            accessibilityRole="adjustable"
            accessibilityLabel="Your candidate shortlist"
            accessibilityValue={{
              min: 1,
              max: shortlist.candidates.length,
              now: position + 1,
              text: `${position + 1} of ${shortlist.candidates.length}`,
            }}
            accessibilityActions={[
              { name: 'increment', label: 'Next candidate' },
              { name: 'decrement', label: 'Previous candidate' },
            ]}
            onAccessibilityAction={(event) => {
              moveToPosition(position + (event.nativeEvent.actionName === 'increment' ? 1 : -1));
            }}
          >
            <MatchmakerShortlistDeck
              items={shortlist.candidates}
              position={position}
              cardWidth={cardWidth}
              cardHeight={cardHeight}
              keyExtractor={(candidate) => candidate.candidateUserId}
              renderCard={renderCandidate}
              onPositionChange={moveToPosition}
            />
          </View>

          <Text style={styles.swipeHint}>Swipe to browse your shortlist</Text>
        </>
      ) : renderCandidate(shortlist.candidates[0], 0)}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: SPACING.compact },
  positionRow: { minHeight: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2 },
  positionText: { color: MATCHMAKER_HOME.foreground, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: RADIUS.full, backgroundColor: MATCHMAKER_HOME.borderStrong },
  dotActive: { width: 18, backgroundColor: MATCHMAKER_HOME.primary },
  swipeHint: {
    color: MATCHMAKER_HOME.subtleForeground,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
