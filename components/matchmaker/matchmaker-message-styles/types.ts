import type { MatchmakerConversationMessage } from '@/types/matchmaker';

export interface MatchmakerMessageRenderProps {
  message?: MatchmakerConversationMessage | null;
  text?: string;
  role?: 'user' | 'assistant';
  animate?: boolean;
  compact?: boolean;
  showEyebrow?: boolean;
  messageId?: string;
}

export interface MatchmakerActivePromptProps {
  text: string;
  message?: MatchmakerConversationMessage | null;
  animate?: boolean;
  messageId?: string;
}

export interface MatchmakerAssistantVoiceProps {
  text: string;
  messageId?: string;
  animate?: boolean;
  compact?: boolean;
}
