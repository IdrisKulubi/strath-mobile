import type {
  MatchmakerCandidate,
  MatchmakerConversationMessage,
  MatchmakerConversationResponse,
  MatchmakerConversationState,
} from '../../types/matchmaker';

const FEEDBACK_REASON_REPLIES = new Set([
  'Not my vibe',
  'Too social',
  'Too quiet',
  'Not serious enough',
  'Not active enough',
  'Different lifestyle',
]);

export const CANONICAL_MATCHMAKER_PROMPT = 'What kind of person would feel right today?';

export type MatchmakerVisualState =
  | 'idle'
  | 'thinking'
  | 'searching'
  | 'success'
  | 'error'
  | 'paused';

export type ActiveTurnVariant =
  | 'prompt'
  | 'candidate'
  | 'feedback'
  | 'limit'
  | 'no_result';

export interface ActiveTurn {
  variant: ActiveTurnVariant;
  promptText: string;
  promptMessage: MatchmakerConversationMessage | null;
  candidate: MatchmakerCandidate | null;
  quickReplies: string[];
  showSearchAction: boolean;
  searchActionLabel: string;
  showMessagesAction: boolean;
}

export type QuickReplyAction =
  | 'search'
  | 'find_another'
  | 'not_this_one'
  | 'feedback_reason'
  | 'skip_feedback'
  | 'open_messages'
  | 'send_text';

export function getAssistantPromptText(
  message: MatchmakerConversationMessage | null,
): string {
  if (!message || message.kind === 'greeting') return CANONICAL_MATCHMAKER_PROMPT;
  return message.text;
}

export function getMatchmakerVisualState(input: {
  sessionState?: MatchmakerConversationState;
  isLoading?: boolean;
  isError?: boolean;
  isMutating?: boolean;
}): MatchmakerVisualState {
  if (input.isError) return 'error';
  if (input.sessionState === 'limit_reached') return 'paused';
  if (input.isMutating && input.sessionState === 'ready_to_search') return 'searching';
  if (input.isLoading || input.isMutating) return 'thinking';
  if (
    input.sessionState === 'presenting_candidate'
    || input.sessionState === 'collecting_feedback'
  ) {
    return 'success';
  }
  return 'idle';
}

export function shouldShowMatchmakerComposer(
  variant: ActiveTurnVariant,
  remainingSearches = 0,
): boolean {
  if (variant === 'limit' || variant === 'feedback') return false;
  if (variant === 'candidate' && remainingSearches <= 0) return false;
  return variant === 'prompt' || variant === 'candidate' || variant === 'no_result';
}

export function humanizeCandidateLead(text: string, firstName?: string | null): string {
  const cleaned = text
    .trim()
    .replace(/^i would start here\.?\s*/i, '')
    .replace(/^i would start with\s+[^.]+\.?\s*/i, '')
    .trim();

  if (cleaned.length > 0) return cleaned;
  if (firstName) return `${firstName} feels close to what you asked for.`;
  return 'This person feels close to what you asked for.';
}

export function getDistinctCandidateLabels(labels: string[], reason: string): string[] {
  const reasonLower = reason.toLowerCase();
  return labels
    .filter((label) => !reasonLower.includes(label.toLowerCase()))
    .slice(0, 2);
}

export function formatRemainingSearches(remaining: number): string {
  if (remaining <= 0) return 'No searches left today';
  if (remaining === 1) return '1 search left today';
  return `${remaining} searches left today`;
}

export function getSessionStatusLabel(state: MatchmakerConversationState): string {
  switch (state) {
    case 'greeting':
    case 'collecting_intent':
      return 'Learning what feels right';
    case 'clarifying':
      return 'Refining your preference';
    case 'ready_to_search':
      return 'Ready to search';
    case 'presenting_candidate':
      return 'Showing a match';
    case 'collecting_feedback':
      return 'Adjusting for next time';
    case 'limit_reached':
      return 'Paused for today';
    default:
      return 'Your matchmaker';
  }
}

export function isNoResultMessage(message: MatchmakerConversationMessage | null): boolean {
  if (!message) return false;
  return (
    message.kind === 'text'
    && typeof message.metadata?.searchedCachedCandidates === 'number'
    && typeof message.metadata?.excludedAlreadyShown === 'number'
  );
}

export function getCandidateFromMessage(message: MatchmakerConversationMessage): MatchmakerCandidate | null {
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
    photos: Array.isArray(candidateRecord.photos)
      ? candidateRecord.photos.filter((photo): photo is string => typeof photo === 'string')
      : [],
    reason: candidateRecord.reason ?? message.text,
    labels: Array.isArray(candidateRecord.labels) ? candidateRecord.labels : [],
  };
}

export function isFeedbackReasonReply(reply: string): boolean {
  return FEEDBACK_REASON_REPLIES.has(reply);
}

export function normalizeQuickReplyLabel(reply: string): string {
  const normalized = reply.toLowerCase();
  if (normalized === 'go ahead and search') return 'Find my person';
  if (reply === 'Skip feedback') return 'Skip';
  return reply;
}

export function resolveQuickReplyAction(reply: string): QuickReplyAction {
  const normalized = reply.toLowerCase();
  if (
    normalized === 'go ahead and search'
    || normalized === 'find my person'
    || normalized === 'search now'
  ) {
    return 'search';
  }
  if (normalized === 'find another') return 'find_another';
  if (normalized === 'not this one') return 'not_this_one';
  if (normalized === 'skip feedback') return 'skip_feedback';
  if (normalized.includes('message')) return 'open_messages';
  if (FEEDBACK_REASON_REPLIES.has(reply)) return 'feedback_reason';
  return 'send_text';
}

export function partitionConversationMessages(messages: MatchmakerConversationMessage[]): {
  history: MatchmakerConversationMessage[];
  active: MatchmakerConversationMessage[];
} {
  if (messages.length <= 2) {
    return { history: [], active: messages };
  }

  const last = messages[messages.length - 1];
  if (last?.kind === 'candidate') {
    return {
      history: messages.slice(0, -1),
      active: [last],
    };
  }

  if (last?.kind === 'feedback' || last?.kind === 'limit') {
    return {
      history: messages.slice(0, -1),
      active: [last],
    };
  }

  const activeStart = Math.max(0, messages.length - 3);
  return {
    history: messages.slice(0, activeStart),
    active: messages.slice(activeStart),
  };
}

export function selectActiveTurn(
  data: MatchmakerConversationResponse | undefined,
): ActiveTurn {
  const messages = data?.messages ?? [];
  const latestAssistant = [...messages].reverse().find((message) => message.role === 'assistant') ?? null;
  const state = data?.session.state ?? 'greeting';
  const remainingSearches = data?.session.remainingSearches ?? 0;
  const quickReplies = data?.quickReplies?.filter(Boolean).slice(0, 6) ?? [];

  if (latestAssistant?.kind === 'limit' || state === 'limit_reached') {
    return {
      variant: 'limit',
      promptText: latestAssistant?.text ?? 'I saved what I learned for tomorrow.',
      promptMessage: latestAssistant,
      candidate: null,
      quickReplies,
      showSearchAction: false,
      searchActionLabel: 'Find my person',
      showMessagesAction: false,
    };
  }

  if (isNoResultMessage(latestAssistant)) {
    return {
      variant: 'no_result',
      promptText: latestAssistant?.text ?? 'I could not find a strong match from that direction yet.',
      promptMessage: latestAssistant,
      candidate: null,
      quickReplies,
      showSearchAction: false,
      searchActionLabel: 'Try again',
      showMessagesAction: false,
    };
  }

  if (latestAssistant?.kind === 'candidate') {
    const candidate = getCandidateFromMessage(latestAssistant);
    const insight = candidate?.reason?.trim()
      || humanizeCandidateLead(latestAssistant.text, candidate?.firstName);
    return {
      variant: 'candidate',
      promptText: insight,
      promptMessage: latestAssistant,
      candidate: candidate ? { ...candidate, reason: insight } : null,
      quickReplies,
      showSearchAction: remainingSearches > 0,
      searchActionLabel: 'Find another',
      showMessagesAction: false,
    };
  }

  if (latestAssistant?.kind === 'feedback') {
    const outcome = latestAssistant.metadata?.outcome;
    return {
      variant: 'feedback',
      promptText: latestAssistant.text,
      promptMessage: latestAssistant,
      candidate: null,
      quickReplies,
      showSearchAction: remainingSearches > 0 && !quickReplies.some((reply) => FEEDBACK_REASON_REPLIES.has(reply)),
      searchActionLabel: 'Find another',
      showMessagesAction: outcome === 'interested',
    };
  }

  return {
    variant: 'prompt',
    promptText: getAssistantPromptText(latestAssistant),
    promptMessage: latestAssistant,
    candidate: null,
    quickReplies,
    showSearchAction: remainingSearches > 0 && state === 'ready_to_search',
    searchActionLabel: state === 'presenting_candidate' ? 'Find another' : 'Find my person',
    showMessagesAction: false,
  };
}

export function shouldEnableMatchmakerQuery(hasAiConsent: boolean, isAiConsentLoading: boolean): boolean {
  return hasAiConsent && !isAiConsentLoading;
}
