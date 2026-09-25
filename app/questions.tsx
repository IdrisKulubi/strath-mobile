import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';

import { BeatReveal } from '@/components/questionnaire/beat-reveal';
import { TextLink } from '@/components/questionnaire/expandable-row';
import { ImportanceSlider } from '@/components/questionnaire/importance-slider';
import { MoreSheet } from '@/components/questionnaire/more-sheet';
import { ChipRow, OptionChip, OptionRow } from '@/components/questionnaire/option-row';
import { QuestionTopBar } from '@/components/questionnaire/question-top-bar';
import { ReviewAnswerRow } from '@/components/questionnaire/review-answer-row';
import { ChapterProgress, chapterNumberFromAnswerCount } from '@/components/questionnaire/segmented-progress';
import { StickyFooter } from '@/components/questionnaire/sticky-footer';
import { Action, Copy, Feedback, Loading, Notice, Page, SectionLabel } from '@/components/questionnaire/ui';
import { useTheme } from '@/hooks/use-theme';
import { isApiError, isNetworkError } from '@/lib/api-client';
import { SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { batchNumber, batchProgress, isBatchMilestone, isUsableDraft, nextQuestion, type StoredQuestionDraft } from '@/lib/questionnaire-flow';
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

  async function refreshAfter(questionId: string, answerCount?: number) {
    setHistory((items) => [...items.filter((id) => id !== questionId), questionId]);
    setSelectedId(null);
    if (answerCount && isBatchMilestone(answerCount)) {
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
  const batch = batchNumber(state.answerCount);
  const progress = batchProgress(state.answerCount);
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
        batchProgress={progress}
        chapterLabel={`Chapter ${chapterNumberFromAnswerCount(state.answerCount + 1)} · batch ${batch} of 4`}
        previousQuestionId={history.at(-1) ?? null}
        onPrevious={(questionId) => { setHistory((items) => items.slice(0, -1)); setSelectedId(questionId); }}
        onDone={(answerCount) => refreshAfter(current.id, answerCount)}
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
  batchProgress: batchProgressValue,
  chapterLabel,
  previousQuestionId,
  onPrevious,
  onDone,
}: {
  question: Question;
  revision: number;
  batchProgress: number;
  chapterLabel: string;
  previousQuestionId: string | null;
  onPrevious: (questionId: string) => void;
  onDone: (answerCount?: number) => Promise<void>;
}) {
  const { colors } = useTheme();
  const identity = useIdentity();
  const save = useQuestionnaireMutation<SaveResult>('answers', 'PUT');
  const remove = useQuestionnaireMutation<{ deleted: boolean; revision: number; answerCount: number }>('answers', 'DELETE');
  const skip = useQuestionnaireMutation<{ saved: true; answerCount: number }>('skip');
  const [answer, setAnswer] = useState(question.answer_id ?? '');
  const [acceptable, setAcceptable] = useState<string[]>(question.acceptable ?? []);
  const [weight, setWeight] = useState(question.weight ?? 10);
  const [visible, setVisible] = useState(question.public ?? false);
  const [explanation, setExplanation] = useState(question.explanation ?? '');
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [localError, setLocalError] = useState<unknown>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const userEdited = useRef(false);
  const userId = identity.data ?? '';
  const key = `questionnaire-draft:${userId}:${question.id.replace(':', '-')}`;

  useEffect(() => {
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
        if (isUsableDraft(parsed, { userId, questionId: question.id, revision })) {
          setAnswer(parsed.answer);
          setAcceptable(parsed.acceptable);
          setWeight(parsed.weight);
          setVisible(parsed.visible);
          setExplanation(parsed.explanation);
          setDraftRestored(true);
        } else {
          await SecureStore.deleteItemAsync(key);
        }
      } catch {
        await SecureStore.deleteItemAsync(key);
      }
    }).catch(() => {}).finally(() => { if (active) { clearTimeout(timeout); setDraftLoaded(true); } });
    return () => { active = false; clearTimeout(timeout); };
  }, [key, question.id, revision, userId]);

  useEffect(() => {
    if (!draftLoaded || !userId) return;
    const draft: StoredQuestionDraft = { userId, questionId: question.id, revision, answer, acceptable, weight, visible, explanation };
    const timer = setTimeout(() => {
      void SecureStore.setItemAsync(key, JSON.stringify(draft)).catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [acceptable, answer, draftLoaded, explanation, key, question.id, revision, userId, visible, weight]);

  const busy = save.isPending || remove.isPending || skip.isPending;
  const conflict = isApiError(localError) && localError.status === 409;
  const offline = isNetworkError(localError);
  const hasAnswer = Boolean(answer);
  const showAcceptBeat = hasAnswer;
  const showWeightBeat = hasAnswer && acceptable.length > 0;

  function selectAnswer(optionId: string) {
    userEdited.current = true;
    setAnswer(optionId);
    setAcceptable((items) => items.includes(optionId) ? items : [...items, optionId]);
  }

  function selectAllAcceptable() {
    userEdited.current = true;
    setAcceptable(question.options.map((option) => option.id));
  }

  async function submit() {
    try {
      setLocalError(null);
      const result = await save.mutateAsync({ questionId: question.id, answerId: answer, acceptable, weight, public: visible, explanation, revision });
      await SecureStore.deleteItemAsync(key).catch(() => {});
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await onDone(result.answerCount);
    } catch (error) {
      setLocalError(error);
    }
  }

  async function skipQuestion() {
    try {
      setLocalError(null);
      const result = await skip.mutateAsync({ questionId: question.id });
      await SecureStore.deleteItemAsync(key).catch(() => {});
      await onDone(result.answerCount);
    } catch (error) {
      setLocalError(error);
    }
  }

  async function deleteAnswer() {
    try {
      setLocalError(null);
      const result = await remove.mutateAsync({ questionId: question.id, revision });
      await SecureStore.deleteItemAsync(key).catch(() => {});
      setMoreOpen(false);
      await onDone(result.answerCount);
    } catch (error) {
      setLocalError(error);
    }
  }

  const footer = (
    <StickyFooter
      primaryLabel={save.isPending ? 'Saving…' : 'Save and next'}
      primaryLoading={save.isPending}
      primaryDisabled={busy || !answer || acceptable.length === 0}
      onPrimaryPress={() => { void submit(); }}
      secondaryLabel="More"
      onSecondaryPress={() => setMoreOpen(true)}
    />
  );

  return (
    <Page title="What matters to you" eyebrow={chapterLabel} hideTitle footer={footer} header={(
      <QuestionTopBar
        batchProgress={batchProgressValue}
        batchLabel={`${batchProgressValue} of 5 in this batch`}
        skipDisabled={busy}
        onSkip={() => { void skipQuestion(); }}
      />
    )}>
      <View style={{ gap: SPACING.section }}>
        <Text accessibilityRole="header" style={[TYPOGRAPHY.display, { color: colors.foreground }]}>{question.prompt}</Text>
        {question.sensitive ? <Notice>This optional question is outside the starter sequence. Skip it if you prefer.</Notice> : null}
        {draftRestored && !busy ? <Copy muted>Restored your draft.</Copy> : null}

        <View style={{ gap: SPACING.compact }}>
          {question.options.map((option) => (
            <OptionRow
              key={option.id}
              label={option.label}
              selected={answer === option.id}
              disabled={busy}
              onPress={() => selectAnswer(option.id)}
            />
          ))}
        </View>

        {showAcceptBeat ? (
          <BeatReveal>
            <View style={{ gap: SPACING.compact }}>
              <SectionLabel>Who else works for you?</SectionLabel>
              <Copy muted>We start with your answer. Tap anyone else you would match with.</Copy>
              <Action label="Anyone" tone="ghost" disabled={busy} onPress={selectAllAcceptable} />
              <ChipRow>
                {question.options.map((option) => (
                  <OptionChip
                    key={option.id}
                    label={option.label}
                    selected={acceptable.includes(option.id)}
                    locked={option.id === answer}
                    disabled={busy}
                    onPress={() => {
                      userEdited.current = true;
                      if (option.id === answer) return;
                      setAcceptable((items) => items.includes(option.id) ? items.filter((id) => id !== option.id) : [...items, option.id]);
                    }}
                  />
                ))}
              </ChipRow>
            </View>
          </BeatReveal>
        ) : null}

        {showWeightBeat ? (
          <BeatReveal>
            <View style={{ gap: SPACING.compact }}>
              <SectionLabel>How much does it matter?</SectionLabel>
              <ImportanceSlider value={weight} disabled={busy} onChange={(next) => { userEdited.current = true; setWeight(next); }} />
            </View>
          </BeatReveal>
        ) : null}

        {busy ? <Notice>{save.isPending ? 'Saving your answer…' : remove.isPending ? 'Deleting your answer…' : 'Loading another question…'}</Notice> : null}
        <Feedback error={localError ?? remove.error ?? skip.error} />
        {offline ? <Notice>Your selections are still saved on this phone. Reconnect, then try again.</Notice> : null}
        {conflict ? <Action label="Load the latest saved answer" onPress={() => { void onDone(); }} /> : null}
      </View>

      <MoreSheet
        visible={moreOpen}
        onClose={() => setMoreOpen(false)}
        visibleOnProfile={visible}
        onVisibleChange={(value) => { userEdited.current = true; setVisible(value); }}
        explanation={explanation}
        onExplanationChange={(value) => { userEdited.current = true; setExplanation(value); }}
        busy={busy}
        showPrevious={Boolean(previousQuestionId)}
        onPrevious={() => {
          setMoreOpen(false);
          if (previousQuestionId) onPrevious(previousQuestionId);
        }}
        showDelete={Boolean(question.answer_id)}
        onDelete={() => { void deleteAnswer(); }}
      />
    </Page>
  );
}
