import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { Check, ChevronDown, ChevronUp, Pencil, Plus, RefreshCw, RotateCcw, Trash2, X } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { MATCHMAKER_HOME, RADIUS, SPACING } from '@/lib/design-tokens';
import { groupMatchmakerBrief, MATCHMAKER_BRIEF_GROUP_LABELS, summarizeMatchmakerBrief, type MatchmakerBriefGroupKey } from '@/lib/matchmaker/brief-ui';
import { clearMatchmakerUiDraft, loadMatchmakerUiDraft, saveMatchmakerUiDraft } from '@/lib/matchmaker/ui-draft-storage';
import type { MatchmakerBrief, MatchmakerBriefOperation, MatchmakerBriefPreference, MatchmakerPreferenceImportance, MatchmakerPreferenceSentiment } from '@/types/matchmaker';

interface Props {
  brief?: MatchmakerBrief;
  loading?: boolean;
  busy?: boolean;
  error?: string;
  bottomInset?: number;
  onUpdate: (operations: MatchmakerBriefOperation[]) => Promise<void>;
  onUndo: (changeId: string) => Promise<void>;
  onRetry?: () => void;
}

const GROUP_ORDER: MatchmakerBriefGroupKey[] = ['mustHaves', 'preferences', 'flexible', 'avoids', 'stillLearning'];
const IMPORTANCE: { value: MatchmakerPreferenceImportance; label: string }[] = [
  { value: 'must_have', label: 'Must-have' },
  { value: 'prefer', label: 'Prefer' },
  { value: 'flexible', label: 'Flexible' },
];

function BriefDisclosureIndicator({
  expanded,
  loading,
}: {
  expanded: boolean;
  loading?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const bounce = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion || loading || expanded) {
      bounce.value = withTiming(0, { duration: 180 });
      return;
    }

    bounce.value = withRepeat(
      withSequence(
        withTiming(3, { duration: 850 }),
        withTiming(0, { duration: 850 }),
      ),
      -1,
      false,
    );
  }, [bounce, expanded, loading, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bounce.value }],
  }));

  if (loading) {
    return (
      <View style={styles.chevronSlot}>
        <ActivityIndicator size="small" color={MATCHMAKER_HOME.primary} />
      </View>
    );
  }

  return (
    <Animated.View style={[styles.chevronSlot, animatedStyle]}>
      {expanded
        ? <ChevronUp size={16} color={MATCHMAKER_HOME.foreground} />
        : <ChevronDown size={16} color={MATCHMAKER_HOME.foreground} />}
    </Animated.View>
  );
}

function PreferenceRow({ preference, busy, onUpdate }: { preference: MatchmakerBriefPreference; busy: boolean; onUpdate: Props['onUpdate'] }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(preference.value);
  const draftKey = `brief-edit:${preference.id}`;
  useEffect(() => {
    loadMatchmakerUiDraft(draftKey).then((saved) => {
      if (saved) { setValue(saved); setEditing(true); }
    });
  }, [draftKey]);
  useEffect(() => {
    if (editing && value !== preference.value) saveMatchmakerUiDraft(draftKey, value).catch(() => undefined);
  }, [draftKey, editing, preference.value, value]);
  const save = async () => {
    const cleaned = value.trim();
    if (cleaned && cleaned !== preference.value) {
      await onUpdate([{ type: 'update', preferenceId: preference.id, value: cleaned }]);
    } else setValue(preference.value);
    await clearMatchmakerUiDraft(draftKey).catch(() => undefined);
    setEditing(false);
  };

  return (
    <View style={styles.preferenceRow}>
      {editing ? (
        <View style={styles.editRow}>
          <TextInput autoFocus accessibilityLabel="Edit remembered preference" value={value} onChangeText={setValue} maxLength={120} editable={!busy} style={styles.editInput} />
          <Pressable accessibilityRole="button" accessibilityLabel="Save preference" disabled={busy} onPress={() => save().catch(() => undefined)} style={styles.iconButton}><Check size={17} color={MATCHMAKER_HOME.success} /></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Cancel editing" onPress={() => { setValue(preference.value); setEditing(false); clearMatchmakerUiDraft(draftKey).catch(() => undefined); }} style={styles.iconButton}><X size={17} color={MATCHMAKER_HOME.mutedForeground} /></Pressable>
        </View>
      ) : (
        <View style={styles.preferenceHeading}>
          <View style={styles.preferenceCopy}>
            <Text style={styles.preferenceValue}>{preference.value}</Text>
            <Text style={styles.preferenceSource}>{preference.certainty === 'inferred' ? 'Inferred, confirm or change' : 'You confirmed this'}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${preference.value}`} disabled={busy} onPress={() => setEditing(true)} style={styles.iconButton}><Pencil size={16} color={MATCHMAKER_HOME.mutedForeground} /></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${preference.value}`} disabled={busy} onPress={() => onUpdate([{ type: 'remove', preferenceId: preference.id }]).catch(() => undefined)} style={styles.iconButton}><Trash2 size={16} color={MATCHMAKER_HOME.error} /></Pressable>
        </View>
      )}
      {!editing ? (
        <View style={styles.rowActions}>
          {preference.certainty === 'inferred' ? (
            <Pressable accessibilityRole="button" accessibilityLabel={`Confirm ${preference.value}`} disabled={busy} onPress={() => onUpdate([{ type: 'confirm', preferenceId: preference.id }]).catch(() => undefined)} style={styles.confirmButton}>
              <Check size={14} color={MATCHMAKER_HOME.primaryForeground} /><Text style={styles.confirmText}>That&apos;s right</Text>
            </Pressable>
          ) : null}
          {preference.sentiment === 'prefer' ? IMPORTANCE.map((option) => (
            <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected: preference.importance === option.value }} disabled={busy} onPress={() => onUpdate([{ type: 'reclassify', preferenceId: preference.id, importance: option.value }]).catch(() => undefined)} style={[styles.smallChip, preference.importance === option.value && styles.smallChipSelected]}>
              <Text style={[styles.smallChipText, preference.importance === option.value && styles.smallChipTextSelected]}>{option.label}</Text>
            </Pressable>
          )) : null}
        </View>
      ) : null}
    </View>
  );
}

export function MatchmakerBriefCard({
  brief,
  loading,
  busy = false,
  error,
  bottomInset = 0,
  onUpdate,
  onUndo,
  onRetry,
}: Props) {
  const { height: windowHeight } = useWindowDimensions();
  const cardRef = useRef<View>(null);
  const [expanded, setExpanded] = useState(false);
  const [expandedMaxHeight, setExpandedMaxHeight] = useState<number>();
  const [headerHeight, setHeaderHeight] = useState(0);
  const [footerHeight, setFooterHeight] = useState(52);
  const [adding, setAdding] = useState(false);
  const [newValue, setNewValue] = useState('');
  const [newSentiment, setNewSentiment] = useState<MatchmakerPreferenceSentiment>('prefer');
  const groups = useMemo(() => groupMatchmakerBrief(brief), [brief]);
  useEffect(() => {
    loadMatchmakerUiDraft('brief-add').then((saved) => {
      if (!saved) return;
      try {
        const parsed = JSON.parse(saved) as { value?: unknown; sentiment?: unknown };
        if (typeof parsed.value === 'string' && parsed.value) {
          setNewValue(parsed.value);
          setNewSentiment(parsed.sentiment === 'avoid' ? 'avoid' : 'prefer');
          setAdding(true);
        }
      } catch { /* Ignore an invalid local draft. */ }
    });
  }, []);
  useEffect(() => {
    if (adding && newValue) saveMatchmakerUiDraft('brief-add', JSON.stringify({ value: newValue, sentiment: newSentiment })).catch(() => undefined);
  }, [adding, newSentiment, newValue]);

  const addPreference = async () => {
    const value = newValue.trim();
    if (!value) return;
    await onUpdate([{ type: 'add', category: 'other', value, sentiment: newSentiment, importance: 'prefer', certainty: 'confirmed', source: 'direct' }]);
    await clearMatchmakerUiDraft('brief-add').catch(() => undefined);
    setNewValue(''); setAdding(false);
  };

  const measureExpandedHeight = useCallback(() => {
    cardRef.current?.measureInWindow((_x, y) => {
      const available = windowHeight - y - bottomInset - SPACING.tight;
      setExpandedMaxHeight(Math.max(280, available));
    });
  }, [bottomInset, windowHeight]);

  useEffect(() => {
    if (!expanded) {
      setExpandedMaxHeight(undefined);
      return;
    }
    measureExpandedHeight();
  }, [expanded, measureExpandedHeight]);

  const toggleExpanded = useCallback(() => {
    setExpanded((current) => !current);
  }, []);

  const editorScrollMaxHeight = useMemo(() => {
    if (!expanded || !expandedMaxHeight || headerHeight <= 0) return undefined;
    const footerReserve = adding ? 0 : footerHeight;
    return Math.max(140, expandedMaxHeight - headerHeight - footerReserve);
  }, [adding, expanded, expandedMaxHeight, footerHeight, headerHeight]);

  const disclosureIndicator = (
    <BriefDisclosureIndicator expanded={expanded} loading={loading} />
  );

  return (
    <View
      ref={cardRef}
      style={[
        styles.card,
        expanded && expandedMaxHeight ? { height: expandedMaxHeight, maxHeight: expandedMaxHeight } : null,
      ]}
      accessibilityLabel="What the matchmaker understands about you"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={expanded ? 'Collapse your match brief' : 'Review and edit your match brief'}
        accessibilityHint="Shows the preferences guiding your matches"
        onPress={toggleExpanded}
        onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}
        style={({ pressed }) => [styles.cardHeader, pressed && styles.pressed]}
      >
        <View style={styles.headerInner}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow} numberOfLines={1}>
              Your match brief
            </Text>
            <Text style={styles.title} numberOfLines={2}>
              What I understand about you
            </Text>
            {loading ? (
              <View
                accessibilityRole="progressbar"
                accessibilityLabel="Loading your match brief"
                style={styles.briefSkeleton}
              >
                <View style={styles.briefSkeletonLine} />
                <View style={styles.briefSkeletonLineShort} />
              </View>
            ) : (
              <Text style={styles.summary} numberOfLines={2}>
                {summarizeMatchmakerBrief(brief)}
              </Text>
            )}
          </View>
          {disclosureIndicator}
        </View>
      </Pressable>
      {expanded ? (
        <View style={styles.editorShell}>
          <ScrollView
            style={[styles.editorScroll, editorScrollMaxHeight ? { maxHeight: editorScrollMaxHeight } : null]}
            contentContainerStyle={styles.editorScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {error ? <View accessibilityLiveRegion="polite" style={styles.briefError}><Text style={styles.errorText}>{error}</Text>{onRetry ? <Pressable accessibilityRole="button" accessibilityLabel="Retry loading your match brief" disabled={busy} onPress={onRetry} style={styles.retryButton}><RefreshCw size={15} color={MATCHMAKER_HOME.primary} /><Text style={styles.retryText}>Try again</Text></Pressable> : null}</View> : null}
            {GROUP_ORDER.map((key) => groups[key].length > 0 ? (
              <View key={key} style={styles.group}>
                <Text style={styles.groupTitle}>{MATCHMAKER_BRIEF_GROUP_LABELS[key]}</Text>
                {groups[key].map((item) => <PreferenceRow key={item.id} preference={item} busy={busy} onUpdate={onUpdate} />)}
              </View>
            ) : null)}
            {!loading && (brief?.preferences.length ?? 0) === 0 ? <Text style={styles.emptyText}>Nothing is locked in yet. Add one detail that would make a match feel worthwhile.</Text> : null}
            {adding ? (
              <View style={styles.addForm}>
                <TextInput autoFocus accessibilityLabel="New match preference" placeholder="For example: communicates directly" placeholderTextColor={MATCHMAKER_HOME.subtleForeground} value={newValue} onChangeText={setNewValue} editable={!busy} maxLength={120} style={styles.addInput} />
                <View style={styles.rowActions}>
                  {(['prefer', 'avoid'] as const).map((sentiment) => <Pressable key={sentiment} accessibilityRole="button" accessibilityState={{ selected: newSentiment === sentiment }} onPress={() => setNewSentiment(sentiment)} style={[styles.smallChip, newSentiment === sentiment && styles.smallChipSelected]}><Text style={[styles.smallChipText, newSentiment === sentiment && styles.smallChipTextSelected]}>{sentiment === 'prefer' ? 'I want this' : 'Avoid this'}</Text></Pressable>)}
                </View>
                <View style={styles.formActions}>
                  <Pressable accessibilityRole="button" disabled={busy || !newValue.trim()} onPress={() => addPreference().catch(() => undefined)} style={[styles.saveButton, (!newValue.trim() || busy) && styles.disabled]}>{busy ? <ActivityIndicator size="small" color={MATCHMAKER_HOME.primaryForeground} /> : <Text style={styles.saveText}>Add to brief</Text>}</Pressable>
                  <Pressable accessibilityRole="button" onPress={() => { setAdding(false); setNewValue(''); clearMatchmakerUiDraft('brief-add').catch(() => undefined); }} style={styles.cancelButton}><Text style={styles.cancelText}>Cancel</Text></Pressable>
                </View>
              </View>
            ) : null}
          </ScrollView>
          {!adding ? (
            <View
              style={styles.footerActions}
              onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)}
            >
              <Pressable accessibilityRole="button" disabled={busy} onPress={() => setAdding(true)} style={styles.addButton}><Plus size={16} color={MATCHMAKER_HOME.primary} /><Text style={styles.addButtonText}>Add something</Text></Pressable>
              {brief?.latestChangeId ? <Pressable accessibilityRole="button" accessibilityLabel="Undo latest match brief change" disabled={busy} onPress={() => onUndo(brief.latestChangeId!).catch(() => undefined)} style={styles.undoButton}><RotateCcw size={15} color={MATCHMAKER_HOME.mutedForeground} /><Text style={styles.undoText}>Undo</Text></Pressable> : null}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: SPACING.screenX,
    borderWidth: 1,
    borderColor: MATCHMAKER_HOME.border,
    borderRadius: RADIUS.md,
    backgroundColor: MATCHMAKER_HOME.backgroundRaised,
    overflow: 'hidden',
  },
  cardHeader: {
    paddingVertical: SPACING.tight,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.tight,
    gap: SPACING.compact,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  chevronSlot: {
    width: 26,
    height: 26,
    flexShrink: 0,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.full,
    backgroundColor: MATCHMAKER_HOME.surface,
    borderWidth: 1,
    borderColor: MATCHMAKER_HOME.border,
  },
  briefSkeleton: {
    gap: 5,
    marginTop: 2,
  },
  briefSkeletonLine: {
    width: '72%',
    height: 9,
    borderRadius: RADIUS.full,
    backgroundColor: MATCHMAKER_HOME.surface,
  },
  briefSkeletonLineShort: {
    width: '48%',
    height: 9,
    borderRadius: RADIUS.full,
    backgroundColor: MATCHMAKER_HOME.surface,
  },
  eyebrow: {
    color: MATCHMAKER_HOME.primary,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    includeFontPadding: false,
  },
  title: {
    color: MATCHMAKER_HOME.foreground,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '700',
    includeFontPadding: false,
  },
  summary: {
    color: MATCHMAKER_HOME.mutedForeground,
    fontSize: 12,
    lineHeight: 16,
    includeFontPadding: false,
  },
  editorShell: {
    flex: 1,
    minHeight: 0,
    borderTopWidth: 1,
    borderTopColor: MATCHMAKER_HOME.border,
  },
  editorScroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  editorScrollContent: {
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.base,
    paddingBottom: SPACING.compact,
    gap: SPACING.base,
  },
  group: { gap: SPACING.tight }, groupTitle: { color: MATCHMAKER_HOME.subtleForeground, fontSize: 12, lineHeight: 16, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  preferenceRow: { padding: SPACING.compact, borderRadius: RADIUS.md, backgroundColor: MATCHMAKER_HOME.surface, gap: SPACING.tight }, preferenceHeading: { flexDirection: 'row', alignItems: 'center', gap: SPACING.tight }, preferenceCopy: { flex: 1, gap: 2 }, preferenceValue: { color: MATCHMAKER_HOME.foreground, fontSize: 15, lineHeight: 21, fontWeight: '600' }, preferenceSource: { color: MATCHMAKER_HOME.subtleForeground, fontSize: 11, lineHeight: 15 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.full }, editRow: { flexDirection: 'row', alignItems: 'center', gap: 2 }, editInput: { flex: 1, minHeight: 44, color: MATCHMAKER_HOME.foreground, borderBottomWidth: 1, borderBottomColor: MATCHMAKER_HOME.primary, fontSize: 15 }, rowActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  smallChip: { minHeight: 36, justifyContent: 'center', borderWidth: 1, borderColor: MATCHMAKER_HOME.border, borderRadius: RADIUS.full, paddingHorizontal: 11 }, smallChipSelected: { borderColor: MATCHMAKER_HOME.primary, backgroundColor: MATCHMAKER_HOME.navActive }, smallChipText: { color: MATCHMAKER_HOME.mutedForeground, fontSize: 12, lineHeight: 16, fontWeight: '600' }, smallChipTextSelected: { color: MATCHMAKER_HOME.foreground },
  confirmButton: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, borderRadius: RADIUS.full, backgroundColor: MATCHMAKER_HOME.primary }, confirmText: { color: MATCHMAKER_HOME.primaryForeground, fontSize: 12, lineHeight: 16, fontWeight: '700' }, emptyText: { color: MATCHMAKER_HOME.mutedForeground, fontSize: 14, lineHeight: 20 },
  addForm: { gap: SPACING.compact }, addInput: { minHeight: 48, borderWidth: 1, borderColor: MATCHMAKER_HOME.borderStrong, borderRadius: RADIUS.md, paddingHorizontal: SPACING.compact, color: MATCHMAKER_HOME.foreground, fontSize: 15 }, formActions: { flexDirection: 'row', gap: SPACING.tight }, saveButton: { minHeight: 44, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.md, backgroundColor: MATCHMAKER_HOME.primary }, saveText: { color: MATCHMAKER_HOME.primaryForeground, fontSize: 14, fontWeight: '700' }, cancelButton: { minHeight: 44, paddingHorizontal: SPACING.base, justifyContent: 'center' }, cancelText: { color: MATCHMAKER_HOME.mutedForeground, fontSize: 14, fontWeight: '600' },
  footerActions: {
    minHeight: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.tight,
    borderTopWidth: 1,
    borderTopColor: MATCHMAKER_HOME.border,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.tight,
    backgroundColor: MATCHMAKER_HOME.backgroundRaised,
  }, addButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6 }, addButtonText: { color: MATCHMAKER_HOME.primary, fontSize: 14, fontWeight: '700' }, undoButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: SPACING.tight }, undoText: { color: MATCHMAKER_HOME.mutedForeground, fontSize: 13, fontWeight: '600' },
  errorText: { color: MATCHMAKER_HOME.error, fontSize: 13, lineHeight: 18 }, pressed: { opacity: 0.72 }, disabled: { opacity: 0.45 },
  briefError: { gap: SPACING.tight }, retryButton: { minHeight: 44, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: SPACING.compact }, retryText: { color: MATCHMAKER_HOME.primary, fontSize: 13, lineHeight: 18, fontWeight: '700' },
});
