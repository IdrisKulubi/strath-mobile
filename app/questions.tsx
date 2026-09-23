import React, { useEffect, useMemo, useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

import { Action, Copy, Feedback, Field, Loading, Notice, Page, Progress, SectionLabel } from '@/components/questionnaire/ui';
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

  const current = useMemo(() => {
    if (!questionnaire.data) return null;
    return questionnaire.data.questions.find((question) => question.id === selectedId)
      ?? nextQuestion(questionnaire.data.questions, questionnaire.data.state, includeSkipped);
  }, [includeSkipped, questionnaire.data, selectedId]);

  async function refreshAfter(questionId: string, answerCount?: number) {
    setHistory((items) => [...items.filter((id) => id !== questionId), questionId]);
    setSelectedId(null);
    if (answerCount && isBatchMilestone(answerCount)) setPausedAt(answerCount);
    await questionnaire.refetch();
  }

  if (questionnaire.isPending) return <Page title="What matters to you" back><Loading /></Page>;
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

  if (pausedAt) {
    return (
      <Page title={`Batch ${pausedAt / 5} complete`} eyebrow="Questions saved" back>
        <Progress value={pausedAt} total={20} label={`${pausedAt} of 20 answers saved`} />
        <Copy>Your answers are safely stored. Take a break or continue with the next five.</Copy>
        <Action label="Continue to the next batch" tone="primary" onPress={() => setPausedAt(null)} />
        <Action label="Return to profile" onPress={() => router.replace('/dating/profile' as never)} />
      </Page>
    );
  }

  if (state.complete && !selectedId && !reviewing) {
    return (
      <Page title="Your questionnaire is ready" eyebrow="20 answers saved" back>
        <Progress value={20} total={20} label="20 of 20 answers saved" />
        <Notice tone="success">You can keep answering to improve comparisons, or review anything you have shared.</Notice>
        <Action label="Return to Discover" tone="primary" onPress={() => router.replace('/dating' as never)} />
        <Action label="Review your answers" onPress={() => setReviewing(true)} />
        <Action label="Answer another question" onPress={() => setSelectedId(nextQuestion(questions, state, includeSkipped)?.id ?? null)} />
      </Page>
    );
  }

  return (
    <Page title={reviewing ? 'Review your answers' : 'What matters to you'} eyebrow={reviewing ? `${state.answerCount} saved` : `Batch ${batch} of 4`} back>
      {!reviewing ? (
        <>
          <Progress value={progress} total={5} label={`${progress} of 5 saved in this batch · ${state.answerCount} total`} />
          <Copy muted>Private answers still shape your percentage. They are never shown individually unless you publish them.</Copy>
        </>
      ) : null}
      <Action label={reviewing ? 'Continue answering' : 'Review saved answers'} onPress={() => { setReviewing((value) => !value); setSelectedId(null); }} />

      {reviewing ? (
        <View style={{ gap: SPACING.compact }}>
          {questions.filter((question) => question.answer_id).map((question, index) => (
            <Action
              key={question.id}
              label={`${index + 1}. ${question.prompt}${question.public ? ' · Public' : ' · Private'}`}
              onPress={() => { setSelectedId(question.id); setReviewing(false); }}
            />
          ))}
          {state.answerCount === 0 ? <Notice>No answers yet. Complete the first batch to see them here.</Notice> : null}
        </View>
      ) : current ? (
        <QuestionEditor
          key={`${current.id}:${state.revision}`}
          question={current}
          revision={state.revision}
          previousQuestionId={history.at(-1) ?? null}
          onPrevious={(questionId) => { setHistory((items) => items.slice(0, -1)); setSelectedId(questionId); }}
          onDone={(answerCount) => refreshAfter(current.id, answerCount)}
        />
      ) : (
        <>
          <Notice>{includeSkipped ? 'You have answered every available non-sensitive question.' : 'The remaining questions were skipped. You can revisit them whenever you are ready.'}</Notice>
          {!includeSkipped ? <Action label="Revisit skipped questions" onPress={() => setIncludeSkipped(true)} /> : null}
          <Action label="Review saved answers" onPress={() => setReviewing(true)} />
        </>
      )}
    </Page>
  );
}

function QuestionEditor({
  question,
  revision,
  previousQuestionId,
  onPrevious,
  onDone,
}: {
  question: Question;
  revision: number;
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
  const [draftSaved, setDraftSaved] = useState(false);
  const [localError, setLocalError] = useState<unknown>(null);
  const userId = identity.data ?? '';
  const key = `questionnaire-draft:${userId}:${question.id.replace(':', '-')}`;

  useEffect(() => {
    let active = true;
    void SecureStore.getItemAsync(key).then(async (raw) => {
      if (!raw || !active) return;
      try {
        const parsed: unknown = JSON.parse(raw);
        if (isUsableDraft(parsed, { userId, questionId: question.id, revision })) {
          setAnswer(parsed.answer);
          setAcceptable(parsed.acceptable);
          setWeight(parsed.weight);
          setVisible(parsed.visible);
          setExplanation(parsed.explanation);
        } else {
          await SecureStore.deleteItemAsync(key);
        }
      } catch {
        await SecureStore.deleteItemAsync(key);
      }
    }).catch(() => {}).finally(() => { if (active) setDraftLoaded(true); });
    return () => { active = false; };
  }, [key, question.id, revision, userId]);

  useEffect(() => {
    if (!draftLoaded || !userId) return;
    const draft: StoredQuestionDraft = { userId, questionId: question.id, revision, answer, acceptable, weight, visible, explanation };
    const timer = setTimeout(() => {
      void SecureStore.setItemAsync(key, JSON.stringify(draft)).then(() => setDraftSaved(true)).catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [acceptable, answer, draftLoaded, explanation, key, question.id, revision, userId, visible, weight]);

  const busy = save.isPending || remove.isPending || skip.isPending;
  const conflict = isApiError(localError) && localError.status === 409;
  const offline = isNetworkError(localError);

  async function submit() {
    try {
      setLocalError(null);
      const result = await save.mutateAsync({ questionId: question.id, answerId: answer, acceptable, weight, public: visible, explanation, revision });
      await SecureStore.deleteItemAsync(key).catch(() => {});
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
      await onDone(result.answerCount);
    } catch (error) {
      setLocalError(error);
    }
  }

  return (
    <View style={{ gap: SPACING.base }}>
      <Text accessibilityRole="header" style={[TYPOGRAPHY.title, { color: colors.foreground }]}>{question.prompt}</Text>
      {question.sensitive ? <Notice>This optional question is outside the starter sequence. Skip it if you prefer.</Notice> : null}

      <SectionLabel>Your answer</SectionLabel>
      {question.options.map((option) => <Action key={option.id} label={option.label} selected={answer === option.id} disabled={busy || !draftLoaded} onPress={() => setAnswer(option.id)} />)}

      <SectionLabel>Answers you would accept</SectionLabel>
      <Copy muted>Select every answer that would work for you.</Copy>
      {question.options.map((option) => (
        <Action
          key={option.id}
          label={option.label}
          selected={acceptable.includes(option.id)}
          disabled={busy || !draftLoaded}
          onPress={() => setAcceptable((items) => items.includes(option.id) ? items.filter((id) => id !== option.id) : [...items, option.id])}
        />
      ))}

      <SectionLabel>How important is this?</SectionLabel>
      {([[0, 'Not important'], [1, 'A little important'], [10, 'Somewhat important'], [50, 'Very important'], [250, 'Extremely important']] as const).map(([value, label]) => (
        <Action key={value} label={label} selected={weight === value} disabled={busy || !draftLoaded} onPress={() => setWeight(value)} />
      ))}

      <View style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.base }}>
        <View style={{ flex: 1, gap: SPACING.micro }}>
          <Text style={[TYPOGRAPHY.body, { color: colors.foreground, fontWeight: '600' }]}>Show this answer on my profile</Text>
          <Text style={[TYPOGRAPHY.caption, { color: colors.mutedForeground }]}>Only people who also publish their answer can compare it.</Text>
        </View>
        <Switch accessibilityLabel="Show this answer on my profile" value={visible} disabled={busy || !draftLoaded} onValueChange={setVisible} />
      </View>

      <Field label="Optional explanation" value={explanation} onChangeText={setExplanation} multiline placeholder="Add context in your own words" />
      {draftSaved && !busy ? <Copy muted>Draft saved on this phone.</Copy> : null}
      {busy ? <Notice>{save.isPending ? 'Saving your answer…' : remove.isPending ? 'Deleting your answer…' : 'Loading another question…'}</Notice> : null}
      <Feedback error={localError ?? remove.error ?? skip.error} />
      {offline ? <Notice>Your selections are still saved on this phone. Reconnect, then try again.</Notice> : null}
      {conflict ? <Action label="Load the latest saved answer" onPress={() => { void onDone(); }} /> : null}
      <Action label={save.isPending ? 'Saving answer…' : 'Save and continue'} tone="primary" disabled={busy || !draftLoaded || !answer || acceptable.length === 0} onPress={() => { void submit(); }} />
      <Action label="Skip and show another question" disabled={busy} onPress={() => { void skipQuestion(); }} />
      {previousQuestionId ? <Action label="Back to previous question" tone="ghost" disabled={busy} onPress={() => onPrevious(previousQuestionId)} /> : null}
      {question.answer_id ? <Action label="Delete this answer" tone="danger" disabled={busy} onPress={() => { void deleteAnswer(); }} /> : null}
    </View>
  );
}
