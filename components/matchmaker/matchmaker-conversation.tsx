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
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import {
  ArrowUp,
  Heart,
  HeartHandshake,
  Leaf,
  Mic,
  Rocket,
  Search,
  Sparkles,
  Zap,
} from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import { MatchmakerCandidateCard } from '@/components/matchmaker/matchmaker-candidate-card';
import {
  isMatchmakerFeedbackReply,
  MatchmakerFeedbackPanel,
} from '@/components/matchmaker/matchmaker-feedback-panel';
import { MatchmakerStatePanel } from '@/components/matchmaker/matchmaker-state-panel';
import {
  useFindNextMatchmakerCandidate,
  useMatchmakerConversation,
  useSendMatchmakerMessage,
  useSubmitMatchmakerFeedback,
} from '@/hooks/use-matchmaker';
import { RADIUS, SPACING } from '@/lib/design-tokens';
import { useTheme } from '@/hooks/use-theme';
import type { MatchmakerCandidate, MatchmakerConversationMessage } from '@/types/matchmaker';

function MessageBubble({ message }: { message: MatchmakerConversationMessage }) {
  const { colors, isDark } = useTheme();
  const isUser = message.role === 'user';

  return (
    <Animated.View
      entering={FadeInDown.duration(180)}
      style={[styles.messageRow, isUser && styles.userMessageRow]}
    >
      {!isUser ? (
        <View style={[styles.avatar, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
          <HeartHandshake size={17} color={colors.primaryForeground} />
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
    </Animated.View>
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
    profilePhoto: typeof candidateRecord.profilePhoto === 'string' ? candidateRecord.profilePhoto : null,
    photos: Array.isArray(candidateRecord.photos) ? candidateRecord.photos.filter((photo): photo is string => typeof photo === 'string') : [],
    reason: candidateRecord.reason ?? message.text,
    labels: Array.isArray(candidateRecord.labels) ? candidateRecord.labels : [],
  };
}

function isNoResultMessage(message: MatchmakerConversationMessage | null) {
  if (!message) return false;
  return message.kind === 'text'
    && typeof message.metadata?.searchedCachedCandidates === 'number'
    && typeof message.metadata?.excludedAlreadyShown === 'number';
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
  const latestAssistantMessage = useMemo(
    () => [...messages].reverse().find((message) => message.role === 'assistant') ?? null,
    [messages],
  );
  const showFeedbackPanel = latestAssistantMessage?.kind === 'feedback' && quickReplies.length > 0;
  const showLimitPanel = latestAssistantMessage?.kind === 'limit';
  const showNoResultPanel = isNoResultMessage(latestAssistantMessage);
  const showStatePanel = showLimitPanel || showNoResultPanel;
  const showGenericReplies = quickReplies.length > 0 && !showFeedbackPanel && !showStatePanel;
  const remainingSearches = data?.session.remainingSearches ?? 0;
  const canSearch = data?.session.state === 'ready_to_search' || data?.session.state === 'presenting_candidate';
  const isBusy = conversation.isLoading || sendMessage.isPending || findCandidate.isPending || submitFeedback.isPending;
  const composerSuggestions = ['Calm vibes', 'Emotionally mature', 'Active today'];

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
    const normalized = reply.toLowerCase();
    if (
      normalized === 'go ahead and search'
      || normalized === 'find my person'
      || normalized === 'search now'
    ) {
      findNext().catch(() => undefined);
      return;
    }
    if (reply.toLowerCase() === 'not this one') {
      submitFeedback.mutateAsync({ outcome: 'not_this_one' }).catch(() => undefined);
      return;
    }
    if (isMatchmakerFeedbackReply(reply) && reply !== 'Skip feedback') {
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
  }, [findNext, submit, submitFeedback]);

  if (conversation.isLoading && messages.length === 0) {
    return (
      <MatchmakerStatePanel variant="loading" />
    );
  }

  if (conversation.isError && messages.length === 0) {
    return (
      <MatchmakerStatePanel
        variant="error"
        body={conversation.error instanceof Error ? conversation.error.message : undefined}
        busy={conversation.isFetching}
        onRetry={() => conversation.refetch()}
      />
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.timeline}>
        {messages.map((message) => {
          const candidate = message.kind === 'candidate' ? getCandidateFromMessage(message) : null;
          if (candidate) {
            return (
              <View key={message.id} style={styles.candidateMessage}>
                <MessageBubble message={{ ...message, text: message.text }} />
                <MatchmakerCandidateCard
                  candidate={candidate}
                  onPress={openCandidate}
                />
              </View>
            );
          }
          return <MessageBubble key={message.id} message={message} />;
        })}
      </View>

      {conversation.isError ? (
        <MatchmakerStatePanel
          variant="inline_error"
          body={conversation.error instanceof Error ? conversation.error.message : undefined}
          busy={conversation.isFetching}
          onRetry={() => conversation.refetch()}
        />
      ) : null}

      {canSearch ? (
        <View style={styles.searchAction}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={data?.session.state === 'presenting_candidate' ? 'Find another matchmaker suggestion' : 'Find my person'}
            accessibilityHint={data?.session.state === 'presenting_candidate' ? "Uses one of today's searches." : 'Asks the matchmaker to search for a compatible person.'}
            disabled={isBusy || remainingSearches <= 0}
            onPress={() => findNext().catch(() => undefined)}
            style={({ pressed }) => [
                styles.searchButton,
                { backgroundColor: colors.primary },
                pressed && !isBusy && remainingSearches > 0 && styles.pressedPrimary,
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
          {data?.session.state === 'presenting_candidate' ? (
            <Text style={[styles.searchHint, { color: colors.mutedForeground }]}>
              Uses one of today's searches.
            </Text>
          ) : null}
        </View>
      ) : null}

      {showFeedbackPanel && latestAssistantMessage ? (
        <MatchmakerFeedbackPanel
          message={latestAssistantMessage}
          replies={quickReplies}
          busy={isBusy}
          onSelect={handleQuickReply}
        />
      ) : null}

      {showStatePanel && latestAssistantMessage ? (
        <MatchmakerStatePanel
          variant={showLimitPanel ? 'limit' : 'no_result'}
          replies={quickReplies}
          busy={isBusy}
          onReply={handleQuickReply}
        />
      ) : null}

      {showGenericReplies ? (
        <Animated.View
          entering={FadeIn.duration(180)}
          style={styles.quickReplies}
        >
          {quickReplies.map((reply, index) => {
            const normalized = reply.toLowerCase();
            const displayReply = normalized === 'go ahead and search' ? 'Find my person' : reply;
            const Icon = index === 0 ? Rocket : normalized.includes('serious') ? Heart : Sparkles;
            return (
            <Pressable
              key={reply}
              accessibilityRole="button"
              accessibilityLabel={displayReply}
              disabled={isBusy}
              onPress={() => handleQuickReply(reply)}
              style={({ pressed }) => [
                  styles.quickReply,
                  index === 0 && styles.primaryQuickReply,
                  {
                    backgroundColor: index === 0 ? colors.primary : 'rgba(184,50,122,0.08)',
                    borderColor: index === 0 ? colors.primary : 'rgba(184,50,122,0.10)',
                  },
                  pressed && !isBusy && styles.pressedSecondary,
                  isBusy && styles.disabled,
                ]}
            >
              <Icon size={16} color={index === 0 ? colors.primaryForeground : colors.foreground} />
              <Text
                style={[
                  styles.quickReplyText,
                  { color: index === 0 ? colors.primaryForeground : colors.foreground },
                ]}
              >
                {displayReply}
              </Text>
            </Pressable>
          );})}
        </Animated.View>
      ) : null}

      <View
        style={[
          styles.composerDock,
          {
            backgroundColor: 'rgba(253,228,238,0.60)',
            borderColor: 'rgba(184,50,122,0.14)',
          },
        ]}
      >
        <View style={styles.composerRow}>
        <View style={[styles.micButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Mic size={22} color={colors.primary} />
        </View>
          <View style={[styles.inputShell, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              accessibilityLabel="Tell the matchmaker what you want"
              value={draft}
              onChangeText={setDraft}
              placeholder="Tell me more about what feels right..."
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.foreground }]}
              multiline
              textAlignVertical="center"
              editable={!sendMessage.isPending}
              returnKeyType="send"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send message to matchmaker"
              disabled={!draft.trim() || sendMessage.isPending}
              onPress={() => submit(draft).catch(() => undefined)}
              style={({ pressed }) => [
                  styles.sendButton,
                  { backgroundColor: colors.primary },
                  pressed && draft.trim() && !sendMessage.isPending && styles.pressedPrimary,
                  (!draft.trim() || sendMessage.isPending) && styles.disabled,
                ]}
            >
              {sendMessage.isPending ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <ArrowUp size={20} color={colors.primaryForeground} />
              )}
            </Pressable>
          </View>
        </View>
        <View style={styles.composerSuggestions}>
          {composerSuggestions.map((suggestion) => {
            const Icon = suggestion === 'Calm vibes' ? Leaf : suggestion === 'Active today' ? Zap : Heart;
            const color = suggestion === 'Active today' ? colors.success : suggestion === 'Calm vibes' ? colors.success : colors.primary;
            return (
              <Pressable
                key={suggestion}
                accessibilityRole="button"
                accessibilityLabel={suggestion}
                disabled={isBusy}
                onPress={() => submit(suggestion).catch(() => undefined)}
                style={({ pressed }) => [
                  styles.suggestionChip,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  pressed && !isBusy && styles.pressedSecondary,
                  isBusy && styles.disabled,
                ]}
              >
                <Icon size={15} color={color} />
                <Text style={[styles.suggestionText, { color }]}>{suggestion}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: SPACING.base,
  },
  timeline: {
    gap: SPACING.base,
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
    borderWidth: 1,
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
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  searchAction: {
    gap: SPACING.tight,
  },
  searchButtonText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },
  searchHint: {
    marginTop: -SPACING.tight,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  quickReply: {
    minHeight: 46,
    maxWidth: '100%',
    borderRadius: RADIUS.full,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.tight,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  primaryQuickReply: {
    paddingHorizontal: 16,
  },
  quickReplyText: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
  },
  composerDock: {
    borderRadius: 28,
    borderWidth: 1,
    padding: SPACING.compact,
    gap: SPACING.compact,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.tight,
  },
  micButton: {
    width: 54,
    height: 54,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputShell: {
    flex: 1,
    minHeight: 54,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 7,
    gap: SPACING.tight,
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
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerSuggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.tight,
  },
  suggestionChip: {
    minHeight: 34,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.micro,
    paddingHorizontal: SPACING.compact,
  },
  suggestionText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.45,
  },
  pressedPrimary: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  pressedSecondary: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
});
