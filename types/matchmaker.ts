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
  profilePhoto?: string | null;
  photos?: string[];
  reason: string;
  labels: string[];
}

export interface MatchmakerSearchMeta {
  searchedCachedCandidates: number;
  embeddingUsed: boolean;
}

export type MatchmakerPreferenceCategory =
  | 'relationship_intent'
  | 'values'
  | 'lifestyle'
  | 'communication'
  | 'social_energy'
  | 'practical'
  | 'attraction'
  | 'interests'
  | 'activity'
  | 'personality'
  | 'other';

export type MatchmakerPreferenceSentiment = 'prefer' | 'avoid';
export type MatchmakerPreferenceImportance = 'must_have' | 'prefer' | 'flexible';
export type MatchmakerPreferenceCertainty = 'confirmed' | 'inferred';
export type MatchmakerPreferenceSource = 'direct' | 'feedback' | 'migrated_memory' | 'system';

export interface MatchmakerBriefPreference {
  id: string;
  category: MatchmakerPreferenceCategory;
  value: string;
  sentiment: MatchmakerPreferenceSentiment;
  importance: MatchmakerPreferenceImportance;
  certainty: MatchmakerPreferenceCertainty;
  source: MatchmakerPreferenceSource;
  status: 'active' | 'removed';
  version: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface MatchmakerBrief {
  version: number;
  latestChangeId: string | null;
  preferences: MatchmakerBriefPreference[];
  updatedAt: string | null;
}

export type MatchmakerBriefOperation =
  | {
      type: 'add';
      category: MatchmakerPreferenceCategory;
      value: string;
      sentiment?: MatchmakerPreferenceSentiment;
      importance?: MatchmakerPreferenceImportance;
      certainty?: MatchmakerPreferenceCertainty;
      source?: MatchmakerPreferenceSource;
      metadata?: Record<string, unknown>;
    }
  | {
      type: 'update';
      preferenceId: string;
      value?: string;
      sentiment?: MatchmakerPreferenceSentiment;
      metadata?: Record<string, unknown>;
    }
  | { type: 'confirm'; preferenceId: string }
  | { type: 'reclassify'; preferenceId: string; importance: MatchmakerPreferenceImportance }
  | { type: 'remove'; preferenceId: string };

export interface MatchmakerBriefMutationInput {
  baseVersion: number;
  operations: MatchmakerBriefOperation[];
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
