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
  | 'wait_for_response'
  | 'send_text';

const SEARCH_CONSUMING_REPLIES = new Set([
  'find another',
  'find my person',
  'keep looking',
  'skip feedback',
  'go ahead and search',
]);

export function getAssistantPromptText(
  message: MatchmakerConversationMessage | null,
): string {
  return message?.text?.trim() || CANONICAL_MATCHMAKER_PROMPT;
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
  if (variant === 'feedback') return false;
  if (variant === 'limit') return true;
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

const SEARCH_REFINEMENT_REPLIES = new Set([
  'change something',
  'make it more serious',
  'show someone active',
]);

const SEARCH_CONFIRMATION_PATTERNS = [
  /^yes\b/i,
  /^yeah\b/i,
  /^yep\b/i,
  /^yup\b/i,
  /^sure\b/i,
  /^ok(?:ay)?\b/i,
  /^please\b/i,
  /^go ahead\b/i,
  /^start(?:\s+now|\s+searching)?\b/i,
  /^search(?:\s+now)?\b/i,
  /^keep\s+(?:searching|going)\b/i,
  /^continue\b/i,
  /^find\s+(?:my\s+person|someone)\b/i,
  /^thanks?\b/i,
  /^thank\s+you\b/i,
  /^sounds?\s+good\b/i,
  /^let'?s\s+(?:go|do\s+it)\b/i,
  /^do\s+it\b/i,
  /^proceed\b/i,
];

const SEARCH_REFINEMENT_PATTERNS = [
  /change something/i,
  /make it more/i,
  /show someone active/i,
  /\btweak\b/i,
  /\badjust\b/i,
  /more serious/i,
  /less social/i,
  /\bdifferent\b/i,
];

export function isMatchmakerSearchRefinement(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;

  return SEARCH_REFINEMENT_REPLIES.has(normalized)
    || SEARCH_REFINEMENT_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function isMatchmakerSearchConfirmation(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized || isMatchmakerSearchRefinement(normalized)) return false;

  if (
    normalized === 'go ahead and search'
    || normalized === 'find my person'
    || normalized === 'search now'
  ) {
    return true;
  }

  if (
    normalized.includes('yes please')
    || normalized.includes('start now')
    || normalized.includes('start searching')
    || normalized.includes('keep searching')
    || normalized.includes('keep going')
  ) {
    return true;
  }

  return SEARCH_CONFIRMATION_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function normalizeQuickReplyLabel(reply: string): string {
  const normalized = reply.toLowerCase();
  if (normalized === 'go ahead and search') return 'Find my person';
  if (reply === 'Skip feedback') return 'Skip';
  return reply;
}

export function filterMatchmakerQuickReplies(
  replies: string[],
  remainingSearches: number,
): string[] {
  if (remainingSearches > 0) return replies;

  return replies.filter((reply) => {
    const normalized = reply.trim().toLowerCase();
    if (SEARCH_CONSUMING_REPLIES.has(normalized)) return false;
    if (isMatchmakerSearchConfirmation(reply)) return false;
    return true;
  });
}

export function resolveQuickReplyAction(reply: string): QuickReplyAction {
  if (isMatchmakerSearchConfirmation(reply)) return 'search';
  const normalized = reply.toLowerCase();
  if (normalized === 'find another' || normalized === 'keep looking') return 'find_another';
  if (normalized === "i'll wait for their response") return 'wait_for_response';
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
  const quickReplies = filterMatchmakerQuickReplies(
    data?.quickReplies?.filter(Boolean).slice(0, 6) ?? [],
    remainingSearches,
  );

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

  if (remainingSearches <= 0) {
    return {
      variant: 'limit',
      promptText: latestAssistant?.text ?? 'Searches resume tomorrow. Fine-tune now if you want.',
      promptMessage: latestAssistant,
      candidate: null,
      quickReplies,
      showSearchAction: false,
      searchActionLabel: 'Find my person',
      showMessagesAction: false,
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
