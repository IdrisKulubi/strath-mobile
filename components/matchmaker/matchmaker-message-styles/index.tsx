import React from 'react';

import type { MatchmakerConversationStyle } from '@/lib/matchmaker/conversation-ui';

import {
  BubbleChatActivePrompt,
  BubbleChatAssistantRow,
  BubbleChatAssistantVoice,
  BubbleChatUserRow,
} from './bubble-chat';
import {
  MinimalEditorialActivePrompt,
  MinimalEditorialAssistantRow,
  MinimalEditorialAssistantVoice,
  MinimalEditorialUserRow,
} from './minimal-editorial';
import { MatchmakerThinkingRow } from './matchmaker-thinking-row';
import type {
  MatchmakerActivePromptProps,
  MatchmakerAssistantVoiceProps,
  MatchmakerMessageRenderProps,
} from './types';
import {
  VoiceGuideActivePrompt,
  VoiceGuideAssistantRow,
  VoiceGuideAssistantVoice,
  VoiceGuideUserRow,
} from './voice-guide';

export { MatchmakerConversationStylePicker } from './matchmaker-conversation-style-picker';
export { MatchmakerThinkingRow } from './matchmaker-thinking-row';

interface StyleComponents {
  UserRow: React.ComponentType<MatchmakerMessageRenderProps>;
  AssistantRow: React.ComponentType<MatchmakerMessageRenderProps>;
  ActivePrompt: React.ComponentType<MatchmakerActivePromptProps>;
  AssistantVoice: React.ComponentType<MatchmakerAssistantVoiceProps>;
}

const STYLE_COMPONENTS: Record<MatchmakerConversationStyle, StyleComponents> = {
  minimal: {
    UserRow: MinimalEditorialUserRow,
    AssistantRow: MinimalEditorialAssistantRow,
    ActivePrompt: MinimalEditorialActivePrompt,
    AssistantVoice: MinimalEditorialAssistantVoice,
  },
  voice: {
    UserRow: VoiceGuideUserRow,
    AssistantRow: VoiceGuideAssistantRow,
    ActivePrompt: VoiceGuideActivePrompt,
    AssistantVoice: VoiceGuideAssistantVoice,
  },
  bubble: {
    UserRow: BubbleChatUserRow,
    AssistantRow: BubbleChatAssistantRow,
    ActivePrompt: BubbleChatActivePrompt,
    AssistantVoice: BubbleChatAssistantVoice,
  },
};

export function getMatchmakerMessageComponents(style: MatchmakerConversationStyle) {
  return STYLE_COMPONENTS[style];
}

export function MatchmakerUserMessageRow({
  style,
  ...props
}: MatchmakerMessageRenderProps & { style: MatchmakerConversationStyle }) {
  const components = getMatchmakerMessageComponents(style);
  return <components.UserRow {...props} />;
}

export function MatchmakerAssistantMessageRow({
  style,
  ...props
}: MatchmakerMessageRenderProps & { style: MatchmakerConversationStyle }) {
  const components = getMatchmakerMessageComponents(style);
  return <components.AssistantRow {...props} />;
}

export function MatchmakerActivePromptBlock({
  style,
  ...props
}: MatchmakerActivePromptProps & { style: MatchmakerConversationStyle }) {
  const components = getMatchmakerMessageComponents(style);
  return <components.ActivePrompt {...props} />;
}

export function MatchmakerAssistantVoiceBlock({
  style,
  ...props
}: MatchmakerAssistantVoiceProps & { style: MatchmakerConversationStyle }) {
  const components = getMatchmakerMessageComponents(style);
  return <components.AssistantVoice {...props} />;
}
