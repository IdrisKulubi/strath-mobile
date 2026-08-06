import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import { MATCHMAKER_HOME, RADIUS, SPACING } from '@/lib/design-tokens';
import { buildFeedbackLearningPreview, feedbackReason, MATCHMAKER_FEEDBACK_REASONS } from '@/lib/matchmaker/feedback';
import { clearMatchmakerFeedbackDraft, createMatchmakerFeedbackDraft, loadMatchmakerFeedbackDraft, saveMatchmakerFeedbackDraft, type MatchmakerFeedbackDraft } from '@/lib/matchmaker/feedback-draft';
import type { MatchmakerFeedbackInput, MatchmakerFeedbackLearningScope, MatchmakerFeedbackReasonCode } from '@/types/matchmaker';

interface MatchmakerFeedbackFlowProps {
  shortlistId: string;
  candidateUserId: string;
  candidateName: string | null;
  briefVersion: number;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (input: MatchmakerFeedbackInput) => Promise<unknown>;
  onEvent?: (event: 'feedback_reason_selected' | 'feedback_follow_up_requested' | 'feedback_follow_up_completed' | 'feedback_learning_previewed' | 'feedback_learning_cancelled', reasonCode: MatchmakerFeedbackReasonCode) => void;
}

export function MatchmakerFeedbackFlow({ shortlistId, candidateUserId, candidateName, briefVersion, busy, onCancel, onSubmit, onEvent }: MatchmakerFeedbackFlowProps) {
  const [draft, setDraft] = useState<MatchmakerFeedbackDraft>(createMatchmakerFeedbackDraft);
  const [restored, setRestored] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reason = draft.reasonCode ? feedbackReason(draft.reasonCode) : null;
  const preview = draft.reasonCode ? buildFeedbackLearningPreview(draft.reasonCode, draft.detail) : null;
  const showingDetail = draft.learningScope === 'future_matches' && reason?.needsFutureDetail && !draft.detailConfirmed;
  const showingPreview = draft.learningScope === 'future_matches' && (!reason?.needsFutureDetail || draft.detailConfirmed);

  useEffect(() => {
    let active = true;
    loadMatchmakerFeedbackDraft(shortlistId, candidateUserId).then((saved) => {
      if (active && saved) setDraft(saved);
      if (active) setRestored(true);
    });
    return () => { active = false; };
  }, [candidateUserId, shortlistId]);

  useEffect(() => {
    if (!restored) return;
    saveMatchmakerFeedbackDraft(shortlistId, candidateUserId, draft).catch(() => undefined);
  }, [candidateUserId, draft, restored, shortlistId]);

  const title = useMemo(() => candidateName ? `What did not feel right about ${candidateName}?` : 'What did not feel right?', [candidateName]);

  const close = async () => {
    await clearMatchmakerFeedbackDraft(shortlistId, candidateUserId).catch(() => undefined);
    onCancel();
  };

  const submit = async (scope: MatchmakerFeedbackLearningScope) => {
    if (!draft.reasonCode) return;
    setError(null);
    try {
      await onSubmit({
        outcome: 'not_this_one',
        shortlistId,
        candidateUserId,
        reasonCode: draft.reasonCode,
        detail: draft.detail.trim() || undefined,
        learningScope: scope,
        confirmLearning: scope === 'future_matches',
        baseVersion: scope === 'future_matches' ? briefVersion : undefined,
        submissionId: draft.submissionId,
      });
      await clearMatchmakerFeedbackDraft(shortlistId, candidateUserId).catch(() => undefined);
      onCancel();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save this feedback. Try again.');
    }
  };

  return (
    <View accessibilityLiveRegion="polite" style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Private feedback</Text>
          <Text style={styles.title}>{title}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Skip feedback" disabled={busy} onPress={close} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <X size={19} color={MATCHMAKER_HOME.mutedForeground} />
        </Pressable>
      </View>

      {!draft.reasonCode ? (
        <View style={styles.options}>
          {MATCHMAKER_FEEDBACK_REASONS.map((item) => (
            <Pressable key={item.code} accessibilityRole="button" disabled={busy} onPress={() => {
              setDraft({ ...createMatchmakerFeedbackDraft(), reasonCode: item.code });
              onEvent?.('feedback_reason_selected', item.code);
            }} style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}>
              <Text style={styles.optionText}>{item.label}</Text>
              <ChevronRight size={18} color={MATCHMAKER_HOME.subtleForeground} />
            </Pressable>
          ))}
          <Text style={styles.privateNote}>Optional and private. This person will never see it.</Text>
        </View>
      ) : draft.learningScope === null ? (
        <View style={styles.step}>
          <Text style={styles.question}>How should I use this?</Text>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => submit('candidate_only')} style={({ pressed }) => [styles.scopeOption, pressed && styles.optionPressed]}>
            <View style={styles.scopeCopy}><Text style={styles.scopeTitle}>Only about this person</Text><Text style={styles.scopeBody}>Recommended. Your match brief stays unchanged.</Text></View>
            <ChevronRight size={18} color={MATCHMAKER_HOME.subtleForeground} />
          </Pressable>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => {
            setDraft((current) => ({ ...current, learningScope: 'future_matches' }));
            if (reason?.needsFutureDetail && draft.reasonCode) onEvent?.('feedback_follow_up_requested', draft.reasonCode);
            else if (draft.reasonCode) onEvent?.('feedback_learning_previewed', draft.reasonCode);
          }} style={({ pressed }) => [styles.scopeOption, pressed && styles.optionPressed]}>
            <View style={styles.scopeCopy}><Text style={styles.scopeTitle}>Use this for future matches</Text><Text style={styles.scopeBody}>You will review the exact brief change before it is saved.</Text></View>
            <ChevronRight size={18} color={MATCHMAKER_HOME.primary} />
          </Pressable>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <BackButton onPress={() => setDraft(createMatchmakerFeedbackDraft())} />
        </View>
      ) : showingDetail ? (
        <View style={styles.step}>
          <Text style={styles.question}>{reason?.followUp}</Text>
          <TextInput
            accessibilityLabel="Feedback detail"
            autoFocus
            multiline
            maxLength={240}
            placeholder="Add one specific detail"
            placeholderTextColor={MATCHMAKER_HOME.subtleForeground}
            value={draft.detail}
            onChangeText={(detail) => setDraft((current) => ({ ...current, detail }))}
            style={styles.input}
          />
          <Pressable accessibilityRole="button" disabled={busy || !draft.detail.trim()} onPress={() => {
            setDraft((current) => ({ ...current, detailConfirmed: true }));
            if (draft.reasonCode) {
              onEvent?.('feedback_follow_up_completed', draft.reasonCode);
              onEvent?.('feedback_learning_previewed', draft.reasonCode);
            }
          }} style={({ pressed }) => [styles.primaryButton, (!draft.detail.trim() || busy) && styles.disabled, pressed && styles.primaryPressed]}>
            <Text style={styles.primaryText}>Review brief change</Text><ChevronRight size={18} color={MATCHMAKER_HOME.primaryForeground} />
          </Pressable>
          <BackButton onPress={() => setDraft((current) => ({ ...current, learningScope: null }))} />
        </View>
      ) : showingPreview ? (
        <View style={styles.step}>
          <Text style={styles.question}>Review what will change</Text>
          <View style={styles.preview}><Text style={styles.previewLabel}>Your match brief will add</Text><Text style={styles.previewText}>{preview}</Text></View>
          <Text style={styles.scopeBody}>Nothing else about this person will become a rule.</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable accessibilityRole="button" disabled={busy || !preview} onPress={() => submit('future_matches')} style={({ pressed }) => [styles.primaryButton, (busy || !preview) && styles.disabled, pressed && styles.primaryPressed]}>
            {busy ? <ActivityIndicator size="small" color={MATCHMAKER_HOME.primaryForeground} /> : <Check size={18} color={MATCHMAKER_HOME.primaryForeground} />}
            <Text style={styles.primaryText}>Confirm and save</Text>
          </Pressable>
          <BackButton onPress={() => {
            if (draft.reasonCode) onEvent?.('feedback_learning_cancelled', draft.reasonCode);
            setDraft((current) => ({ ...current, learningScope: null, detailConfirmed: false }));
          }} label="Use only for this person instead" />
        </View>
      ) : null}
    </View>
  );
}

function BackButton({ onPress, label = 'Back' }: { onPress: () => void; label?: string }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}><ChevronLeft size={17} color={MATCHMAKER_HOME.mutedForeground} /><Text style={styles.backText}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  wrap: { gap: SPACING.base, padding: SPACING.base, borderWidth: 1, borderColor: MATCHMAKER_HOME.borderStrong, borderRadius: RADIUS.xl, backgroundColor: MATCHMAKER_HOME.backgroundRaised },
  header: { minHeight: 44, flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.compact },
  headerCopy: { flex: 1, gap: SPACING.micro },
  eyebrow: { color: MATCHMAKER_HOME.primary, fontSize: 12, lineHeight: 16, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { color: MATCHMAKER_HOME.foreground, fontSize: 18, lineHeight: 24, fontWeight: '700' },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  options: { gap: SPACING.tight },
  option: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: SPACING.compact, paddingHorizontal: SPACING.compact, borderRadius: RADIUS.md, backgroundColor: MATCHMAKER_HOME.surface },
  optionPressed: { backgroundColor: MATCHMAKER_HOME.surfacePressed },
  optionText: { flex: 1, color: MATCHMAKER_HOME.foreground, fontSize: 15, lineHeight: 20, fontWeight: '600' },
  privateNote: { color: MATCHMAKER_HOME.subtleForeground, fontSize: 12, lineHeight: 17, textAlign: 'center', marginTop: SPACING.micro },
  step: { gap: SPACING.compact },
  question: { color: MATCHMAKER_HOME.foreground, fontSize: 16, lineHeight: 22, fontWeight: '700' },
  scopeOption: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: SPACING.compact, padding: SPACING.compact, borderWidth: 1, borderColor: MATCHMAKER_HOME.border, borderRadius: RADIUS.md },
  scopeCopy: { flex: 1, gap: 3 },
  scopeTitle: { color: MATCHMAKER_HOME.foreground, fontSize: 14, lineHeight: 19, fontWeight: '700' },
  scopeBody: { color: MATCHMAKER_HOME.mutedForeground, fontSize: 13, lineHeight: 18 },
  input: { minHeight: 104, color: MATCHMAKER_HOME.foreground, fontSize: 15, lineHeight: 21, textAlignVertical: 'top', padding: SPACING.compact, borderWidth: 1, borderColor: MATCHMAKER_HOME.borderStrong, borderRadius: RADIUS.md, backgroundColor: MATCHMAKER_HOME.surface },
  preview: { gap: SPACING.micro, padding: SPACING.compact, borderRadius: RADIUS.md, backgroundColor: MATCHMAKER_HOME.surfaceStrong },
  previewLabel: { color: MATCHMAKER_HOME.subtleForeground, fontSize: 11, lineHeight: 15, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  previewText: { color: MATCHMAKER_HOME.foreground, fontSize: 15, lineHeight: 21, fontWeight: '600' },
  primaryButton: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.tight, paddingHorizontal: SPACING.base, borderRadius: RADIUS.md, backgroundColor: MATCHMAKER_HOME.primary },
  primaryPressed: { backgroundColor: MATCHMAKER_HOME.primaryPressed },
  primaryText: { color: MATCHMAKER_HOME.primaryForeground, fontSize: 15, lineHeight: 20, fontWeight: '800' },
  backButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.micro },
  backText: { color: MATCHMAKER_HOME.mutedForeground, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  error: { color: MATCHMAKER_HOME.error, fontSize: 13, lineHeight: 18 },
  disabled: { opacity: 0.48 },
  pressed: { opacity: 0.76 },
});
