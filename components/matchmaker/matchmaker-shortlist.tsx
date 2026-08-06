import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  AccessibilityInfo,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { Columns3, X } from 'lucide-react-native';

import { MatchmakerCandidateCard } from '@/components/matchmaker/matchmaker-candidate-card';
import { Text } from '@/components/ui/text';
import { MATCHMAKER_HOME, RADIUS, SPACING } from '@/lib/design-tokens';
import {
  getCachedShortlistPosition,
  rememberShortlistPosition,
  restoreShortlistPosition,
} from '@/lib/matchmaker/shortlist-position';
import { buildShortlistComparison, shouldShowShortlistComparison } from '@/lib/matchmaker/shortlist';
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

function candidateName(candidate: MatchmakerCandidate, index: number) {
  return candidate.firstName?.trim() || `Person ${index + 1}`;
}

export function MatchmakerShortlistView({ shortlist, brief, onOpenCandidate, onNotForMe, onEvent, busy = false }: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const pageWidth = Math.max(260, windowWidth - (SPACING.screenX * 2));
  const listRef = useRef<FlatList<MatchmakerCandidate>>(null);
  const [position, setPosition] = useState(() => getCachedShortlistPosition(shortlist.id, shortlist.candidates.length));
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const viewedShortlists = useRef(new Set<string>());
  const multiple = shortlist.candidates.length > 1;
  const comparisonRows = useMemo(() => buildShortlistComparison(brief, shortlist), [brief, shortlist]);

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
      requestAnimationFrame(() => listRef.current?.scrollToIndex({ index: restored, animated: false }));
      if (restored > 0) AccessibilityInfo.announceForAccessibility(`Returned to candidate ${restored + 1} of ${shortlist.candidates.length}.`);
    });
    return () => { active = false; };
  }, [shortlist.candidates.length, shortlist.id]);

  const savePosition = useCallback((next: number) => {
    setPosition(next);
    rememberShortlistPosition(shortlist.id, next, shortlist.candidates.length).catch(() => undefined);
  }, [shortlist.candidates.length, shortlist.id]);

  const handleMomentumEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.max(0, Math.min(Math.round(event.nativeEvent.contentOffset.x / pageWidth), shortlist.candidates.length - 1));
    if (next === position) return;
    savePosition(next);
    onEvent?.('shortlist_page_changed', next);
  }, [onEvent, pageWidth, position, savePosition, shortlist.candidates.length]);

  const moveToPosition = useCallback((nextPosition: number) => {
    const next = Math.max(0, Math.min(nextPosition, shortlist.candidates.length - 1));
    if (next === position) return;
    listRef.current?.scrollToIndex({ index: next, animated: !reduceMotion });
    savePosition(next);
    onEvent?.('shortlist_page_changed', next);
  }, [onEvent, position, reduceMotion, savePosition, shortlist.candidates.length]);

  const openCandidate = useCallback((candidate: MatchmakerCandidate, index: number) => {
    savePosition(index);
    onEvent?.('shortlist_profile_opened', index);
    onOpenCandidate(candidate, index);
  }, [onEvent, onOpenCandidate, savePosition]);

  const renderCandidate = useCallback(({ item, index }: { item: MatchmakerCandidate; index: number }) => (
    <View style={{ width: pageWidth }} accessibilityLabel={`${candidateName(item, index)}, ${index + 1} of ${shortlist.candidates.length}`}>
      <MatchmakerCandidateCard
        candidate={item}
        disabled={busy}
        notForMeLabel="Not for me"
        onPress={() => openCandidate(item, index)}
        onNotThisOne={() => onNotForMe(item, index)}
        onExplanationToggle={(expanded) => { if (expanded) onEvent?.('explanation_expanded', index); }}
      />
    </View>
  ), [busy, onEvent, onNotForMe, openCandidate, pageWidth, shortlist.candidates.length]);

  const toggleComparison = () => {
    const next = !comparisonOpen;
    setComparisonOpen(next);
    if (next) onEvent?.('compare_opened', position);
  };

  return (
    <View style={styles.wrap}>
      {multiple ? (
        <>
          <View style={styles.positionRow}>
            <Text accessibilityLiveRegion="polite" style={styles.positionText}>{position + 1} of {shortlist.candidates.length}</Text>
            <View accessibilityElementsHidden style={styles.dots}>
              {shortlist.candidates.map((candidate, index) => <View key={candidate.candidateUserId} style={[styles.dot, index === position && styles.dotActive]} />)}
            </View>
          </View>
          <FlatList
            ref={listRef}
            horizontal
            pagingEnabled
            nestedScrollEnabled
            bounces={false}
            showsHorizontalScrollIndicator={false}
            data={shortlist.candidates}
            keyExtractor={(candidate) => candidate.candidateUserId}
            renderItem={renderCandidate}
            getItemLayout={(_, index) => ({ length: pageWidth, offset: pageWidth * index, index })}
            initialScrollIndex={position}
            onMomentumScrollEnd={handleMomentumEnd}
            accessibilityRole="adjustable"
            accessibilityLabel="Your candidate shortlist"
            accessibilityValue={{ min: 1, max: shortlist.candidates.length, now: position + 1, text: `${position + 1} of ${shortlist.candidates.length}` }}
            accessibilityActions={[{ name: 'increment', label: 'Next candidate' }, { name: 'decrement', label: 'Previous candidate' }]}
            onAccessibilityAction={(event) => moveToPosition(position + (event.nativeEvent.actionName === 'increment' ? 1 : -1))}
            initialNumToRender={shortlist.candidates.length}
            windowSize={3}
            removeClippedSubviews={false}
            onScrollToIndexFailed={({ index }) => requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: index * pageWidth, animated: false }))}
          />
        </>
      ) : renderCandidate({ item: shortlist.candidates[0], index: 0 })}

      {shouldShowShortlistComparison(shortlist.candidates.length, comparisonRows.length) ? (
        <View style={styles.comparisonSection}>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: comparisonOpen }} onPress={toggleComparison} style={({ pressed }) => [styles.compareButton, pressed && styles.pressed]}>
            {comparisonOpen ? <X size={18} color={MATCHMAKER_HOME.primary} /> : <Columns3 size={18} color={MATCHMAKER_HOME.primary} />}
            <Text style={styles.compareButtonText}>{comparisonOpen ? 'Close comparison' : 'Compare with my priorities'}</Text>
          </Pressable>
          {comparisonOpen ? (
            <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator accessibilityLabel="Candidate comparison based on confirmed priorities" contentContainerStyle={styles.comparisonTable}>
              <View>
                <View style={styles.comparisonRow}>
                  <View style={[styles.comparisonHeaderCell, styles.priorityCell]}><Text style={styles.comparisonHeaderText}>Your priority</Text></View>
                  {shortlist.candidates.map((candidate, index) => <View key={candidate.candidateUserId} style={[styles.comparisonHeaderCell, styles.candidateCell]}><Text style={styles.candidateHeaderText}>{candidateName(candidate, index)}</Text></View>)}
                </View>
                {comparisonRows.map((row) => (
                  <View key={row.preferenceId} style={styles.comparisonRow} onLayout={() => onEvent?.('comparison_row_viewed', position)}>
                    <View style={[styles.comparisonCell, styles.priorityCell]}><Text style={styles.priorityText}>{row.label}</Text></View>
                    {shortlist.candidates.map((candidate, index) => {
                      const evidence = row.candidates[index]?.evidence ?? 'Not enough information';
                      return <View key={candidate.candidateUserId} style={[styles.comparisonCell, styles.candidateCell]}><Text style={evidence === 'Strong evidence' ? styles.strongEvidence : styles.unknownEvidence}>{evidence}</Text></View>;
                    })}
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : null}
        </View>
      ) : null}
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
  comparisonSection: { borderTopWidth: 1, borderTopColor: MATCHMAKER_HOME.border, paddingTop: SPACING.tight, gap: SPACING.tight },
  compareButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.tight, borderWidth: 1, borderColor: MATCHMAKER_HOME.border, borderRadius: RADIUS.md, backgroundColor: MATCHMAKER_HOME.backgroundRaised },
  compareButtonText: { color: MATCHMAKER_HOME.primary, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  comparisonTable: { paddingBottom: SPACING.tight },
  comparisonRow: { flexDirection: 'row', alignItems: 'stretch' },
  priorityCell: { width: 132 },
  candidateCell: { width: 122 },
  comparisonHeaderCell: { minHeight: 48, justifyContent: 'center', paddingHorizontal: SPACING.tight, borderBottomWidth: 1, borderBottomColor: MATCHMAKER_HOME.border },
  comparisonHeaderText: { color: MATCHMAKER_HOME.subtleForeground, fontSize: 12, lineHeight: 16, fontWeight: '700' },
  candidateHeaderText: { color: MATCHMAKER_HOME.foreground, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  comparisonCell: { minHeight: 64, justifyContent: 'center', paddingHorizontal: SPACING.tight, paddingVertical: SPACING.tight, borderBottomWidth: 1, borderBottomColor: MATCHMAKER_HOME.border },
  priorityText: { color: MATCHMAKER_HOME.foreground, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  strongEvidence: { color: MATCHMAKER_HOME.success, fontSize: 12, lineHeight: 17, fontWeight: '700' },
  unknownEvidence: { color: MATCHMAKER_HOME.mutedForeground, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  pressed: { opacity: 0.72 },
});
