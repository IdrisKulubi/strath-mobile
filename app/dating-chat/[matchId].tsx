import React, { useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Action, Feedback, Loading } from '@/components/questionnaire/ui';
import { useChat } from '@/hooks/use-chat';
import { useTheme } from '@/hooks/use-theme';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';

export default function PreservedConversationScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const chat = useChat(matchId);
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState<unknown>(null);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Action label="Back to messages" tone="ghost" onPress={() => router.replace('/dating/messages' as never)} />
        <Text accessibilityRole="header" style={[TYPOGRAPHY.title, { color: colors.foreground }]}>Conversation</Text>
        {chat.isInitialLoading ? <Loading label="Loading conversation" /> : null}
        <Feedback error={chat.isAccessDenied ? new Error('This conversation is no longer available.') : chat.error ?? sendError} />
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
});
