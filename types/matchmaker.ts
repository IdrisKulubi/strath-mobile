export interface MatchmakerIntent {
  traits: string[];
  activeToday: boolean;
  seriousIntent: boolean;
}

export interface MatchmakerCandidate {
  candidateUserId: string;
  firstName: string | null;
  age: number | null;
  university: string | null;
  course: string | null;
  reason: string;
  labels: string[];
}

export interface MatchmakerSearchMeta {
  searchedCachedCandidates: number;
  embeddingUsed: boolean;
}

export interface MatchmakerSearchResponse {
  summary: string;
  candidates: MatchmakerCandidate[];
  intent: MatchmakerIntent;
  meta: MatchmakerSearchMeta;
}

export type MatchmakerConversationState =
  | 'greeting'
  | 'collecting_intent'
  | 'clarifying'
  | 'ready_to_search'
  | 'presenting_candidate'
  | 'collecting_feedback'
  | 'limit_reached';

export type MatchmakerConversationMessageRole = 'user' | 'assistant' | 'system';

export type MatchmakerConversationMessageKind =
  | 'greeting'
  | 'text'
  | 'intent'
  | 'clarifying_question'
  | 'search_plan'
  | 'candidate'
  | 'feedback'
  | 'limit';

export interface MatchmakerConversationMessage {
  id: string;
  role: MatchmakerConversationMessageRole;
  kind: MatchmakerConversationMessageKind;
  text: string;
  quickReplies: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface MatchmakerConversationSession {
  id: string;
  state: MatchmakerConversationState;
  status: 'active' | 'completed' | 'expired';
  sessionDay: string;
  dailySearchCount: number;
  searchLimit: number;
  remainingSearches: number;
  currentIntent: Record<string, unknown>;
  currentPlan: Record<string, unknown>;
  quota: {
    used: number;
    limit: number;
    remaining: number;
    resetsAt: string;
    timezone: 'Africa/Nairobi';
    limitReason: 'daily_search_limit' | null;
  };
}

export interface MatchmakerConversationResponse {
  session: MatchmakerConversationSession;
  messages: MatchmakerConversationMessage[];
  quickReplies: string[];
}
