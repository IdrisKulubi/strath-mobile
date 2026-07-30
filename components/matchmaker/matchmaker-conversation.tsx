import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useMinimizeOnScroll } from 'expo-glass-tabs';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import {
  ArrowUp,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Heart,
  MessageCircle,
  Search,
  SlidersHorizontal,
  Zap,
} from 'lucide-react-native';

import type { UseQueryResult } from '@tanstack/react-query';

import { MatchmakerCandidateCard } from '@/components/matchmaker/matchmaker-candidate-card';
// Force Metro to rebundle candidate card CTA styles.
import { MatchmakerFeedbackPanel } from '@/components/matchmaker/matchmaker-feedback-panel';
import { MatchmakerLimitEmptyState } from '@/components/matchmaker/matchmaker-limit-empty-state';
import { MatchmakerStatePanel } from '@/components/matchmaker/matchmaker-state-panel';
import { useToast } from '@/components/ui/toast';
import { MatchmakerVoiceBubble } from '@/components/matchmaker/matchmaker-voice-bubble';
import { Text } from '@/components/ui/text';
import {
  useFindNextMatchmakerCandidate,
  useSendMatchmakerMessage,
  useSubmitMatchmakerFeedback,
} from '@/hooks/use-matchmaker';
import {
  isMatchmakerSearchConfirmation,
  normalizeQuickReplyLabel,
  partitionConversationMessages,
  resolveQuickReplyAction,
  selectActiveTurn,
  shouldShowMatchmakerComposer,
  type ActiveTurn,
} from '@/lib/matchmaker/conversation-ui';
import { MATCHMAKER_HOME, RADIUS, SPACING } from '@/lib/design-tokens';
import type {
  MatchmakerConversationMessage,
  MatchmakerConversationResponse,
} from '@/types/matchmaker';

interface MatchmakerConversationProps {
  conversation: UseQueryResult<MatchmakerConversationResponse, Error>;
}

function HistoryBubble({ message }: { message: MatchmakerConversationMessage }) {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.historyRow, isUser && styles.historyRowUser]}>
      <Text
        style={[
          styles.historyText,
          isUser ? styles.historyTextUser : styles.historyTextAssistant,
        ]}
        numberOfLines={isUser ? 2 : 3}
      >
        {isUser ? `You: ${message.text}` : message.text}
      </Text>
    </View>
  );
}

function ActivePrompt({ turn }: { turn: ActiveTurn }) {
  return (
    <Animated.View entering={FadeInDown.duration(200)} style={styles.promptBlock}>
      <Text style={styles.promptEyebrow}>Today&apos;s direction</Text>
      <Text style={styles.promptText}>{turn.promptText}</Text>
    </Animated.View>
  );
}

function QuickReplyIcon({ label }: { label: string }) {
  const normalized = label.toLowerCase();
  if (normalized.includes('active')) return <Zap size={20} color={MATCHMAKER_HOME.orbLavender} />;
  if (normalized.includes('serious') || normalized.includes('calm')) {
    return <Heart size={20} color={MATCHMAKER_HOME.orbLavender} />;
  }
  return <SlidersHorizontal size={20} color={MATCHMAKER_HOME.orbLavender} />;
}

export function MatchmakerConversation({ conversation }: MatchmakerConversationProps) {
  const router = useRouter();
  const toast = useToast();
  const onScroll = useMinimizeOnScroll();
  const sendMessage = useSendMatchmakerMessage();
  const findCandidate = useFindNextMatchmakerCandidate();
  const submitFeedback = useSubmitMatchmakerFeedback();
  const [draft, setDraft] = useState('');
  const [historyExpanded, setHistoryExpanded] = useState(false);

  const data = conversation.data;
  const messages = useMemo(() => data?.messages ?? [], [data?.messages]);
  const turn = useMemo(() => selectActiveTurn(data), [data]);
  const { history, active } = useMemo(() => partitionConversationMessages(messages), [messages]);
  const isBusy = conversation.isLoading
    || conversation.isFetching
    || sendMessage.isPending
    || findCandidate.isPending
    || submitFeedback.isPending;
  const sendErrorMessage = sendMessage.isError
    ? sendMessage.error instanceof Error
      ? sendMessage.error.message
      : 'Matchmaker is temporarily unavailable. Try again.'
    : undefined;
  const retryDraft = draft.trim() || (typeof sendMessage.variables === 'string' ? sendMessage.variables : '');
  const remainingSearches = data?.session.remainingSearches ?? 0;
  const showComposer = shouldShowMatchmakerComposer(turn.variant, remainingSearches);
  const composerPlaceholder = turn.variant === 'candidate'
    ? 'Tell me what to adjust'
    : turn.variant === 'limit'
      ? 'Tell me what to refine for tomorrow'
      : 'Say it your way';

  const findNext = useCallback(async () => {
    if (findCandidate.isPending) return;
    if ((data?.session.remainingSearches ?? 0) <= 0) {
      toast.show({
        message: 'No searches left today — refine what you want for tomorrow.',
        variant: 'warning',
        position: 'bottom',
      });
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await findCandidate.mutateAsync();
  }, [data?.session.remainingSearches, findCandidate, toast]);

  const submit = useCallback(async (text: string) => {
    const cleaned = text.trim();
    if (!cleaned || sendMessage.isPending) return;
    if (
      data?.session.state === 'ready_to_search'
      && isMatchmakerSearchConfirmation(cleaned)
    ) {
      await findNext();
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const pendingText = cleaned;
    setDraft('');
    try {
      await sendMessage.mutateAsync(pendingText);
    } catch {
      setDraft(pendingText);
    }
  }, [data?.session.state, findNext, sendMessage]);

  const openCandidate = useCallback((candidateUserId: string) => {
    router.push({
      pathname: '/profile/[userId]',
      params: {
        userId: candidateUserId,
        source: 'matchmaker',
        matchType: 'discovery',
      },
    });
  }, [router]);

  const handleQuickReply = useCallback((reply: string) => {
    const action = resolveQuickReplyAction(reply);
    if (action === 'search' || action === 'find_another') {
      findNext().catch(() => undefined);
      return;
    }
    if (action === 'not_this_one') {
      submitFeedback.mutateAsync({ outcome: 'not_this_one' }).catch(() => undefined);
      return;
    }
    if (action === 'feedback_reason') {
      submitFeedback.mutateAsync({ outcome: 'not_this_one', reason: reply }).catch(() => undefined);
      return;
    }
    if (action === 'skip_feedback') {
      findNext().catch(() => undefined);
      return;
    }
    if (action === 'wait_for_response') {
      submit("I'll wait for their response").catch(() => undefined);
      return;
    }
    if (action === 'open_messages') {
      router.push('/(tabs)/chats');
      return;
    }
    submit(reply).catch(() => undefined);
  }, [findNext, router, submit, submitFeedback]);

  if (conversation.isLoading && messages.length === 0) {
    return <MatchmakerStatePanel variant="loading" />;
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
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {history.length > 0 ? (
          <View style={styles.historySection}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={historyExpanded ? 'Hide earlier conversation' : 'Show earlier conversation'}
              onPress={() => setHistoryExpanded((value) => !value)}
              style={({ pressed }) => [styles.historyToggle, pressed && styles.pressedNeutral]}
            >
              <View style={styles.historyToggleContent}>
                <Text style={styles.historyToggleText}>
                  {historyExpanded ? 'Hide earlier' : `Earlier conversation (${history.length})`}
                </Text>
                {historyExpanded ? (
                  <ChevronUp size={18} color={MATCHMAKER_HOME.mutedForeground} />
                ) : (
                  <ChevronDown size={18} color={MATCHMAKER_HOME.mutedForeground} />
                )}
              </View>
            </Pressable>
            {historyExpanded ? (
              <Animated.View entering={FadeIn.duration(180)} style={styles.historyList}>
                {history.map((message) => (
                  <HistoryBubble key={message.id} message={message} />
                ))}
              </Animated.View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.activeSection}>
          {active.map((message) => (
            message.role === 'user' ? <HistoryBubble key={message.id} message={message} /> : null
          ))}

          {turn.variant === 'candidate' && turn.candidate ? (
            <View style={styles.candidateSection}>
              <MatchmakerVoiceBubble
                text={turn.promptText}
                compact
              />
              <MatchmakerCandidateCard
                candidate={turn.candidate}
                onPress={(candidate) => openCandidate(candidate.candidateUserId)}
                onNotThisOne={() => handleQuickReply('Not this one')}
              />
              {remainingSearches <= 0 ? (
                <Text style={styles.limitNote}>
                  No searches left today. You can still open the profile and decide.
                </Text>
              ) : null}
            </View>
          ) : turn.variant === 'feedback' ? (
            <MatchmakerFeedbackPanel
              message={turn.promptMessage!}
              replies={turn.quickReplies}
              outcome={turn.promptMessage?.metadata?.outcome}
              busy={isBusy}
              onSelect={handleQuickReply}
            />
          ) : turn.variant === 'limit' ? (
            <MatchmakerLimitEmptyState
              voiceText={turn.promptText}
              replies={turn.quickReplies}
              busy={isBusy}
              onReply={handleQuickReply}
            />
          ) : turn.variant === 'no_result' ? (
            <MatchmakerStatePanel
              variant="no_result"
              body={turn.promptText}
              replies={turn.quickReplies}
              busy={isBusy}
              onReply={handleQuickReply}
            />
          ) : (
            <ActivePrompt turn={turn} />
          )}
        </View>

        {conversation.isError ? (
          <MatchmakerStatePanel
            variant="inline_error"
            body={conversation.error instanceof Error ? conversation.error.message : undefined}
            busy={conversation.isFetching}
            onRetry={() => conversation.refetch()}
          />
        ) : null}

        {sendErrorMessage ? (
          <MatchmakerStatePanel
            variant="inline_error"
            title="Matchmaker is thinking"
            body={sendErrorMessage}
            busy={sendMessage.isPending}
            onRetry={retryDraft
              ? () => submit(retryDraft).catch(() => undefined)
              : undefined}
          />
        ) : null}

        {turn.variant === 'prompt' && turn.quickReplies.length > 0 ? (
          <Animated.View entering={FadeIn.duration(180)} style={styles.replies}>
            {turn.quickReplies.map((reply) => {
              const label = normalizeQuickReplyLabel(reply);
              return (
                <Pressable
                  key={reply}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  disabled={isBusy}
                  onPress={() => handleQuickReply(reply)}
                  style={({ pressed }) => [
                    styles.reply,
                    pressed && !isBusy && styles.pressedNeutral,
                    isBusy && styles.disabled,
                  ]}
                >
                  <View style={styles.replyContent}>
                    <View style={styles.replyIcon}>
                      <QuickReplyIcon label={label} />
                    </View>
                    <Text style={styles.replyText} numberOfLines={2}>
                      {label}
                    </Text>
                    <View style={styles.replyChevron}>
                      <ChevronRight size={18} color={MATCHMAKER_HOME.primary} />
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </Animated.View>
        ) : null}

        {turn.showSearchAction ? (
          <View style={styles.searchAction}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={turn.searchActionLabel}
              accessibilityHint="Uses one of today's searches."
              disabled={isBusy}
              onPress={() => findNext().catch(() => undefined)}
              style={({ pressed }) => [
                styles.searchButton,
                pressed && !isBusy && styles.pressedPrimary,
                isBusy && styles.disabled,
              ]}
            >
              <View style={styles.actionButtonContent}>
                {findCandidate.isPending ? (
                  <ActivityIndicator size="small" color={MATCHMAKER_HOME.primaryForeground} />
                ) : (
                  <Search size={18} color={MATCHMAKER_HOME.primaryForeground} />
                )}
                <Text style={styles.searchButtonText}>{turn.searchActionLabel}</Text>
              </View>
            </Pressable>
            <Text style={styles.searchHint}>Uses one of today&apos;s searches.</Text>
          </View>
        ) : null}

        {turn.showMessagesAction ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open Messages"
            onPress={() => router.push('/(tabs)/chats')}
            style={({ pressed }) => [styles.messagesButton, pressed && styles.pressedNeutral]}
          >
            <View style={styles.actionButtonContent}>
              <MessageCircle size={18} color={MATCHMAKER_HOME.primary} />
              <Text style={styles.messagesButtonText}>Open Messages</Text>
            </View>
          </Pressable>
        ) : null}
      </Animated.ScrollView>

      {showComposer ? (
        <View style={styles.composerDock}>
          {turn.variant !== 'candidate' && turn.variant !== 'limit' ? (
            <Text style={styles.composerLabel}>Your preference</Text>
          ) : null}
          <View style={[styles.composer, isBusy && styles.composerBusy]}>
            <TextInput
              accessibilityLabel="Tell the matchmaker what you want"
              accessibilityState={{ disabled: isBusy }}
              value={draft}
              onChangeText={setDraft}
              placeholder={composerPlaceholder}
              placeholderTextColor={MATCHMAKER_HOME.mutedForeground}
              style={styles.input}
              multiline
              textAlignVertical="center"
              editable={!isBusy}
              maxLength={500}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send preference to matchmaker"
              accessibilityState={{ disabled: !draft.trim() || isBusy, busy: sendMessage.isPending }}
              disabled={!draft.trim() || isBusy}
              onPress={() => submit(draft).catch(() => undefined)}
              style={({ pressed }) => [
                styles.sendButton,
                pressed && draft.trim() && !isBusy && styles.pressedPrimary,
                (!draft.trim() || isBusy) && styles.disabled,
              ]}
            >
              {sendMessage.isPending ? (
                <ActivityIndicator size="small" color={MATCHMAKER_HOME.primaryForeground} />
              ) : (
                <ArrowUp size={19} color={MATCHMAKER_HOME.primaryForeground} />
              )}
            </Pressable>
          </View>
          {isBusy ? (
            <Text accessibilityLiveRegion="polite" style={styles.composerStatus}>
              {findCandidate.isPending ? 'Searching for a thoughtful match…' : 'Matchmaker is thinking…'}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minHeight: 0,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    gap: SPACING.comfortable,
    paddingTop: SPACING.tight,
    paddingBottom: SPACING.section,
  },
  historySection: {
    gap: SPACING.tight,
  },
  historyToggle: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: MATCHMAKER_HOME.border,
    backgroundColor: MATCHMAKER_HOME.backgroundRaised,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.compact,
  },
  historyToggleContent: {
    width: '100%',
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.tight,
  },
  historyToggleText: {
    color: MATCHMAKER_HOME.mutedForeground,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  historyList: {
    gap: SPACING.tight,
    paddingHorizontal: SPACING.tight,
  },
  historyRow: {
    paddingVertical: 2,
  },
  historyRowUser: {
    alignItems: 'flex-end',
  },
  historyText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  historyTextUser: {
    color: MATCHMAKER_HOME.mutedForeground,
  },
  historyTextAssistant: {
    color: MATCHMAKER_HOME.foreground,
  },
  activeSection: {
    gap: SPACING.base,
  },
  candidateSection: {
    gap: SPACING.compact,
  },
  limitNote: {
    color: MATCHMAKER_HOME.subtleForeground,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: SPACING.tight,
  },
  promptBlock: {
    gap: SPACING.compact,
    paddingTop: SPACING.comfortable,
    paddingBottom: SPACING.tight,
  },
  promptEyebrow: {
    color: MATCHMAKER_HOME.primary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  promptText: {
    color: MATCHMAKER_HOME.foreground,
    maxWidth: 340,
    fontSize: 28,
    lineHeight: 35,
    fontWeight: '600',
    letterSpacing: -0.45,
  },
  replies: {
    width: '100%',
    gap: 10,
  },
  reply: {
    width: '100%',
    minHeight: 66,
    borderWidth: 1,
    borderColor: MATCHMAKER_HOME.borderStrong,
    backgroundColor: MATCHMAKER_HOME.surface,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  replyContent: {
    width: '100%',
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  replyIcon: {
    width: 40,
    height: 40,
    flexShrink: 0,
    borderRadius: RADIUS.md,
    backgroundColor: MATCHMAKER_HOME.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replyText: {
    flex: 1,
    flexShrink: 1,
    color: MATCHMAKER_HOME.foreground,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
  },
  replyChevron: {
    width: 32,
    height: 40,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchAction: {
    gap: SPACING.tight,
  },
  searchButton: {
    minHeight: 52,
    backgroundColor: MATCHMAKER_HOME.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.compact,
  },
  actionButtonContent: {
    width: '100%',
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.tight,
  },
  searchButtonText: {
    color: MATCHMAKER_HOME.primaryForeground,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },
  searchHint: {
    color: MATCHMAKER_HOME.subtleForeground,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  messagesButton: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: MATCHMAKER_HOME.border,
    backgroundColor: MATCHMAKER_HOME.backgroundRaised,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.compact,
  },
  messagesButtonText: {
    color: MATCHMAKER_HOME.foreground,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  composerDock: {
    paddingTop: SPACING.compact,
    paddingBottom: SPACING.tight,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: MATCHMAKER_HOME.border,
    backgroundColor: MATCHMAKER_HOME.background,
    gap: SPACING.tight,
  },
  composerLabel: {
    color: MATCHMAKER_HOME.mutedForeground,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  composer: {
    minHeight: 58,
    borderWidth: 1,
    borderColor: MATCHMAKER_HOME.borderStrong,
    backgroundColor: MATCHMAKER_HOME.surface,
    borderRadius: RADIUS.lg,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.tight,
    paddingLeft: SPACING.base,
    paddingRight: 7,
    paddingVertical: 7,
  },
  composerBusy: {
    borderColor: MATCHMAKER_HOME.border,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 96,
    color: MATCHMAKER_HOME.foreground,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
    paddingVertical: 10,
  },
  composerStatus: {
    color: MATCHMAKER_HOME.mutedForeground,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  sendButton: {
    width: 44,
    height: 44,
    backgroundColor: MATCHMAKER_HOME.primary,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressedNeutral: {
    backgroundColor: MATCHMAKER_HOME.surfacePressed,
    transform: [{ scale: 0.995 }],
  },
  pressedPrimary: {
    backgroundColor: MATCHMAKER_HOME.primaryPressed,
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    opacity: 0.48,
  },
});
