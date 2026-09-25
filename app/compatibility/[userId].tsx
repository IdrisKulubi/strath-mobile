import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Action, Copy, Feedback, Field, Loading, Notice, Page, SectionLabel } from '@/components/questionnaire/ui';
import { useTheme } from '@/hooks/use-theme';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { compatibilityLabel, useQuestionnaire, useQuestionnaireMutation, type DecisionResponse, type PublicComparison } from '@/lib/questionnaire';

export default function CompatibilityProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const comparison = useQuestionnaire<PublicComparison>(`comparison/${userId}`, Boolean(userId));
  const block = useQuestionnaireMutation<{ saved: true }>('block');
  const report = useQuestionnaireMutation<{ saved: true }>('report');
  const decision = useQuestionnaireMutation<DecisionResponse>('decisions');
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState('');
  const [matchId, setMatchId] = useState<string | null>(null);

  return (
    <Page title={comparison.data ? `${comparison.data.profile.name}, ${comparison.data.profile.age}` : 'Profile'} back>
      {comparison.isPending ? <Loading label="Loading compatibility" /> : null}
      <Feedback error={comparison.error ?? block.error ?? report.error ?? decision.error} />
      {comparison.isError ? <Action label="Try loading again" tone="primary" onPress={() => { void comparison.refetch(); }} /> : null}
      {comparison.data ? (
        <>
          <Copy muted>{comparison.data.profile.city} · {comparison.data.profile.intentions.join(', ')}</Copy>
          <View style={styles.photos}>
            {comparison.data.profile.photos.map((uri, index) => (
              <Image key={uri} source={{ uri }} accessibilityLabel={`${comparison.data?.profile.name} profile photo ${index + 1}`} style={styles.photo} />
            ))}
          </View>
          <Copy>{comparison.data.profile.bio}</Copy>
          <View style={[styles.scoreCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={[TYPOGRAPHY.title, { color: colors.foreground }]}>{compatibilityLabel(comparison.data.compatibility)}</Text>
            <Copy muted>This percentage reflects question-based compatibility, not the probability of relationship success.</Copy>
          </View>
          {comparison.data.compatibility.status === 'insufficient_evidence' ? (
            <Notice>Answer more questions to build enough shared evidence for a percentage.</Notice>
          ) : null}

          <SectionLabel>Their answers</SectionLabel>
          <Copy muted>Answers this person saved as public appear here. Earlier private answers still affect compatibility but remain hidden.</Copy>
          {comparison.data.questions.length === 0 ? <Notice>This person has no public answers to show yet.</Notice> : null}
          {comparison.data.questions.map((question) => (
            <View key={question.id} style={[styles.answerCard, { borderColor: colors.border }]}>
              <Text style={[TYPOGRAPHY.body, styles.question, { color: colors.foreground }]}>{question.prompt}</Text>
              {question.yours ? <Copy><Text style={styles.answerLabel}>You: </Text>{question.options.find((option) => option.id === question.yours)?.label ?? 'Answer unavailable'}</Copy> : null}
              <Copy><Text style={styles.answerLabel}>{comparison.data?.profile.name}: </Text>{question.options.find((option) => option.id === question.theirs)?.label ?? 'Answer unavailable'}</Copy>
              {question.yourExplanation ? <Copy muted>Your note: {question.yourExplanation}</Copy> : null}
              {question.theirExplanation ? <Copy muted>Their note: {question.theirExplanation}</Copy> : null}
            </View>
          ))}

          {matchId ? (
            <View style={[styles.answerCard, { borderColor: colors.primary }]}>
              <Text accessibilityRole="header" style={[TYPOGRAPHY.title, { color: colors.foreground }]}>It’s a match</Text>
              <Copy>You both liked each other. You can start messaging now.</Copy>
              <Action label="Send a message" tone="primary" onPress={() => router.push({ pathname: '/dating-chat/[matchId]', params: { matchId } } as never)} />
            </View>
          ) : decision.isSuccess ? <Notice>Your choice was saved.</Notice> : null}
          <View style={styles.profileActions}>
            <Action label={decision.isPending ? 'Saving…' : 'Like'} tone="primary" disabled={decision.isPending} onPress={() => {
              decision.mutate({ targetId: userId, decision: 'like' }, { onSuccess: (result) => setMatchId(result.matchId ?? null) });
            }} />
            <Action label="Pass" disabled={decision.isPending} onPress={() => {
              decision.mutate({ targetId: userId, decision: 'pass' }, { onSuccess: () => router.replace('/dating' as never) });
            }} />
          </View>
          <SectionLabel>Safety</SectionLabel>
          {!confirmBlock ? (
            <Action label="Block this person" tone="danger" onPress={() => setConfirmBlock(true)} />
          ) : (
            <View style={[styles.answerCard, { borderColor: colors.destructive }]}>
              <Copy>Blocking removes this profile from discovery immediately. Existing records are retained for safety.</Copy>
              <Action label={block.isPending ? 'Blocking…' : 'Confirm block'} tone="danger" disabled={block.isPending} onPress={() => {
                void block.mutateAsync({ targetId: userId }).then(() => router.replace('/dating' as never));
              }} />
              <Action label="Cancel" tone="ghost" disabled={block.isPending} onPress={() => setConfirmBlock(false)} />
            </View>
          )}
          <Action label={reporting ? 'Cancel report' : 'Report a concern'} onPress={() => setReporting((value) => !value)} />
          {reporting ? (
            <View style={styles.reportForm}>
              <Field label="What happened?" value={reason} onChangeText={setReason} multiline placeholder="Describe the concern for the safety team" />
              <Action label={report.isSuccess ? 'Report submitted' : report.isPending ? 'Submitting…' : 'Submit report'} tone="primary" disabled={report.isPending || report.isSuccess || !reason.trim()} onPress={() => {
                void report.mutateAsync({ targetId: userId, reason: reason.trim() });
              }} />
            </View>
          ) : null}
        </>
      ) : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  photos: { gap: SPACING.compact },
  photo: { width: '100%', aspectRatio: 4 / 5, borderRadius: RADIUS.lg },
  scoreCard: { gap: SPACING.tight, borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.base },
  answerCard: { gap: SPACING.tight, borderWidth: 1, borderRadius: RADIUS.md, padding: SPACING.base },
  question: { fontWeight: '700' },
  answerLabel: { fontWeight: '700' },
  reportForm: { gap: SPACING.compact },
  profileActions: { gap: SPACING.tight },
});
