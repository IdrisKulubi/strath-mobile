import React, { useCallback } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Action, Copy, Feedback, Page } from '@/components/questionnaire/ui';
import { useConversations, type Conversation } from '@/hooks/use-conversations';
import { useTheme } from '@/hooks/use-theme';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';

export default function MessagesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const conversations = useConversations();

  const openConversation = useCallback((conversation: Conversation) => {
    router.push({ pathname: '/dating-chat/[matchId]', params: { matchId: conversation.id } } as never);
  }, [router]);

  return (
    <Page title="Messages">
      <Copy>Your existing conversations remain available while you complete your questionnaire.</Copy>
      {conversations.isLoading ? <ActivityIndicator accessibilityLabel="Loading conversations" color={colors.primary} /> : null}
      <Feedback error={conversations.error} />
      {conversations.isError ? <Action label="Try loading again" onPress={() => { void conversations.refetch(); }} /> : null}
      {!conversations.isLoading && !conversations.isError && !conversations.data?.length ? (
        <View style={[styles.empty, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[TYPOGRAPHY.title, { color: colors.foreground }]}>No conversations yet</Text>
          <Copy muted>Existing conversations will appear here. New questionnaire matches arrive in a later phase.</Copy>
          <Action label="Continue your questionnaire" tone="primary" onPress={() => router.push('/questions' as never)} />
        </View>
      ) : null}
      <View>
        {(conversations.data ?? []).map((item, index) => (
          <React.Fragment key={item.id}>
            {index > 0 ? <View style={[styles.separator, { backgroundColor: colors.border }]} /> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open conversation with ${item.partner.name}`}
            onPress={() => openConversation(item)}
            style={({ pressed }) => [styles.row, { opacity: pressed ? 0.72 : 1 }]}
          >
            {item.partner.image ? <Image source={{ uri: item.partner.image }} accessibilityLabel="" style={styles.avatar} /> : <View style={[styles.avatar, { backgroundColor: colors.muted }]} />}
            <View style={styles.details}>
              <View style={styles.rowHeading}>
                <Text numberOfLines={1} style={[TYPOGRAPHY.body, styles.name, { color: colors.foreground }]}>{item.partner.name}</Text>
                {item.unreadCount > 0 ? <Text accessibilityLabel={`${item.unreadCount} unread messages`} style={[styles.unread, { color: colors.primaryForeground, backgroundColor: colors.primary }]}>{item.unreadCount}</Text> : null}
              </View>
              <Text numberOfLines={1} style={[TYPOGRAPHY.caption, { color: colors.mutedForeground }]}>{item.lastMessage?.content ?? 'Open conversation'}</Text>
            </View>
          </Pressable>
          </React.Fragment>
        ))}
      </View>
      {conversations.data?.length ? <Action label="Refresh conversations" tone="ghost" onPress={() => { void conversations.refetch(); }} /> : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  empty: { gap: SPACING.compact, borderWidth: 1, borderRadius: RADIUS.md, padding: SPACING.base },
  row: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: SPACING.compact, paddingVertical: SPACING.compact },
  avatar: { width: 52, height: 52, borderRadius: RADIUS.full },
  details: { flex: 1, gap: SPACING.micro },
  rowHeading: { flexDirection: 'row', alignItems: 'center', gap: SPACING.tight },
  name: { flex: 1, fontWeight: '600' },
  unread: { minWidth: 24, textAlign: 'center', overflow: 'hidden', borderRadius: RADIUS.full, paddingHorizontal: SPACING.tight, paddingVertical: 2, ...TYPOGRAPHY.caption },
  separator: { height: StyleSheet.hairlineWidth },
});
