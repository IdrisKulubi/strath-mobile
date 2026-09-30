import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Archive } from 'phosphor-react-native';

import { ArchivedConversationsSheet } from '@/components/chat/archived-conversations-sheet';
import { ConversationCard } from '@/components/chat/conversation-card';
import { Action, Copy, Feedback, Page } from '@/components/questionnaire/ui';
import { useConversationInbox } from '@/hooks/use-conversation-inbox';
import { useConversations, type Conversation } from '@/hooks/use-conversations';
import { useTheme } from '@/hooks/use-theme';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';

export default function MessagesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const conversations = useConversations();
  const inbox = useConversationInbox();
  const [showArchived, setShowArchived] = useState(false);

  const openConversation = useCallback((conversation: Conversation) => {
    setShowArchived(false);
    router.push({ pathname: '/dating-chat/[matchId]', params: { matchId: conversation.id } } as never);
  }, [router]);

  const active = inbox.ready ? (conversations.data ?? []).filter((item) => !inbox.isArchived(item) && !inbox.isRemoved(item)) : [];
  const archived = inbox.ready ? (conversations.data ?? []).filter((item) => inbox.isArchived(item)) : [];

  return (
    <Page title="Messages" floatingTabBar>
      <View style={styles.heading}>
        <Copy muted>Your matches, all in one place.</Copy>
        <Pressable accessibilityRole="button" accessibilityLabel={`Archived conversations, ${archived.length}`} onPress={() => setShowArchived(true)} style={[styles.archivedButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Archive size={18} color={colors.foreground} />
          <Text style={[styles.archivedText, { color: colors.foreground }]}>Archived{archived.length ? ` ${archived.length}` : ''}</Text>
        </Pressable>
      </View>
      {conversations.isLoading || !inbox.ready ? <ActivityIndicator accessibilityLabel="Loading conversations" color={colors.primary} /> : null}
      <Feedback error={conversations.error} />
      {conversations.isError ? <Action label="Try loading again" onPress={() => { void conversations.refetch(); }} /> : null}
      {!conversations.isLoading && !conversations.isError && inbox.ready && !active.length ? (
        <View style={[styles.empty, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[TYPOGRAPHY.title, { color: colors.foreground }]}>{archived.length ? 'Your inbox is clear' : 'No conversations yet'}</Text>
          <Copy muted>{archived.length ? 'Your archived chats are ready whenever you need them.' : 'When you and another person like each other, your conversation will appear here.'}</Copy>
          {archived.length ? <Action label="View archived chats" onPress={() => setShowArchived(true)} /> : null}
        </View>
      ) : null}
      <View style={styles.list}>
        {active.map((item) => <ConversationCard key={item.id} conversation={item} onPress={openConversation} onArchive={inbox.archive} onDelete={inbox.remove} />)}
      </View>
      {conversations.data?.length ? <Action label="Refresh conversations" tone="ghost" onPress={() => { void conversations.refetch(); }} /> : null}
      <ArchivedConversationsSheet visible={showArchived} onClose={() => setShowArchived(false)} archivedConversations={archived} onConversationPress={openConversation} onUnarchive={inbox.unarchive} onDelete={inbox.remove} />
    </Page>
  );
}

const styles = StyleSheet.create({
  heading: { gap: SPACING.compact, marginBottom: SPACING.compact },
  archivedButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40, paddingHorizontal: 14, borderWidth: 1, borderRadius: RADIUS.full },
  archivedText: { fontSize: 14, fontWeight: '600' },
  empty: { gap: SPACING.compact, borderWidth: 1, borderRadius: RADIUS.md, padding: SPACING.base },
  list: { marginHorizontal: -16 },
});
