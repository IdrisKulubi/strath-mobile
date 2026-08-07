import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useMinimizeOnScroll } from 'expo-glass-tabs';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  MessageCircle,
  Search,
} from 'lucide-react-native';
import { PaperPlaneTilt } from 'phosphor-react-native';

import type { UseQueryResult } from '@tanstack/react-query';

import { MatchmakerCandidateCard } from '@/components/matchmaker/matchmaker-candidate-card';
import { MatchmakerBriefCard } from '@/components/matchmaker/matchmaker-brief';
import { MatchmakerShortlistView } from '@/components/matchmaker/matchmaker-shortlist';
// Force Metro to rebundle candidate card CTA styles.
import { MatchmakerFeedbackPanel } from '@/components/matchmaker/matchmaker-feedback-panel';
import { MatchmakerFeedbackFlow } from '@/components/matchmaker/matchmaker-feedback-flow';
import { MatchmakerLimitEmptyState } from '@/components/matchmaker/matchmaker-limit-empty-state';
import {
  MatchmakerActivePromptBlock,
  MatchmakerAssistantMessageRow,
  MatchmakerAssistantVoiceBlock,
  MatchmakerConversationStylePicker,
  MatchmakerThinkingRow,
  MatchmakerUserMessageRow,
} from '@/components/matchmaker/matchmaker-message-styles';
import { MatchmakerReplyIcon } from '@/components/matchmaker/matchmaker-reply-icon';
import { MatchmakerStatePanel } from '@/components/matchmaker/matchmaker-state-panel';
import { getGlassTabBarHeight } from '@/components/navigation/glass-tab-bar';
import { useToast } from '@/components/ui/toast';
import { Text } from '@/components/ui/text';
import {
  useFindNextMatchmakerCandidate,
  useMatchmakerBrief,
  useSendMatchmakerMessage,
  useSubmitMatchmakerFeedback,
  useTrackMatchmakerShortlistEvent,
  useTrackMatchmakerFeedbackEvent,
  useUndoMatchmakerBriefChange,
  useUpdateMatchmakerBrief,
} from '@/hooks/use-matchmaker';
import { usePublicFeatureFlags } from '@/hooks/use-payments-enabled';
import { useNetwork } from '@/hooks/use-network';
import {
  isMatchmakerSearchConfirmation,
  normalizeQuickReplyLabel,
  partitionConversationMessages,
  parseMatchmakerConversationStyle,
  resolveQuickReplyAction,
  type MatchmakerConversationStyle,
  selectActiveTurn,
  shouldShowLimitEmptyState,
  shouldShowMatchmakerComposer,
} from '@/lib/matchmaker/conversation-ui';
import {
  getMatchmakerUserMessage,
  MATCHMAKER_ERROR_TITLE,
} from '@/lib/matchmaker/error-copy';
import { readMatchmakerShortlist } from '@/lib/matchmaker/shortlist';
import { loadMatchmakerUiDraft, saveMatchmakerUiDraft } from '@/lib/matchmaker/ui-draft-storage';
import { MATCHMAKER_HOME, RADIUS, SPACING } from '@/lib/design-tokens';
import type {
  MatchmakerConversationMessage,
  MatchmakerConversationResponse,
  MatchmakerBriefOperation,
  MatchmakerFeedbackReasonCode,
} from '@/types/matchmaker';

/** Floating glass composer pill height (input row). */
export const MATCHMAKER_FLOATING_COMPOSER_HEIGHT = 50;

const COMPOSER_SIDE_INSET = 12;
const COMPOSER_MODE_LABEL_HEIGHT = 18;
const COMPOSER_STATUS_HEIGHT = 18;
const COMPOSER_GLASS_TINT = 'rgba(30, 21, 43, 0.38)';
const COMPOSER_GLASS_FALLBACK = 'rgba(30, 21, 43, 0.52)';
const COMPOSER_PILL_RADIUS = MATCHMAKER_FLOATING_COMPOSER_HEIGHT / 2;
const CONVERSATION_STYLE_DRAFT_KEY = 'matchmaker-conversation-style';

interface MatchmakerConversationProps {
  conversation: UseQueryResult<MatchmakerConversationResponse, Error>;
  /** Extra top padding so content clears the floating glass header. */
  topInset?: number;
}

function shouldAnimateAssistantMessage(
  messageId: string,
  latestAssistantId: string | undefined,
  isPending: boolean,
) {
  if (isPending) return false;
  return messageId === latestAssistantId;
}

function HistoryMessageRow({
  message,
  style,
}: {
  message: MatchmakerConversationMessage;
  style: MatchmakerConversationStyle;
}) {
  if (message.role === 'user') {
    return (
      <MatchmakerUserMessageRow
        style={style}
        message={message}
        compact
        animate={false}
      />
    );
  }

  return (
    <MatchmakerAssistantMessageRow
      style={style}
      message={message}
      compact
      animate={false}
    />
  );
}

export function MatchmakerConversation({
  conversation,
  topInset = 0,
}: MatchmakerConversationProps) {
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const tabBarHeight = getGlassTabBarHeight(insets.bottom);
  const onScroll = useMinimizeOnScroll();
  const sendMessage = useSendMatchmakerMessage();
  const findCandidate = useFindNextMatchmakerCandidate();
  const submitFeedback = useSubmitMatchmakerFeedback();
  const { mutate: trackShortlistEvent } = useTrackMatchmakerShortlistEvent();
  const { mutate: trackFeedbackEvent } = useTrackMatchmakerFeedbackEvent();
  const featureFlags = usePublicFeatureFlags();
  const network = useNetwork();
  const reduceMotion = useReducedMotion();
  const personalizationV2Enabled = Boolean(featureFlags.data?.matchmakerPersonalizationV2);
  const briefQuery = useMatchmakerBrief(personalizationV2Enabled);
  const updateBrief = useUpdateMatchmakerBrief();
  const undoBrief = useUndoMatchmakerBriefChange();
  const [draft, setDraft] = useState('');
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [feedbackCandidateUserId, setFeedbackCandidateUserId] = useState<string | null>(null);
  const [conversationStyle, setConversationStyle] = useState<MatchmakerConversationStyle>('minimal');
  const [pendingUserText, setPendingUserText] = useState<string | null>(null);
  const lastAnnouncement = useRef<string | null>(null);
  const wasOffline = useRef(false);

  const data = conversation.data;
  const messages = useMemo(() => data?.messages ?? [], [data?.messages]);
  const turn = useMemo(() => selectActiveTurn(data), [data]);
  const shortlistMessage = useMemo(() => [...messages].reverse().find((message) => readMatchmakerShortlist(message)) ?? null, [messages]);
  const activeShortlist = useMemo(() => {
    const stateAllowsShortlist = data?.session.state === 'presenting_shortlist' || data?.session.state === 'collecting_feedback';
    return personalizationV2Enabled && stateAllowsShortlist ? readMatchmakerShortlist(shortlistMessage) : null;
  }, [data?.session.state, personalizationV2Enabled, shortlistMessage]);
  const feedbackCandidate = useMemo(() => activeShortlist?.candidates.find((candidate) => candidate.candidateUserId === feedbackCandidateUserId) ?? null, [activeShortlist, feedbackCandidateUserId]);
  const { history, active } = useMemo(() => partitionConversationMessages(messages), [messages]);
  const latestAssistantMessage = useMemo(
    () => [...messages].reverse().find((message) => message.role === 'assistant') ?? null,
    [messages],
  );
  const latestAssistantId = latestAssistantMessage?.id;
  const isConversationPending = sendMessage.isPending || findCandidate.isPending;
  const isBusy = conversation.isLoading
    || conversation.isFetching
    || sendMessage.isPending
    || findCandidate.isPending
    || submitFeedback.isPending;
  const briefBusy = updateBrief.isPending || undoBrief.isPending || network.isOffline;
  const sendErrorMessage = sendMessage.isError
    ? getMatchmakerUserMessage(sendMessage.error)
    : undefined;
  const retryDraft = draft.trim() || (typeof sendMessage.variables === 'string' ? sendMessage.variables : '');
  const remainingSearches = data?.session.remainingSearches ?? 0;
  const showLimitEmptyState = shouldShowLimitEmptyState(turn);
  const showComposer = shouldShowMatchmakerComposer(turn.variant, remainingSearches, turn.limitMode);
  const composerPlaceholder = turn.limitMode === 'refine_type'
    ? 'Describe your type for tomorrow'
    : turn.limitMode === 'date_idea'
      ? 'Want a different vibe?'
      : turn.variant === 'candidate'
        ? 'Tell me what to adjust'
        : 'Say it your way';
  const showComposerModeLabel = showComposer
    && (turn.limitMode === 'refine_type' || turn.limitMode === 'date_idea');
  const useLiquidGlass = isLiquidGlassAvailable();

  useEffect(() => {
    let active = true;
    loadMatchmakerUiDraft(CONVERSATION_STYLE_DRAFT_KEY).then((saved) => {
      if (active) setConversationStyle(parseMatchmakerConversationStyle(saved));
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    saveMatchmakerUiDraft(CONVERSATION_STYLE_DRAFT_KEY, conversationStyle).catch(() => undefined);
  }, [conversationStyle]);

  useEffect(() => {
    if (!sendMessage.isPending && !findCandidate.isPending) {
      setPendingUserText(null);
    }
  }, [findCandidate.isPending, sendMessage.isPending]);

  useEffect(() => {
    const sessionId = data?.session.id;
    if (!sessionId) return;
    let active = true;
    loadMatchmakerUiDraft(`composer:${sessionId}`).then((saved) => {
      if (active && saved) setDraft((current) => current || saved);
    });
    return () => { active = false; };
  }, [data?.session.id]);

  useEffect(() => {
    const sessionId = data?.session.id;
    if (!sessionId) return;
    saveMatchmakerUiDraft(`composer:${sessionId}`, draft).catch(() => undefined);
  }, [data?.session.id, draft]);

  useEffect(() => {
    if (wasOffline.current && !network.isOffline) {
      conversation.refetch().catch(() => undefined);
      if (personalizationV2Enabled) briefQuery.refetch().catch(() => undefined);
    }
    wasOffline.current = network.isOffline;
  }, [briefQuery, conversation, network.isOffline, personalizationV2Enabled]);

  useEffect(() => {
    let announcement: string | null = null;
    if (network.isOffline) announcement = 'You are offline. Your matchmaker conversation and drafts are safe.';
    else if (findCandidate.isPending) announcement = 'Searching for your shortlist.';
    else if (sendMessage.isPending) announcement = 'Your matchmaker is thinking.';
    else if (submitFeedback.isError || sendMessage.isError || findCandidate.isError || conversation.isError) announcement = 'The matchmaker hit a problem. Your work is safe and you can retry.';
    else {
      const latestLearning = messages.at(-1)?.metadata?.learningUpdate;
      if (latestLearning && typeof latestLearning === 'object' && typeof (latestLearning as Record<string, unknown>).summary === 'string') announcement = 'Your match brief update was saved. Undo is available.';
      else if (activeShortlist) announcement = `Shortlist ready with ${activeShortlist.candidates.length} ${activeShortlist.candidates.length === 1 ? 'person' : 'people'}.`;
    }
    if (announcement && announcement !== lastAnnouncement.current) {
      lastAnnouncement.current = announcement;
      AccessibilityInfo.announceForAccessibility(announcement);
    }
  }, [activeShortlist, conversation.isError, findCandidate.isError, findCandidate.isPending, messages, network.isOffline, sendMessage.isError, sendMessage.isPending, submitFeedback.isError]);

  const handleBriefUpdate = useCallback(async (operations: MatchmakerBriefOperation[]) => {
    const brief = briefQuery.data;
    if (!brief) return;
    try {
      await updateBrief.mutateAsync({ baseVersion: brief.version, operations });
      AccessibilityInfo.announceForAccessibility('Your match brief was updated.');
      toast.show({ message: 'Your match brief is updated.', variant: 'success', position: 'bottom' });
    } catch (error) {
      toast.show({
        message: error instanceof Error ? error.message : 'Could not update your match brief.',
        variant: 'warning',
        position: 'bottom',
      });
      throw error;
    }
  }, [briefQuery.data, toast, updateBrief]);

  const handleBriefUndo = useCallback(async (changeId: string) => {
    try {
      await undoBrief.mutateAsync(changeId);
      AccessibilityInfo.announceForAccessibility('The match brief change was undone.');
      toast.show({ message: 'Last match brief change undone.', variant: 'success', position: 'bottom' });
    } catch (error) {
      toast.show({
        message: error instanceof Error ? error.message : 'Could not undo that change.',
        variant: 'warning',
        position: 'bottom',
      });
      throw error;
    }
  }, [toast, undoBrief]);
  const handleShortlistEvent = useCallback((event: Parameters<typeof trackShortlistEvent>[0]['event'], position?: number) => {
    if (!activeShortlist) return;
    trackShortlistEvent({
      event,
      shortlistId: activeShortlist.id,
      shortlistSize: activeShortlist.candidates.length,
      position,
    });
  }, [activeShortlist, trackShortlistEvent]);
  const handleFeedbackEvent = useCallback((event: 'feedback_reason_selected' | 'feedback_follow_up_requested' | 'feedback_follow_up_completed' | 'feedback_learning_previewed' | 'feedback_learning_cancelled', reasonCode: MatchmakerFeedbackReasonCode) => {
    if (!activeShortlist || !feedbackCandidateUserId) return;
    trackFeedbackEvent({
      event,
      shortlistId: activeShortlist.id,
      shortlistSize: activeShortlist.candidates.length,
      candidateUserId: feedbackCandidateUserId,
      reasonCode,
    });
  }, [activeShortlist, feedbackCandidateUserId, trackFeedbackEvent]);
  const composerScrollInset = useMemo(() => {
    // Let content flow under the floating tab bar; pad enough to clear composer + bar.
    let inset = tabBarHeight + SPACING.compact;
    if (showComposer) {
      inset += MATCHMAKER_FLOATING_COMPOSER_HEIGHT + SPACING.tight;
      if (showComposerModeLabel) inset += COMPOSER_MODE_LABEL_HEIGHT;
      if (isBusy) inset += COMPOSER_STATUS_HEIGHT;
    } else {
      inset += SPACING.section;
    }
    return inset;
  }, [isBusy, showComposer, showComposerModeLabel, tabBarHeight]);

  const findNext = useCallback(async () => {
    if (findCandidate.isPending) return;
    if (network.isOffline) {
      toast.show({ message: 'You are offline. Your search is safe to retry after reconnecting.', variant: 'warning', position: 'bottom' });
      return;
    }
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
  }, [data?.session.remainingSearches, findCandidate, network.isOffline, toast]);

  const submit = useCallback(async (text: string) => {
    const cleaned = text.trim();
    if (!cleaned || sendMessage.isPending) return;
    if (network.isOffline) {
      toast.show({ message: 'You are offline. Your draft is saved on this device.', variant: 'warning', position: 'bottom' });
      return;
    }
    if (
      (data?.session.remainingSearches ?? 0) > 0
      && data?.session.state === 'ready_to_search'
      && isMatchmakerSearchConfirmation(cleaned)
    ) {
      await findNext();
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const pendingText = cleaned;
    setDraft('');
    setPendingUserText(pendingText);
    try {
      await sendMessage.mutateAsync(pendingText);
    } catch {
      setDraft(pendingText);
    }
  }, [data?.session.remainingSearches, data?.session.state, findNext, network.isOffline, sendMessage, toast]);

  const openCandidate = useCallback((candidateUserId: string, shortlistId?: string, shortlistPosition?: number) => {
    router.push({
      pathname: '/profile/[userId]',
      params: {
        userId: candidateUserId,
        source: 'matchmaker',
        matchType: 'discovery',
        ...(shortlistId ? { shortlistId } : {}),
        ...(shortlistPosition !== undefined ? { shortlistPosition: String(shortlistPosition) } : {}),
      },
    });
  }, [router]);

  const handleQuickReply = useCallback((reply: string) => {
    const action = resolveQuickReplyAction(reply);
    if (action === 'search' || action === 'find_another' || action === 'skip_feedback') {
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
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: composerScrollInset },
        ]}
        {...(Platform.OS === 'ios' && topInset > 0
          ? {
              contentInset: { top: topInset },
              contentOffset: { x: 0, y: -topInset },
              automaticallyAdjustContentInsets: false,
            }
          : {})}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <MatchmakerConversationStylePicker
          value={conversationStyle}
          onChange={setConversationStyle}
        />

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
              <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(180)} style={styles.historyList}>
                {history.map((message) => (
                  <HistoryMessageRow
                    key={message.id}
                    message={message}
                    style={conversationStyle}
                  />
                ))}
              </Animated.View>
            ) : null}
          </View>
        ) : null}

        {network.isOffline ? (
          <View style={styles.sectionInset}>
            <MatchmakerStatePanel
              variant="offline"
              busy={network.isLoading}
              onRetry={() => network.refresh().then(() => conversation.refetch()).catch(() => undefined)}
            />
          </View>
        ) : null}

        {personalizationV2Enabled ? (
          <MatchmakerBriefCard
            brief={briefQuery.data}
            loading={briefQuery.isLoading}
            busy={briefBusy}
            error={briefQuery.isError ? getMatchmakerUserMessage(briefQuery.error) : undefined}
            bottomInset={composerScrollInset}
            onUpdate={handleBriefUpdate}
            onUndo={handleBriefUndo}
            onRetry={() => briefQuery.refetch().catch(() => undefined)}
          />
        ) : null}

        <View style={styles.activeSection}>
          {active.map((message) => (
            message.role === 'user' ? (
              <MatchmakerUserMessageRow
                key={message.id}
                style={conversationStyle}
                message={message}
                animate={false}
              />
            ) : null
          ))}

          {pendingUserText ? (
            <MatchmakerUserMessageRow
              style={conversationStyle}
              text={pendingUserText}
              role="user"
              messageId="pending-user"
              animate={false}
            />
          ) : null}

          {isConversationPending ? (
            <View style={styles.sectionInset}>
              <MatchmakerThinkingRow
                label={findCandidate.isPending ? 'Searching for a thoughtful match…' : 'Matchmaker is thinking…'}
                showOrb={conversationStyle === 'voice'}
              />
            </View>
          ) : null}

          {!isConversationPending && activeShortlist ? (
            <View style={styles.candidateSection}>
              <MatchmakerAssistantVoiceBlock
                style={conversationStyle}
                text={shortlistMessage?.text || `I found ${activeShortlist.candidates.length} people worth considering.`}
                messageId={shortlistMessage?.id}
                animate={shouldAnimateAssistantMessage(shortlistMessage?.id ?? 'shortlist-voice', latestAssistantId, isConversationPending)}
                compact
              />
              <MatchmakerShortlistView
                shortlist={activeShortlist}
                brief={briefQuery.data}
                busy={isBusy}
                onOpenCandidate={(candidate, position) => openCandidate(candidate.candidateUserId, activeShortlist.id, position)}
                onNotForMe={(candidate) => setFeedbackCandidateUserId(candidate.candidateUserId)}
                onEvent={handleShortlistEvent}
              />
              {feedbackCandidate ? (
                <MatchmakerFeedbackFlow
                  shortlistId={activeShortlist.id}
                  candidateUserId={feedbackCandidate.candidateUserId}
                  candidateName={feedbackCandidate.firstName}
                  briefVersion={briefQuery.data?.version ?? activeShortlist.briefVersion}
                  busy={submitFeedback.isPending || network.isOffline}
                  onCancel={() => setFeedbackCandidateUserId(null)}
                  onSubmit={(input) => submitFeedback.mutateAsync(input)}
                  onEvent={handleFeedbackEvent}
                />
              ) : null}
              {remainingSearches <= 0 ? <Text style={styles.limitNote}>No searches left today. You can still review every person in this shortlist.</Text> : null}
            </View>
          ) : !isConversationPending && turn.variant === 'candidate' && turn.candidate ? (
            <View style={styles.candidateSection}>
              <MatchmakerAssistantVoiceBlock
                style={conversationStyle}
                text={turn.promptText}
                messageId={turn.promptMessage?.id}
                animate={shouldAnimateAssistantMessage(turn.promptMessage?.id ?? 'candidate-voice', latestAssistantId, isConversationPending)}
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
            <View style={styles.sectionInset}>
              <MatchmakerFeedbackPanel
                message={turn.promptMessage!}
                replies={turn.quickReplies}
                outcome={typeof turn.promptMessage?.metadata?.outcome === 'string'
                  ? turn.promptMessage.metadata.outcome
                  : undefined}
                remainingSearches={remainingSearches}
                busy={isBusy}
                onSelect={handleQuickReply}
                onUndo={handleBriefUndo}
              />
            </View>
          ) : !isConversationPending && turn.variant === 'limit' ? (
            showLimitEmptyState ? (
              <View style={styles.sectionInset}>
                <MatchmakerLimitEmptyState
                  voiceText={turn.promptText}
                  replies={turn.quickReplies}
                  busy={isBusy}
                  onReply={handleQuickReply}
                />
              </View>
            ) : (
              <View style={styles.sectionInset}>
                <MatchmakerAssistantVoiceBlock
                  style={conversationStyle}
                  text={turn.promptText}
                  messageId={turn.promptMessage?.id}
                  animate={shouldAnimateAssistantMessage(turn.promptMessage?.id ?? 'limit-voice', latestAssistantId, isConversationPending)}
                />
              </View>
            )
          ) : !isConversationPending && turn.variant === 'no_result' ? (
            <View style={styles.sectionInset}>
              <MatchmakerStatePanel
                variant="no_result"
                body={turn.promptText}
                replies={turn.quickReplies}
                busy={isBusy}
                onReply={handleQuickReply}
              />
            </View>
          ) : !isConversationPending ? (
            <MatchmakerActivePromptBlock
              style={conversationStyle}
              text={turn.promptText}
              message={turn.promptMessage}
              messageId={turn.promptMessage?.id}
              animate={shouldAnimateAssistantMessage(turn.promptMessage?.id ?? 'active-prompt', latestAssistantId, isConversationPending)}
            />
          ) : null}

          {activeShortlist && turn.variant === 'feedback' ? (
            <View style={styles.sectionInset}>
              <MatchmakerFeedbackPanel
                message={turn.promptMessage!}
                replies={turn.quickReplies}
                outcome={typeof turn.promptMessage?.metadata?.outcome === 'string' ? turn.promptMessage.metadata.outcome : undefined}
                remainingSearches={remainingSearches}
                busy={isBusy}
                onSelect={handleQuickReply}
                onUndo={handleBriefUndo}
              />
            </View>
          ) : null}
        </View>

        {conversation.isError ? (
          <View style={styles.sectionInset}>
            <MatchmakerStatePanel
              variant="inline_error"
              title={MATCHMAKER_ERROR_TITLE}
              body={getMatchmakerUserMessage(conversation.error)}
              busy={conversation.isFetching}
              onRetry={() => conversation.refetch()}
            />
          </View>
        ) : null}

        {sendErrorMessage ? (
          <View style={styles.sectionInset}>
            <MatchmakerStatePanel
              variant="inline_error"
              title={MATCHMAKER_ERROR_TITLE}
              body={sendErrorMessage}
              busy={sendMessage.isPending}
              onRetry={retryDraft
                ? () => submit(retryDraft).catch(() => undefined)
                : undefined}
            />
          </View>
        ) : null}

        {(turn.variant === 'prompt' || (turn.variant === 'limit' && !showLimitEmptyState))
          && turn.quickReplies.length > 0 ? (
          <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(180)} style={[styles.replies, styles.sectionInset]}>
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
                    <MatchmakerReplyIcon reply={reply} />
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
          <View style={[styles.searchAction, styles.sectionInset]}>
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
            style={({ pressed }) => [styles.messagesButton, styles.sectionInset, pressed && styles.pressedNeutral]}
          >
            <View style={styles.actionButtonContent}>
              <MessageCircle size={18} color={MATCHMAKER_HOME.primary} />
              <Text style={styles.messagesButtonText}>Open Messages</Text>
            </View>
          </Pressable>
        ) : null}
      </Animated.ScrollView>

      {showComposer ? (
        <View
          pointerEvents="box-none"
          style={[styles.composerHost, { bottom: tabBarHeight }]}
        >
          {isBusy ? (
            <Text accessibilityLiveRegion="polite" style={styles.composerStatus}>
              {findCandidate.isPending ? 'Searching for a thoughtful match…' : 'Matchmaker is thinking…'}
            </Text>
          ) : null}
          {showComposerModeLabel ? (
            <Text style={styles.composerLabel}>
              {turn.limitMode === 'refine_type' ? 'Your type for tomorrow' : 'Want a different vibe?'}
            </Text>
          ) : null}
          <View style={[styles.composerPill, isBusy && styles.composerPillBusy]}>
            {useLiquidGlass ? (
              <GlassView
                glassEffectStyle="regular"
                tintColor={COMPOSER_GLASS_TINT}
                colorScheme="dark"
                style={[StyleSheet.absoluteFill, styles.glassSurface]}
              />
            ) : (
              <>
                <BlurView
                  intensity={Platform.OS === 'ios' ? 55 : 40}
                  tint="dark"
                  style={[StyleSheet.absoluteFill, styles.glassSurface]}
                />
                <View style={[StyleSheet.absoluteFill, styles.glassFallbackOverlay]} />
              </>
            )}
            <View style={styles.composerRow}>
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
                  <PaperPlaneTilt
                    size={18}
                    color={MATCHMAKER_HOME.primaryForeground}
                    weight="fill"
                  />
                )}
              </Pressable>
            </View>
          </View>
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
  },
  sectionInset: {
    paddingHorizontal: SPACING.screenX,
  },
  historySection: {
    gap: SPACING.tight,
    paddingHorizontal: SPACING.screenX,
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
  activeSection: {
    gap: SPACING.base,
  },
  candidateSection: {
    gap: SPACING.compact,
    paddingHorizontal: SPACING.screenX,
  },
  limitNote: {
    color: MATCHMAKER_HOME.subtleForeground,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: SPACING.tight,
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
  composerHost: {
    position: 'absolute',
    left: 0,
    right: 0,
    gap: SPACING.tight,
    paddingHorizontal: COMPOSER_SIDE_INSET,
    paddingBottom: SPACING.tight,
  },
  composerLabel: {
    color: MATCHMAKER_HOME.mutedForeground,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  composerPill: {
    minHeight: MATCHMAKER_FLOATING_COMPOSER_HEIGHT,
    borderRadius: COMPOSER_PILL_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: MATCHMAKER_HOME.navBorder,
    // Avoid overflow:hidden — it kills liquid glass on iOS.
  },
  composerPillBusy: {
    borderColor: MATCHMAKER_HOME.border,
  },
  glassSurface: {
    borderRadius: COMPOSER_PILL_RADIUS,
    borderCurve: 'continuous',
  },
  glassFallbackOverlay: {
    borderRadius: COMPOSER_PILL_RADIUS,
    backgroundColor: COMPOSER_GLASS_FALLBACK,
    borderCurve: 'continuous',
  },
  composerRow: {
    minHeight: MATCHMAKER_FLOATING_COMPOSER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.tight,
    paddingLeft: SPACING.base,
    paddingRight: 14,
    paddingVertical: 6,
    zIndex: 1,
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 88,
    color: MATCHMAKER_HOME.foreground,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '500',
    paddingVertical: 8,
  },
  composerStatus: {
    color: MATCHMAKER_HOME.mutedForeground,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  sendButton: {
    width: 36,
    height: 36,
    marginRight: 2,
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
