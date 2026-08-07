import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsMutating } from '@tanstack/react-query';

import { MatchmakerConversation } from '@/components/matchmaker/matchmaker-conversation';
import { MatchmakerHomeBackground } from '@/components/matchmaker/matchmaker-home-background';
import { MatchmakerTopFade } from '@/components/matchmaker/matchmaker-top-fade';
import {
  MatchmakerHeader,
  MatchmakerHeaderScrollProvider,
  getMatchmakerFloatingHeaderHeight,
} from '@/components/matchmaker/matchmaker-header';
import { useMatchmakerConversation } from '@/hooks/use-matchmaker';
import { getMatchmakerVisualState, getCandidateFromMessage } from '@/lib/matchmaker/conversation-ui';

interface MatchmakerHomeShellProps {
  conversationEnabled?: boolean;
}

export function MatchmakerHomeShell({ conversationEnabled = true }: MatchmakerHomeShellProps) {
  const insets = useSafeAreaInsets();
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
    <MatchmakerHeaderScrollProvider>
      <View style={styles.wrap}>
        <MatchmakerHomeBackground />
        <View style={styles.content}>
          <MatchmakerConversation
            conversation={conversation}
            topInset={getMatchmakerFloatingHeaderHeight(insets.top)}
          />
          <MatchmakerTopFade topInset={insets.top} />
          <View pointerEvents="box-none" style={styles.headerHost}>
            <MatchmakerHeader
              session={conversation.data?.session ?? null}
              visualState={visualState}
              candidateFirstName={candidateFirstName}
            />
          </View>
        </View>
      </View>
    </MatchmakerHeaderScrollProvider>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minHeight: 0,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    minHeight: 0,
    zIndex: 1,
  },
  headerHost: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
});
