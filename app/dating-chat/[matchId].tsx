import React, { useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Action, Copy, Feedback, Field, Loading } from '@/components/questionnaire/ui';
import { useChat } from '@/hooks/use-chat';
import { findConversation, useConversations } from '@/hooks/use-conversations';
import { useTheme } from '@/hooks/use-theme';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { useQuestionnaireMutation } from '@/lib/questionnaire';

export default function PreservedConversationScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const chat = useChat(matchId);
  const conversations = useConversations();
  const conversation = findConversation(conversations.data, matchId);
  const unmatch = useQuestionnaireMutation<{ removed: true }>('unmatch');
  const block = useQuestionnaireMutation<{ saved: true }>('block');
  const report = useQuestionnaireMutation<{ saved: true }>('report');
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState<unknown>(null);
  const [showSafety, setShowSafety] = useState(false);
  const [reason, setReason] = useState('');

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Action label="Back to messages" tone="ghost" onPress={() => router.replace('/dating/messages' as never)} />
        <Text accessibilityRole="header" style={[TYPOGRAPHY.title, { color: colors.foreground }]}>Conversation</Text>
        <Action label={showSafety ? 'Close safety options' : 'Safety and unmatch'} tone="ghost" onPress={() => setShowSafety((value) => !value)} />
        {showSafety ? (
          <View style={[styles.safety, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Copy>Unmatching ends access for both people. Blocking also removes this person from discovery. Message history is retained for safety.</Copy>
            <Action label={unmatch.isPending ? 'Unmatching…' : 'Unmatch'} tone="danger" disabled={unmatch.isPending} onPress={() => {
              void unmatch.mutateAsync({ matchId }).then(() => router.replace('/dating/messages' as never));
            }} />
            <Action label={block.isPending ? 'Blocking…' : 'Block'} tone="danger" disabled={!conversation?.partner.id || block.isPending} onPress={() => {
              if (!conversation?.partner.id) return;
              void block.mutateAsync({ targetId: conversation.partner.id }).then(() => router.replace('/dating/messages' as never));
            }} />
            <Field label="Report a concern" value={reason} onChangeText={setReason} multiline placeholder="Describe what happened" />
            <Action label={report.isSuccess ? 'Report submitted' : report.isPending ? 'Submitting…' : 'Submit report'} disabled={!conversation?.partner.id || !reason.trim() || report.isPending || report.isSuccess} onPress={() => {
              if (!conversation?.partner.id) return;
              void report.mutateAsync({ targetId: conversation.partner.id, reason: reason.trim() });
            }} />
          </View>
        ) : null}
        {chat.isInitialLoading ? <Loading label="Loading conversation" /> : null}
        <Feedback error={chat.isAccessDenied ? new Error('This conversation is no longer available.') : chat.error ?? sendError ?? unmatch.error ?? block.error ?? report.error} />
        {chat.isError ? <Action label="Try loading again" onPress={() => { void chat.refetch(); }} /> : null}
        <FlatList
          style={styles.list}
          data={chat.messages}
          keyExtractor={(message) => message.id}
          contentContainerStyle={styles.messages}
          ListHeaderComponent={chat.hasMoreMessages ? <Action label="Load earlier messages" onPress={() => { void chat.loadOlderMessages(); }} /> : null}
          renderItem={({ item }) => (
            <View style={[
              styles.bubble,
              { backgroundColor: item.senderId === chat.currentUserId ? colors.secondary : colors.card },
              item.senderId === chat.currentUserId ? styles.sent : styles.received,
            ]}>
              <Text style={[TYPOGRAPHY.body, { color: colors.foreground }]}>{item.content}</Text>
              <Text style={[TYPOGRAPHY.caption, { color: colors.mutedForeground }]}>
                {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {item.senderId === chat.currentUserId ? ` · ${item.status}` : ''}
              </Text>
            </View>
          )}
        />
        <TextInput
          accessibilityLabel="Message"
          placeholder="Write a message"
          placeholderTextColor={colors.mutedForeground}
          multiline
          value={draft}
          onChangeText={setDraft}
          maxLength={2000}
          style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card }]}
        />
        <Action
          label={chat.isSending ? 'Sending…' : 'Send'}
          tone="primary"
          disabled={!draft.trim() || chat.isSending || chat.isAccessDenied || !chat.canSend}
          onPress={() => {
            setSendError(null);
            chat.sendMessage(draft.trim(), { onSuccess: () => setDraft(''), onError: setSendError });
          }}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  page: { flex: 1, padding: SPACING.base, gap: SPACING.compact },
  list: { flex: 1 },
  messages: { gap: SPACING.compact, paddingVertical: SPACING.compact },
  bubble: { maxWidth: '88%', padding: SPACING.compact, borderRadius: RADIUS.md, gap: SPACING.micro },
  sent: { alignSelf: 'flex-end' },
  received: { alignSelf: 'flex-start' },
  input: { minHeight: 52, maxHeight: 150, padding: SPACING.compact, borderWidth: 1, borderRadius: RADIUS.md, ...TYPOGRAPHY.body },
  safety: { gap: SPACING.tight, borderWidth: 1, borderRadius: RADIUS.md, padding: SPACING.compact },
});
