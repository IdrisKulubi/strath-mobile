import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';

import { TextLink } from '@/components/questionnaire/expandable-row';
import { ReviewAnswerRow } from '@/components/questionnaire/review-answer-row';
import { ChapterProgress, chapterNumberFromAnswerCount } from '@/components/questionnaire/segmented-progress';
import { StickyFooter } from '@/components/questionnaire/sticky-footer';
import { Action, Copy, Feedback, Loading, Notice, Page } from '@/components/questionnaire/ui';
import { useTheme } from '@/hooks/use-theme';
import { useReducedMotion } from 'react-native-reanimated';
import { OnboardingChoiceRow, OnboardingPrimaryButton, OnboardingScreenShell, RisingInlineFeedback, RisingTextField, useRisingBeatController } from '@/components/onboarding';
import { Text } from '@/components/ui/text';
import { isApiError, isNetworkError } from '@/lib/api-client';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { createInteractionGate, EXPLANATION_MAX_LENGTH, IMPORTANCE_CHOICES, isCompleteQuestionDraft, isUsableDraft, nextQuestion, selectOwnAnswer, shouldPauseAfterAnswer, toggleAcceptable, toggleAllAcceptable, type StoredQuestionDraft } from '@/lib/questionnaire-flow';
import { useIdentity, useQuestionnaire, useQuestionnaireMutation, type Question, type QuestionnaireState } from '@/lib/questionnaire';

type Payload = { questions: Question[]; state: QuestionnaireState };
type SaveResult = { saved: true; revision: number; answerCount: number; complete: boolean };

export default function QuestionsScreen() {
  const router = useRouter();
  const questionnaire = useQuestionnaire<Payload>('questions');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [includeSkipped, setIncludeSkipped] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const milestoneHaptic = useRef(false);

  const current = useMemo(() => {
    if (!questionnaire.data) return null;
    return questionnaire.data.questions.find((question) => question.id === selectedId)
      ?? nextQuestion(questionnaire.data.questions, questionnaire.data.state, includeSkipped);
  }, [includeSkipped, questionnaire.data, selectedId]);

  useEffect(() => {
    if (!pausedAt || milestoneHaptic.current) return;
    milestoneHaptic.current = true;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [pausedAt]);

  async function refreshAfter(questionId: string, answerCount?: number, didSave = false, previousCount = 0) {
    setHistory((items) => [...items.filter((id) => id !== questionId), questionId]);
    setSelectedId(null);
    if (answerCount && shouldPauseAfterAnswer(answerCount, didSave, previousCount)) {
      milestoneHaptic.current = false;
      setPausedAt(answerCount);
    }
    await questionnaire.refetch();
  }

  if (questionnaire.isPending) {
    return (
      <Page title="What matters to you" back>
        <Loading />
      </Page>
    );
  }
  if (questionnaire.isError || !questionnaire.data) {
    return (
      <Page title="What matters to you" back>
        <Feedback error={questionnaire.error} />
        <Action label="Try loading again" tone="primary" onPress={() => { void questionnaire.refetch(); }} />
      </Page>
    );
  }

  const { state, questions } = questionnaire.data;
  const hasAnswers = state.answerCount > 0;
  const canRevisitSkipped = questions.length > 0 && !includeSkipped && state.skipped.length > 0;
  const shouldRetry = questions.length === 0 || (!hasAnswers && !canRevisitSkipped);

  if (pausedAt) {
    const chapter = pausedAt / 5;
    return (
      <Page
        title={`Chapter ${chapter} done`}
        eyebrow="Questions saved"
        back
        footer={
          <StickyFooter
            primaryLabel="Keep going"
            onPrimaryPress={() => setPausedAt(null)}
            secondaryLabel="Take a break"
            onSecondaryPress={() => router.replace('/dating' as never)}
          />
        }
      >
        <ChapterProgress answerCount={pausedAt} />
        <Copy>Your answers are safely stored. Pick up with the next five whenever you are ready.</Copy>
      </Page>
    );
  }

  if (state.complete && !selectedId && !reviewing) {
    return (
      <Page
        title="Discover is open"
        eyebrow="20 answers saved"
        back
        footer={
          <StickyFooter
            primaryLabel="See your matches"
            onPrimaryPress={() => router.replace('/dating' as never)}
            secondaryLabel="Review answers"
            onSecondaryPress={() => setReviewing(true)}
          />
        }
      >
        <ChapterProgress answerCount={20} />
        <Copy>You can keep answering to improve comparisons, or review anything you have shared.</Copy>
        <Action label="Answer another question" tone="ghost" onPress={() => setSelectedId(nextQuestion(questions, state, includeSkipped)?.id ?? null)} />
      </Page>
    );
  }

  if (current && !reviewing) {
    return (
      <QuestionEditorPage
        key={`${current.id}:${state.revision}`}
        question={current}
        revision={state.revision}
        chapterIndex={Math.min(3, chapterNumberFromAnswerCount(state.answerCount + 1) - 1)}
        savedCount={state.answerCount}
        previousQuestionId={history.at(-1) ?? null}
        onPrevious={(questionId) => { setHistory((items) => items.slice(0, -1)); setSelectedId(questionId); }}
        onDone={(answerCount, didSave) => refreshAfter(current.id, answerCount, didSave, state.answerCount)}
      />
    );
  }

  return (
    <Page
      title={reviewing ? 'Review your answers' : questions.length === 0 ? 'Questions unavailable' : canRevisitSkipped ? 'Pick up where you left off' : hasAnswers ? 'All caught up' : 'Questions unavailable'}
      eyebrow={reviewing ? `${state.answerCount} saved` : undefined}
      back
    >
      {reviewing ? <Action label="Back to questions" onPress={() => { setReviewing(false); setSelectedId(null); }} /> : null}

      {reviewing ? (
        <View style={{ gap: SPACING.compact }}>
          {questions.filter((question) => question.answer_id).map((question, index) => (
            <ReviewAnswerRow
              key={question.id}
              index={index + 1}
              prompt={question.prompt}
              isPublic={Boolean(question.public)}
              onPress={() => { setSelectedId(question.id); setReviewing(false); }}
            />
          ))}
          {state.answerCount === 0 ? <Notice>No answers yet. Complete the first batch to see them here.</Notice> : null}
        </View>
      ) : (
        <>
          <Copy>
            {questions.length === 0
              ? 'We could not find any questions to show. Try loading them again.'
              : canRevisitSkipped
                ? 'You have seen every available question. Revisit the ones you skipped whenever you are ready.'
                : hasAnswers
                  ? 'You have answered every available question. Your saved answers are ready to review.'
                  : 'There are no starter questions to answer right now. Try loading them again.'}
          </Copy>
          {canRevisitSkipped ? <Action label="Revisit skipped questions" tone="primary" onPress={() => setIncludeSkipped(true)} /> : null}
          {shouldRetry
            ? <Action label="Try loading questions again" tone="primary" onPress={() => { void questionnaire.refetch(); }} />
            : null}
          {hasAnswers ? <Action label="Review saved answers" onPress={() => setReviewing(true)} /> : null}
          <TextLink label="Return to Discover" onPress={() => router.replace('/dating' as never)} />
        </>
      )}
    </Page>
  );
}

function QuestionEditorPage({
  question,
  revision,
  chapterIndex,
  savedCount,
  previousQuestionId,
  onPrevious,
  onDone,
}: {
  question: Question;
  revision: number;
  chapterIndex: number;
  savedCount: number;
  previousQuestionId: string | null;
  onPrevious: (questionId: string) => void;
  onDone: (answerCount?: number, didSave?: boolean) => Promise<void>;
}) {
  const { colors } = useTheme();
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const { beat, advance, back, jump } = useRisingBeatController(4, reducedMotion);
  const identity = useIdentity();
  const save = useQuestionnaireMutation<SaveResult>('answers', 'PUT');
  const remove = useQuestionnaireMutation<{ deleted: boolean; revision: number; answerCount: number }>('answers', 'DELETE');
  const skip = useQuestionnaireMutation<{ saved: true; answerCount: number }>('skip');
  const [answer, setAnswer] = useState(question.answer_id ?? '');
  const [acceptable, setAcceptable] = useState<string[]>(question.acceptable ?? []);
  const [weight, setWeight] = useState(question.weight ?? 10);
  const [weightChosen, setWeightChosen] = useState(question.weight !== null && Boolean(question.answer_id));
  const [visible, setVisible] = useState(question.public ?? false);
  const [visibilityChosen, setVisibilityChosen] = useState(question.public !== null && Boolean(question.answer_id));
  const [explanation, setExplanation] = useState(question.explanation ?? '');
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [localError, setLocalError] = useState<unknown>(null);
  const userEdited = useRef(false);
  const choiceGate = useRef(createInteractionGate());
  const actionGate = useRef(createInteractionGate());
  const userId = identity.data ?? '';
  const key = `questionnaire-draft:${userId}:${question.id.replace(':', '-')}`;
  const optionIds = useMemo(() => question.options.map((option) => option.id), [question.options]);
  const optionLabel = (id: string) => question.options.find((option) => option.id === id)?.label ?? id;

  useEffect(() => { choiceGate.current.reset(); }, [beat]);

  useEffect(() => {
    if (!userId) {
      if (identity.isPending) return;
      const fallback = setTimeout(() => setDraftLoaded(true), 0);
      return () => clearTimeout(fallback);
    }
    let active = true;
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      if (active) setDraftLoaded(true);
    }, 2000);
    void SecureStore.getItemAsync(key).then(async (raw) => {
      if (!raw || !active || timedOut || userEdited.current) return;
      try {
        const parsed: unknown = JSON.parse(raw);
        if (isUsableDraft(parsed, { userId, questionId: question.id, revision, optionIds })) {
          setAnswer(parsed.answer);
          setAcceptable(parsed.acceptable);
          setWeight(parsed.weight);
          setVisible(parsed.visible);
          setExplanation(parsed.explanation);
          setWeightChosen(parsed.weightChosen ?? Boolean(question.answer_id || (parsed.beat ?? 0) >= 3));
          setVisibilityChosen(parsed.visibilityChosen ?? Boolean(question.answer_id || (parsed.beat ?? 0) >= 4));
          jump(parsed.beat ?? 0);
          setDraftRestored(true);
        } else {
          await SecureStore.deleteItemAsync(key);
        }
      } catch {
        await SecureStore.deleteItemAsync(key).catch(() => {});
      }
    }).catch(() => {}).finally(() => { if (active) { clearTimeout(timeout); setDraftLoaded(true); } });
    return () => { active = false; clearTimeout(timeout); };
  }, [identity.isPending, key, optionIds, question.answer_id, question.id, revision, userId, jump]);

  useEffect(() => {
    if (!draftLoaded || !userId) return;
    const draft: StoredQuestionDraft = { userId, questionId: question.id, revision, answer, acceptable, weight, visible, explanation, beat, weightChosen, visibilityChosen };
    const timer = setTimeout(() => { void SecureStore.setItemAsync(key, JSON.stringify(draft)).catch(() => {}); }, 300);
    return () => clearTimeout(timer);
  }, [acceptable, answer, beat, draftLoaded, explanation, key, question.id, revision, userId, visible, visibilityChosen, weight, weightChosen]);

  const busy = save.isPending || remove.isPending || skip.isPending;
  const conflict = isApiError(localError) && localError.status === 409;
  const offline = isNetworkError(localError);
  const canSave = isCompleteQuestionDraft(optionIds, answer, acceptable, weight, explanation) && weightChosen && visibilityChosen;

  function chooseAnswer(optionId: string) {
    if (busy || !choiceGate.current.tryEnter()) return;
    userEdited.current = true;
    const selected = selectOwnAnswer(optionId, acceptable);
    setAnswer(selected.answer);
    setAcceptable(selected.acceptable);
    setLocalError(null);
    advance();
  }

  function chooseWeight(value: number) {
    if (busy || !choiceGate.current.tryEnter()) return;
    userEdited.current = true;
    setWeight(value);
    setWeightChosen(true);
    setLocalError(null);
    advance();
  }

  function chooseVisibility(value: boolean) {
    if (busy || !choiceGate.current.tryEnter()) return;
    userEdited.current = true;
    setVisible(value);
    setVisibilityChosen(true);
    setLocalError(null);
    advance();
  }

  async function submit() {
    if (!canSave || !actionGate.current.tryEnter()) return;
    try {
      setLocalError(null);
      const result = await save.mutateAsync({ questionId: question.id, answerId: answer, acceptable, weight, public: visible, explanation: explanation.trim(), revision });
      await SecureStore.deleteItemAsync(key).catch(() => {});
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await onDone(result.answerCount, true);
    } catch (error) {
      setLocalError(error);
    } finally {
      actionGate.current.reset();
    }
  }

  async function skipQuestion() {
    if (!actionGate.current.tryEnter()) return;
    try {
      setLocalError(null);
      const result = await skip.mutateAsync({ questionId: question.id });
      await SecureStore.deleteItemAsync(key).catch(() => {});
      await onDone(result.answerCount, false);
    } catch (error) {
      setLocalError(error);
    } finally {
      actionGate.current.reset();
    }
  }

  async function deleteAnswer() {
    if (!actionGate.current.tryEnter()) return;
    try {
      setLocalError(null);
      const result = await remove.mutateAsync({ questionId: question.id, revision });
      await SecureStore.deleteItemAsync(key).catch(() => {});
      await onDone(result.answerCount, false);
    } catch (error) {
      setLocalError(error);
    } finally {
      actionGate.current.reset();
    }
  }

  const previousAnswer = beat === 0 ? undefined : {
    label: ['Your answer', 'Partner answers', 'Importance', 'Visibility'][beat - 1],
    value: [optionLabel(answer), acceptable.map(optionLabel).join(', '), IMPORTANCE_CHOICES.find((choice) => choice.value === weight)?.label ?? '', visible ? 'Show on my profile' : 'Keep private'][beat - 1],
    onEdit: busy ? undefined : () => jump(beat - 1),
  };
  const titles = [question.prompt, 'What would work for you in a partner?', 'How much does this matter?', 'Keep it private or share it?', 'Want to add a little context?'];
  const subtitles = [
    question.sensitive ? 'This question is optional. You can skip it.' : 'Choose the answer that feels most like you.',
    'Choose all that feel right. Your own answer stays included.',
    'Choose the importance that feels right to you.',
    'Private answers still shape matching. A shared answer appears in comparison only when both people publish it.',
    'Optional. Add a note in your own words, then save this answer.',
  ];
  const handleBack = () => {
    if (busy) return;
    choiceGate.current.reset();
    if (beat > 0) { back(); return; }
    if (previousQuestionId) { onPrevious(previousQuestionId); return; }
    router.back();
  };

  return (
    <OnboardingScreenShell
      presentation="rising"
      stepIndex={savedCount}
      beatKey={`${question.id}:${beat}`}
      progressLabel={`Your rhythm · ${savedCount} of 20 saved`}
      progressIndex={chapterIndex}
      progressCount={4}
      onBack={handleBack}
      title={draftLoaded ? titles[beat] : 'Getting your answer ready'}
      subtitle={draftLoaded ? subtitles[beat] : 'Your saved choices will appear here.'}
      previousAnswer={draftLoaded ? previousAnswer : undefined}
      footer={draftLoaded && (beat === 1 || beat === 4) ? (
        <OnboardingPrimaryButton
          appearance="rising"
          label={beat === 4 ? save.isPending ? 'Saving…' : 'Save and continue' : 'Continue'}
          disabled={busy || (beat === 1 ? acceptable.length === 0 : !canSave)}
          onPress={beat === 1 ? advance : () => { void submit(); }}
        />
      ) : undefined}
    >
      {!draftLoaded ? <Text style={[styles.helper, { color: colors.mutedForeground }]}>Loading your saved answer…</Text> : (
        <View style={styles.beatBody}>
          {beat === 0 ? (
            <>
              {question.options.map((option) => <OnboardingChoiceRow key={option.id} appearance="rising" option={{ value: option.id, label: option.label }} selected={answer === option.id} disabled={busy} onPress={chooseAnswer} />)}
              {question.answer_id ? (
                <Pressable accessibilityRole="button" disabled={busy} onPress={() => { void deleteAnswer(); }} style={styles.textAction}><Text style={[styles.actionText, { color: colors.destructive }]}>Delete saved answer</Text></Pressable>
              ) : (
                <Pressable accessibilityRole="button" disabled={busy} onPress={() => { void skipQuestion(); }} style={styles.textAction}><Text style={[styles.actionText, { color: colors.mutedForeground }]}>Skip this question</Text></Pressable>
              )}
              {previousQuestionId ? <Pressable accessibilityRole="button" disabled={busy} onPress={() => onPrevious(previousQuestionId)} style={styles.textAction}><Text style={[styles.actionText, { color: colors.primaryText }]}>Previous question</Text></Pressable> : null}
            </>
          ) : null}
          {beat === 1 ? (
            <>
              <Pressable accessibilityRole="button" accessibilityLabel={optionIds.every((id) => acceptable.includes(id)) ? 'Use only my answer' : 'Anyone works for me'} disabled={busy} onPress={() => { userEdited.current = true; setAcceptable((items) => toggleAllAcceptable(optionIds, answer, items)); }} style={[styles.selectAll, { borderColor: colors.controlBorder, backgroundColor: colors.control }]}>
                <Text style={[styles.actionText, { color: colors.foreground }]}>{optionIds.every((id) => acceptable.includes(id)) ? 'Use only my answer' : 'Anyone works for me'}</Text>
              </Pressable>
              {question.options.map((option) => <OnboardingChoiceRow key={option.id} appearance="rising" selectionMode="multiple" option={{ value: option.id, label: option.label, description: option.id === answer ? 'Your answer is always included' : undefined }} selected={acceptable.includes(option.id)} disabled={busy || option.id === answer} onPress={() => { userEdited.current = true; setAcceptable((items) => toggleAcceptable(option.id, answer, items)); }} />)}
            </>
          ) : null}
          {beat === 2 ? IMPORTANCE_CHOICES.map((choice) => <OnboardingChoiceRow key={choice.value} appearance="rising" option={{ value: String(choice.value), label: choice.label, description: choice.description }} selected={weightChosen && weight === choice.value} disabled={busy} onPress={() => chooseWeight(choice.value)} />) : null}
          {beat === 3 ? (
            <>
              <OnboardingChoiceRow appearance="rising" option={{ value: 'private', label: 'Keep private', description: 'Still used for matching, without showing the answer in public comparison' }} selected={visibilityChosen && !visible} disabled={busy} onPress={() => chooseVisibility(false)} />
              <OnboardingChoiceRow appearance="rising" option={{ value: 'public', label: 'Show on my profile', description: 'People can compare it only when they also publish their answer' }} selected={visibilityChosen && visible} disabled={busy} onPress={() => chooseVisibility(true)} />
            </>
          ) : null}
          {beat === 4 ? (
            <>
              <RisingTextField label="Optional context" value={explanation} onChangeText={(value) => { userEdited.current = true; setExplanation(value.slice(0, EXPLANATION_MAX_LENGTH)); }} maxLength={EXPLANATION_MAX_LENGTH} multiline placeholder="Add a little context in your own words" />
              <Text style={[styles.helper, { color: colors.mutedForeground }]}>{explanation.length}/{EXPLANATION_MAX_LENGTH} characters</Text>
            </>
          ) : null}
          {draftRestored && !busy ? <RisingInlineFeedback message="Your unfinished answer was restored." /> : null}
          {busy ? <RisingInlineFeedback message={save.isPending ? 'Saving your answer…' : remove.isPending ? 'Deleting your answer…' : 'Loading another question…'} /> : null}
          {localError ? <Feedback error={localError} /> : null}
          {offline ? <RisingInlineFeedback message="Your choices are on this phone. Reconnect, then try again." /> : null}
          {conflict ? <Pressable accessibilityRole="button" onPress={() => { void onDone(); }} style={styles.textAction}><Text style={[styles.actionText, { color: colors.primaryText }]}>Load the latest saved answer</Text></Pressable> : null}
        </View>
      )}
    </OnboardingScreenShell>
  );
}

const styles = StyleSheet.create({
  beatBody: { gap: SPACING.compact },
  helper: { ...TYPOGRAPHY.caption },
  textAction: { minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  actionText: { ...TYPOGRAPHY.callout, fontWeight: '600', textAlign: 'center' },
  selectAll: { minHeight: 56, borderWidth: 1, borderRadius: RADIUS.row, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.base },
});
