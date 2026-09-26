import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';

import { ReviewAnswerRow } from '@/components/questionnaire/review-answer-row';
import { ChapterProgress, chapterNumberFromAnswerCount } from '@/components/questionnaire/segmented-progress';
import { StickyFooter } from '@/components/questionnaire/sticky-footer';
import { Action, Copy, Feedback, Loading, Notice, Page } from '@/components/questionnaire/ui';
import { useTheme } from '@/hooks/use-theme';
import { useReducedMotion } from 'react-native-reanimated';
import { OnboardingChoiceRow, OnboardingPrimaryButton, OnboardingScreenShell, RisingInlineFeedback, RisingTextField, useRisingBeatController } from '@/components/onboarding';
import { Text } from '@/components/ui/text';
import { isApiError, isNetworkError } from '@/lib/api-client';
import { SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { createInteractionGate, EXPLANATION_MAX_LENGTH, IMPORTANCE_CHOICES, isCompleteQuestionDraft, isUsableDraft, nextQuestion, partnerChoiceLayout, resumePartnerDraft, toggleAcceptable, toggleAllAcceptable, type StoredQuestionDraft } from '@/lib/questionnaire-flow';
import { useIdentity, useQuestionnaire, useQuestionnaireMutation, type Question, type QuestionnaireState } from '@/lib/questionnaire';

type Payload = { questions: Question[]; state: QuestionnaireState };
type SaveResult = { saved: true; revision: number; answerCount: number; complete: boolean };

export default function QuestionsScreen() {
  const router = useRouter();
  const { review, extra } = useLocalSearchParams<{ review?: string; extra?: string }>();
  const wantsReview = review === '1';
  const wantsExtra = extra === '1';
  const skipDiscoverRedirect = wantsReview || wantsExtra;
  const questionnaire = useQuestionnaire<Payload>('questions');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const completeRedirected = useRef(false);

  const autoReviewing = wantsReview && Boolean(questionnaire.data?.state.complete);
  const bootstrapExtraQuestionId = useMemo(() => {
    if (!questionnaire.data || !wantsExtra || !questionnaire.data.state.complete) return null;
    return nextQuestion(questionnaire.data.questions, questionnaire.data.state)?.id ?? null;
  }, [questionnaire.data, wantsExtra]);
  const effectiveSelectedId = selectedId ?? bootstrapExtraQuestionId;
  const isReviewing = reviewing || autoReviewing;

  useEffect(() => {
    if (completeRedirected.current) return;
    if (!questionnaire.data) return;
    const { state } = questionnaire.data;
    if (!state.complete || effectiveSelectedId || isReviewing || skipDiscoverRedirect) return;
    completeRedirected.current = true;
    router.replace('/dating' as never);
  }, [effectiveSelectedId, isReviewing, questionnaire.data, router, skipDiscoverRedirect]);

  const current = useMemo(() => {
    if (!questionnaire.data) return null;
    if (effectiveSelectedId) {
      return questionnaire.data.questions.find((question) => question.id === effectiveSelectedId) ?? null;
    }
    if (isReviewing) return null;
    return nextQuestion(questionnaire.data.questions, questionnaire.data.state);
  }, [effectiveSelectedId, isReviewing, questionnaire.data]);

  async function refreshAfter(questionId: string) {
    setHistory((items) => [...items.filter((id) => id !== questionId), questionId]);
    setSelectedId(null);
    await questionnaire.refetch();
  }

  if (questionnaire.isPending) {
    return (
      <Page title="What matters to you">
        <Loading />
      </Page>
    );
  }
  if (questionnaire.isError || !questionnaire.data) {
    return (
      <Page title="What matters to you">
        <Feedback error={questionnaire.error} />
        <Action label="Try loading again" tone="primary" onPress={() => { void questionnaire.refetch(); }} />
      </Page>
    );
  }

  const { state, questions } = questionnaire.data;

  if (state.complete && !effectiveSelectedId && !isReviewing && !skipDiscoverRedirect) {
    return (
      <Page title="What matters to you">
        <Loading label="Opening Discover" />
      </Page>
    );
  }

  if (current && !isReviewing) {
    return (
      <QuestionEditorPage
        key={`${current.id}:${state.revision}`}
        question={current}
        revision={state.revision}
        chapterIndex={chapterNumberFromAnswerCount(state.answerCount + 1) - 1}
        savedCount={state.answerCount}
        requiredCount={state.required}
        previousQuestionId={history.at(-1) ?? null}
        onPrevious={(questionId) => { setHistory((items) => items.slice(0, -1)); setSelectedId(questionId); }}
        onDone={() => refreshAfter(current.id)}
      />
    );
  }

  const answeredQuestions = questions.filter((question) => question.answer_id);

  return (
    <Page
      title={isReviewing ? 'Review your answers' : 'Questions unavailable'}
      eyebrow={isReviewing ? `${state.answerCount} of ${state.required} saved` : undefined}
      back={isReviewing || state.complete}
      onBackPress={isReviewing ? () => {
        if (wantsReview) router.replace('/dating' as never);
        else { setReviewing(false); setSelectedId(null); }
      } : undefined}
      floatingFooter={isReviewing && state.complete}
      footerButtonCount={isReviewing && state.complete ? 2 : 1}
      footer={
        isReviewing && state.complete ? (
          <StickyFooter
            glassStack
            floating
            secondaryLabel="Back to Discover"
            onSecondaryPress={() => router.replace('/dating' as never)}
            primaryLabel="See your matches"
            onPrimaryPress={() => router.replace('/dating' as never)}
          />
        ) : undefined
      }
    >
      {isReviewing ? (
        <>
          <ChapterProgress answerCount={state.answerCount} />
          <Copy muted>Tap any question to edit. Labels show what appears on your profile versus matching only.</Copy>
          <View style={styles.reviewList}>
            {answeredQuestions.map((question, index) => (
              <ReviewAnswerRow
                key={question.id}
                index={index + 1}
                prompt={question.prompt}
                isPublic={Boolean(question.public)}
                onPress={() => { setSelectedId(question.id); setReviewing(false); }}
              />
            ))}
          </View>
          {state.answerCount === 0 ? <Notice>No answers yet. Complete the questions to see them here.</Notice> : null}
        </>
      ) : (
        <>
          <Copy>We could not find the next required question. Try loading it again.</Copy>
          <Action label="Try loading questions again" tone="primary" onPress={() => { void questionnaire.refetch(); }} />
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
  requiredCount,
  previousQuestionId,
  onPrevious,
  onDone,
}: {
  question: Question;
  revision: number;
  chapterIndex: number;
  savedCount: number;
  requiredCount: number;
  previousQuestionId: string | null;
  onPrevious: (questionId: string) => void;
  onDone: () => Promise<void>;
}) {
  const { colors } = useTheme();
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const { beat, advance, back, jump } = useRisingBeatController(3, reducedMotion);
  const identity = useIdentity();
  const save = useQuestionnaireMutation<SaveResult>('answers', 'PUT');
  const remove = useQuestionnaireMutation<{ deleted: boolean; revision: number; answerCount: number }>('answers', 'DELETE');
  const [answer, setAnswer] = useState(question.answer_id ?? '');
  const [acceptable, setAcceptable] = useState<string[]>(
    question.answer_id === question.neutral_answer_id
      ? question.acceptable ?? []
      : (question.acceptable ?? []).filter((id) => id !== question.neutral_answer_id),
  );
  const [weight, setWeight] = useState(question.weight ?? 10);
  const [weightChosen, setWeightChosen] = useState(question.weight !== null && Boolean(question.answer_id));
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
  const { visibleOptions: partnerOptions, showSelectAll } = useMemo(
    () => partnerChoiceLayout(question.options, question.neutral_answer_id),
    [question.options, question.neutral_answer_id],
  );
  const isNeutral = answer !== '' && answer === question.neutral_answer_id;
  const partnerOptionIds = useMemo(() => partnerOptions.map((option) => option.id), [partnerOptions]);
  const allPartnerOptionsSelected = partnerOptions.length > 0 && partnerOptions.every((option) => acceptable.includes(option.id));
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
          const resumed = resumePartnerDraft(parsed, question.neutral_answer_id);
          setAnswer(parsed.answer);
          setAcceptable(parsed.answer === question.neutral_answer_id
            ? resumed.acceptable
            : resumed.acceptable.filter((id) => id !== question.neutral_answer_id));
          setWeight(parsed.weight);
          setExplanation(parsed.explanation);
          setWeightChosen(parsed.weightChosen ?? Boolean(question.answer_id || (parsed.beat ?? 0) >= 3));
          jump(resumed.beat);
          setDraftRestored(true);
        } else {
          await SecureStore.deleteItemAsync(key);
        }
      } catch {
        await SecureStore.deleteItemAsync(key).catch(() => {});
      }
    }).catch(() => {}).finally(() => { if (active) { clearTimeout(timeout); setDraftLoaded(true); } });
    return () => { active = false; clearTimeout(timeout); };
  }, [identity.isPending, key, optionIds, question.answer_id, question.id, question.neutral_answer_id, revision, userId, jump]);

  useEffect(() => {
    if (!draftLoaded || !userId) return;
    const draft: StoredQuestionDraft = { userId, questionId: question.id, revision, answer, acceptable, partnerChoicesExplicit: true, weight, explanation, beat, weightChosen };
    const timer = setTimeout(() => { void SecureStore.setItemAsync(key, JSON.stringify(draft)).catch(() => {}); }, 300);
    return () => clearTimeout(timer);
  }, [acceptable, answer, beat, draftLoaded, explanation, key, question.id, revision, userId, weight, weightChosen]);

  const busy = save.isPending || remove.isPending;
  const conflict = isApiError(localError) && localError.status === 409;
  const offline = isNetworkError(localError);
  const canSave = isNeutral || (isCompleteQuestionDraft(partnerOptionIds, answer, acceptable, weight, explanation) && weightChosen);

  function chooseAnswer(optionId: string) {
    if (busy || !choiceGate.current.tryEnter()) return;
    userEdited.current = true;
    setAnswer(optionId);
    if (optionId !== answer) setAcceptable(optionId === question.neutral_answer_id ? [optionId] : []);
    setLocalError(null);
    if (optionId === question.neutral_answer_id) {
      setWeight(0);
      setWeightChosen(true);
      setExplanation('');
      jump(3);
    } else {
      advance();
    }
  }

  function chooseWeight(value: number) {
    if (busy || !choiceGate.current.tryEnter()) return;
    userEdited.current = true;
    setWeight(value);
    setWeightChosen(true);
    setLocalError(null);
    advance();
  }

  async function submit() {
    if (!canSave || !actionGate.current.tryEnter()) return;
    try {
      setLocalError(null);
      await save.mutateAsync({ questionId: question.id, answerId: answer, acceptable: isNeutral ? [answer] : acceptable, weight: isNeutral ? 0 : weight, public: true, explanation: isNeutral ? '' : explanation.trim(), revision });
      await SecureStore.deleteItemAsync(key).catch(() => {});
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await onDone();
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
      await remove.mutateAsync({ questionId: question.id, revision });
      await SecureStore.deleteItemAsync(key).catch(() => {});
      await onDone();
    } catch (error) {
      setLocalError(error);
    } finally {
      actionGate.current.reset();
    }
  }

  const previousAnswer = beat <= 1 || isNeutral ? undefined : {
    label: beat === 2 ? 'Partner answers' : 'Importance',
    value: beat === 2
      ? acceptable.map(optionLabel).join(', ')
      : IMPORTANCE_CHOICES.find((choice) => choice.value === weight)?.label ?? '',
    onEdit: busy ? undefined : () => jump(beat - 1),
  };
  const titles = [question.prompt, 'What would work for you in a partner?', 'How much does this matter?', isNeutral ? 'Keep this to yourself?' : 'Want to add a little context?'];
  const subtitles = [
    'Choose the answer that feels most like you. Saved answers appear on your profile.',
    'Choose the answers you would accept in a partner. Pick at least one, even if it differs from your answer.',
    'Choose the importance that feels right to you.',
    isNeutral ? 'This choice appears on your profile but does not affect matching. Save to continue.' : 'Optional. Add a note in your own words. Your answer and note will be visible to people viewing your profile.',
  ];
  const handleBack = useCallback(() => {
    if (busy) return;
    choiceGate.current.reset();
    if (beat > 0) { if (isNeutral) jump(0); else back(); return; }
    if (previousQuestionId) { onPrevious(previousQuestionId); return; }
    if (savedCount >= requiredCount) router.back();
  }, [back, beat, busy, isNeutral, jump, onPrevious, previousQuestionId, requiredCount, router, savedCount]);

  useFocusEffect(useCallback(() => {
    if (savedCount >= requiredCount) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack();
      return true;
    });
    return () => subscription.remove();
  }, [handleBack, requiredCount, savedCount]));

  return (
    <OnboardingScreenShell
      presentation="rising"
      stepIndex={savedCount}
      beatKey={`${question.id}:${beat}`}
      progressLabel={`Your rhythm · ${savedCount} of ${requiredCount} saved`}
      progressIndex={chapterIndex}
      progressCount={Math.ceil(requiredCount / 5)}
      onBack={beat > 0 || previousQuestionId || savedCount >= requiredCount ? handleBack : undefined}
      title={draftLoaded ? titles[beat] : 'Getting your answer ready'}
      subtitle={draftLoaded ? subtitles[beat] : 'Your saved choices will appear here.'}
      previousAnswer={draftLoaded ? previousAnswer : undefined}
      footer={draftLoaded && (beat === 1 || beat === 3) ? (
        <OnboardingPrimaryButton
          appearance="rising"
          label={beat === 3 ? save.isPending ? 'Saving…' : 'Save and continue' : 'Continue'}
          disabled={busy || (beat === 1 ? !acceptable.some((id) => partnerOptionIds.includes(id)) : !canSave)}
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
              ) : null}
              {previousQuestionId ? <Pressable accessibilityRole="button" disabled={busy} onPress={() => onPrevious(previousQuestionId)} style={styles.textAction}><Text style={[styles.actionText, { color: colors.primaryText }]}>Previous question</Text></Pressable> : null}
            </>
          ) : null}
          {beat === 1 ? (
            <>
              {showSelectAll ? <OnboardingChoiceRow appearance="rising" selectionMode="multiple" option={{ value: 'select-all', label: 'Select all' }} selected={allPartnerOptionsSelected} disabled={busy} onPress={() => { userEdited.current = true; setAcceptable((items) => toggleAllAcceptable(partnerOptionIds, items)); }} /> : null}
              {partnerOptions.map((option) => <OnboardingChoiceRow key={option.id} appearance="rising" selectionMode="multiple" option={{ value: option.id, label: option.label }} selected={acceptable.includes(option.id)} disabled={busy} onPress={() => { userEdited.current = true; setAcceptable((items) => toggleAcceptable(option.id, items)); }} />)}
            </>
          ) : null}
          {beat === 2 ? IMPORTANCE_CHOICES.map((choice) => <OnboardingChoiceRow key={choice.value} appearance="rising" option={{ value: String(choice.value), label: choice.label, description: choice.description }} selected={weightChosen && weight === choice.value} disabled={busy} onPress={() => chooseWeight(choice.value)} />) : null}
          {beat === 3 && !isNeutral ? (
            <>
              <RisingTextField label="Optional context" value={explanation} onChangeText={(value) => { userEdited.current = true; setExplanation(value.slice(0, EXPLANATION_MAX_LENGTH)); }} maxLength={EXPLANATION_MAX_LENGTH} multiline placeholder="Add a little context in your own words" />
              <Text style={[styles.helper, { color: colors.mutedForeground }]}>{explanation.length}/{EXPLANATION_MAX_LENGTH} characters</Text>
            </>
          ) : null}
          {draftRestored && !busy ? <RisingInlineFeedback message="Your unfinished answer was restored." /> : null}
          {busy ? <RisingInlineFeedback message={save.isPending ? 'Saving your answer…' : 'Deleting your answer…'} /> : null}
          {localError ? <Feedback error={localError} /> : null}
          {offline ? <RisingInlineFeedback message="Your choices are on this phone. Reconnect, then try again." /> : null}
          {conflict ? <Pressable accessibilityRole="button" onPress={() => { void onDone(); }} style={styles.textAction}><Text style={[styles.actionText, { color: colors.primaryText }]}>Load the latest saved answer</Text></Pressable> : null}
        </View>
      )}
    </OnboardingScreenShell>
  );
}

const styles = StyleSheet.create({
  reviewList: { gap: SPACING.compact },
  beatBody: { gap: SPACING.compact },
  helper: { ...TYPOGRAPHY.caption },
  textAction: { minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  actionText: { ...TYPOGRAPHY.callout, fontWeight: '600', textAlign: 'center' },
});
