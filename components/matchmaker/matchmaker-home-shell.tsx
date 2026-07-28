import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useIsMutating } from '@tanstack/react-query';

import { MatchmakerConversation } from '@/components/matchmaker/matchmaker-conversation';
import { MatchmakerHeader } from '@/components/matchmaker/matchmaker-header';
import { useMatchmakerConversation } from '@/hooks/use-matchmaker';
import { getMatchmakerVisualState, getCandidateFromMessage } from '@/lib/matchmaker/conversation-ui';
import { MATCHMAKER_HOME, SPACING } from '@/lib/design-tokens';

interface MatchmakerHomeShellProps {
  conversationEnabled?: boolean;
}

export function MatchmakerHomeShell({ conversationEnabled = true }: MatchmakerHomeShellProps) {
  const conversation = useMatchmakerConversation(conversationEnabled);
  const mutationCount = useIsMutating({ mutationKey: ['matchmaker', 'conversation'] });
  const visualState = getMatchmakerVisualState({
    sessionState: conversation.data?.session.state,
    isLoading: conversation.isLoading,
    isError: conversation.isError,
    isMutating: mutationCount > 0,
  });
  const latestCandidateMessage = [...(conversation.data?.messages ?? [])]
    .reverse()
    .find((message) => message.kind === 'candidate');
  const candidateFirstName = latestCandidateMessage
    ? getCandidateFromMessage(latestCandidateMessage)?.firstName ?? null
    : null;

  return (
    <View style={styles.wrap}>
      <MatchmakerHeader
        session={conversation.data?.session ?? null}
        visualState={visualState}
        candidateFirstName={candidateFirstName}
      />
      <MatchmakerConversation conversation={conversation} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minHeight: 0,
    gap: SPACING.base,
    backgroundColor: MATCHMAKER_HOME.background,
  },
});
