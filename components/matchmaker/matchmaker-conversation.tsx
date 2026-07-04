import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { BrainCircuit, Search, SendHorizonal } from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import { MatchmakerCandidateCard } from '@/components/matchmaker/matchmaker-candidate-card';
import {
  useFindNextMatchmakerCandidate,
  useMatchmakerConversation,
  useSendMatchmakerMessage,
  useSubmitMatchmakerFeedback,
} from '@/hooks/use-matchmaker';
import { RADIUS, SPACING } from '@/lib/design-tokens';
import { useTheme } from '@/hooks/use-theme';
import type { MatchmakerCandidate, MatchmakerConversationMessage } from '@/types/matchmaker';

function formatRemaining(count: number) {
  if (count <= 0) return 'Searches reset tomorrow';
  if (count === 1) return '1 search left today';
  return `${count} searches left today`;
}

function MessageBubble({ message }: { message: MatchmakerConversationMessage }) {
  const { colors, isDark } = useTheme();
  const isUser = message.role === 'user';

  return (
    <View style={[styles.messageRow, isUser && styles.userMessageRow]}>
      {!isUser ? (
        <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
          <BrainCircuit size={17} color={colors.primary} />
        </View>
      ) : null}
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.assistantBubble,
          {
            backgroundColor: isUser
              ? colors.primary
              : isDark
                ? colors.card
                : colors.card,
            borderColor: isUser ? colors.primary : colors.border,
          },
        ]}
      >
        <Text
          style={[
            styles.bubbleText,
            { color: isUser ? colors.primaryForeground : colors.foreground },
          ]}
        >
          {message.text}
        </Text>
      </View>
    </View>
  );
}

function getCandidateFromMessage(message: MatchmakerConversationMessage): MatchmakerCandidate | null {
  const candidate = message.metadata?.candidate;
  if (!candidate || typeof candidate !== 'object') return null;
  const candidateRecord = candidate as Partial<MatchmakerCandidate>;
  if (typeof candidateRecord.candidateUserId !== 'string') return null;

  return {
    candidateUserId: candidateRecord.candidateUserId,
    firstName: candidateRecord.firstName ?? null,
    age: candidateRecord.age ?? null,
    university: candidateRecord.university ?? null,
    course: candidateRecord.course ?? null,
    reason: candidateRecord.reason ?? message.text,
    labels: Array.isArray(candidateRecord.labels) ? candidateRecord.labels : [],
  };
}

export function MatchmakerConversation() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const conversation = useMatchmakerConversation();
  const sendMessage = useSendMatchmakerMessage();
  const findCandidate = useFindNextMatchmakerCandidate();
  const submitFeedback = useSubmitMatchmakerFeedback();
  const [draft, setDraft] = useState('');

  const data = conversation.data;
  const messages = data?.messages ?? [];
  const quickReplies = useMemo(
    () => data?.quickReplies?.filter(Boolean).slice(0, 7) ?? [],
    [data?.quickReplies],
  );
  const remainingSearches = data?.session.remainingSearches ?? 0;
  const canSearch = data?.session.state === 'ready_to_search' || data?.session.state === 'presenting_candidate';
  const feedbackReasons = useMemo(() => new Set([
    'Not my vibe',
    'Too social',
    'Too quiet',
    'Not serious enough',
    'Not active enough',
    'Different lifestyle',
  ]), []);
  const isBusy = conversation.isLoading || sendMessage.isPending || findCandidate.isPending || submitFeedback.isPending;

  const submit = useCallback(async (text: string) => {
    const cleaned = text.trim();
    if (!cleaned || sendMessage.isPending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDraft('');
    await sendMessage.mutateAsync(cleaned);
  }, [sendMessage]);

  const findNext = useCallback(async () => {
    if (findCandidate.isPending || remainingSearches <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await findCandidate.mutateAsync();
  }, [findCandidate, remainingSearches]);

  const openCandidate = useCallback((candidate: MatchmakerCandidate) => {
    router.push({
      pathname: '/profile/[userId]',
      params: {
        userId: candidate.candidateUserId,
        source: 'matchmaker',
        matchType: 'discovery',
      },
    });
  }, [router]);

  const handleQuickReply = useCallback((reply: string) => {
    if (reply.toLowerCase() === 'not this one') {
      submitFeedback.mutateAsync({ outcome: 'not_this_one' }).catch(() => undefined);
      return;
    }
    if (feedbackReasons.has(reply)) {
      submitFeedback.mutateAsync({ outcome: 'not_this_one', reason: reply }).catch(() => undefined);
      return;
    }
    if (reply.toLowerCase() === 'skip feedback') {
      findNext().catch(() => undefined);
      return;
    }
    if (reply.toLowerCase() === 'find another') {
      findNext().catch(() => undefined);
      return;
    }
    submit(reply).catch(() => undefined);
  }, [feedbackReasons, findNext, submit, submitFeedback]);

  if (conversation.isLoading) {
    return (
      <View style={[styles.stateCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <ActivityIndicator color={colors.primary} />
        <Text style={[styles.stateText, { color: colors.mutedForeground }]}>
          Opening your matchmaker
        </Text>
      </View>
    );
  }

  if (conversation.isError) {
    return (
      <View style={[styles.stateCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Text style={[styles.stateTitle, { color: colors.foreground }]}>
          Matchmaker is not available
        </Text>
        <Text style={[styles.stateText, { color: colors.mutedForeground }]}>
          {conversation.error instanceof Error ? conversation.error.message : 'Try again in a moment.'}
        </Text>
        <Pressable
          onPress={() => conversation.refetch()}
          style={[styles.retryButton, { borderColor: colors.border }]}
        >
          <Text style={[styles.retryText, { color: colors.foreground }]}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <View>
          <Text style={[styles.kicker, { color: colors.primary }]}>AI Matchmaker</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Let us find the right person today.
          </Text>
        </View>
        <View style={[styles.quotaPill, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.quotaText, { color: colors.mutedForeground }]}>
            {formatRemaining(remainingSearches)}
          </Text>
        </View>
      </View>

      <View style={styles.timeline}>
        {messages.map((message) => {
          const candidate = message.kind === 'candidate' ? getCandidateFromMessage(message) : null;
          if (candidate) {
            return (
              <View key={message.id} style={styles.candidateMessage}>
                <MessageBubble message={{ ...message, text: message.text }} />
                <MatchmakerCandidateCard
                  candidate={candidate}
                  index={Number(message.metadata?.position ?? 1) - 1}
                  onPress={openCandidate}
                />
              </View>
            );
          }
          return <MessageBubble key={message.id} message={message} />;
        })}
      </View>

      {canSearch ? (
        <Pressable
          disabled={isBusy || remainingSearches <= 0}
          onPress={() => findNext().catch(() => undefined)}
          style={[
            styles.searchButton,
            { backgroundColor: colors.primary },
            (isBusy || remainingSearches <= 0) && styles.disabled,
          ]}
        >
          {findCandidate.isPending ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Search size={17} color={colors.primaryForeground} />
          )}
          <Text style={[styles.searchButtonText, { color: colors.primaryForeground }]}>
            {data?.session.state === 'presenting_candidate' ? 'Find another' : 'Find my person'}
          </Text>
        </Pressable>
      ) : null}

      {quickReplies.length > 0 ? (
        <View style={styles.quickReplies}>
          {quickReplies.map((reply) => (
            <Pressable
              key={reply}
              disabled={isBusy}
              onPress={() => handleQuickReply(reply)}
              style={[
                styles.quickReply,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.quickReplyText, { color: colors.foreground }]} numberOfLines={2}>
                {reply}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View
        style={[
          styles.composer,
          {
            backgroundColor: isDark ? colors.card : colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Tell the matchmaker what you want"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { color: colors.foreground }]}
          multiline
          textAlignVertical="center"
          editable={!sendMessage.isPending}
        />
        <Pressable
          disabled={!draft.trim() || sendMessage.isPending}
          onPress={() => submit(draft).catch(() => undefined)}
          style={[
            styles.sendButton,
            { backgroundColor: colors.primary },
            (!draft.trim() || sendMessage.isPending) && styles.disabled,
          ]}
        >
          {sendMessage.isPending ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <SendHorizonal size={18} color={colors.primaryForeground} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: SPACING.base,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.compact,
  },
  kicker: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
  },
  title: {
    marginTop: 3,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    maxWidth: 260,
  },
  quotaPill: {
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  quotaText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  timeline: {
    gap: SPACING.compact,
  },
  candidateMessage: {
    gap: SPACING.tight,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.tight,
  },
  userMessageRow: {
    justifyContent: 'flex-end',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    maxWidth: '86%',
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  assistantBubble: {
    borderTopLeftRadius: 8,
  },
  userBubble: {
    borderTopRightRadius: 8,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '500',
  },
  quickReplies: {
    gap: SPACING.tight,
  },
  searchButton: {
    minHeight: 50,
    borderRadius: RADIUS.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.tight,
    paddingHorizontal: 16,
  },
  searchButtonText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },
  quickReply: {
    minHeight: 46,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  quickReplyText: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
  },
  composer: {
    minHeight: 58,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.tight,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    minHeight: 38,
    maxHeight: 96,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500',
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.45,
  },
  stateCard: {
    minHeight: 180,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.tight,
    padding: SPACING.base,
  },
  stateTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  stateText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 44,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
