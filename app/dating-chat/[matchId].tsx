import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Heart } from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChatHeader, ChatInput, MessageBubble, SafetyToolkitModal } from '@/components/chat';
import { BlockReportModal } from '@/components/discover/block-report-modal';
import { useChat, type Message } from '@/hooks/use-chat';
import { findConversation, useConversations } from '@/hooks/use-conversations';
import { useTheme } from '@/hooks/use-theme';
import { HEIGHTS, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { useQuestionnaireMutation } from '@/lib/questionnaire';
import type { ReportReason } from '@/hooks/use-report';

export default function DatingConversationScreen() {
  const { matchId, partnerName, partnerPhoto } = useLocalSearchParams<{ matchId: string; partnerName?: string; partnerPhoto?: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<Message>>(null);
  const previousCount = useRef(0);
  const loadingOlder = useRef(false);
  const chat = useChat(matchId);
  const conversations = useConversations();
  const conversation = findConversation(conversations.data, matchId);
  const name = conversation?.partner.name ?? partnerName ?? 'Your match';
  const photo = conversation?.partner.image ?? partnerPhoto;
  const partnerId = conversation?.partner.id;
  const unmatch = useQuestionnaireMutation<{ removed: true }>('unmatch');
  const block = useQuestionnaireMutation<{ saved: true }>('block');
  const report = useQuestionnaireMutation<{ saved: true }>('report');
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState<unknown>(null);
  const [composerFocused, setComposerFocused] = useState(false);
  const [safetyVisible, setSafetyVisible] = useState(false);
  const [blockReportVisible, setBlockReportVisible] = useState(false);
  const [blockReportMode, setBlockReportMode] = useState<'block' | 'report'>('block');

  useEffect(() => {
    if (chat.messages.length > previousCount.current && !loadingOlder.current) {
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: previousCount.current > 0 }));
    }
    previousCount.current = chat.messages.length;
    loadingOlder.current = false;
  }, [chat.messages.length]);

  const send = useCallback((content: string) => {
    setSendError(null);
    chat.sendMessage(content, {
      onSuccess: () => setDraft(''),
      onError: setSendError,
    });
  }, [chat]);

  const loadEarlier = async () => {
    loadingOlder.current = true;
    await chat.loadOlderMessages();
  };

  const confirmUnmatch = () => {
    setSafetyVisible(false);
    setTimeout(() => Alert.alert('Unmatch', `End your match with ${name}? You will no longer be able to message each other.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Unmatch', style: 'destructive', onPress: () => {
        void unmatch.mutateAsync({ matchId }).then(() => router.replace('/dating/messages' as never)).catch((error) => {
          Alert.alert('Could not unmatch', error instanceof Error ? error.message : 'Please try again.');
        });
      } },
    ]), 300);
  };

  const openBlockReport = (mode: 'block' | 'report') => {
    if (!partnerId) {
      Alert.alert('Loading profile', 'Please try again once this conversation finishes loading.');
      return;
    }
    setBlockReportMode(mode);
    setSafetyVisible(false);
    setTimeout(() => setBlockReportVisible(true), 300);
  };

  const submitBlock = async () => {
    if (!partnerId) throw new Error('Profile unavailable. Please try again.');
    await block.mutateAsync({ targetId: partnerId });
  };

  const submitReport = async (reason: ReportReason, details?: string) => {
    if (!partnerId) throw new Error('Profile unavailable. Please try again.');
    await report.mutateAsync({ targetId: partnerId, reason: [reason.replaceAll('_', ' '), details].filter(Boolean).join(': ') });
  };

  const canCompose = chat.canSend && !chat.isInitialLoading && !chat.isAccessDenied && !chat.isError;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <ChatHeader
        partnerName={name}
        partnerImage={photo}
        onBackPress={() => router.replace('/dating/messages' as never)}
        onMorePress={() => setSafetyVisible(true)}
      />
      <KeyboardAvoidingView style={styles.body} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {chat.isInitialLoading ? <View style={styles.loading}><ActivityIndicator color={colors.primary} accessibilityLabel="Loading conversation" /></View> : null}
        {chat.isError && chat.messages.length === 0 ? <View style={styles.errorState}>
          <Text style={[TYPOGRAPHY.headline, { color: colors.foreground }]}>Couldn’t load this conversation</Text>
          <Text style={[TYPOGRAPHY.callout, styles.centered, { color: colors.mutedForeground }]}>{chat.error instanceof Error ? chat.error.message : 'Please try again.'}</Text>
          <Pressable accessibilityRole="button" onPress={() => { void chat.refetch(); }} style={[styles.retryButton, { backgroundColor: colors.control, borderColor: colors.controlBorder }]}>
            <Text style={[TYPOGRAPHY.callout, styles.bold, { color: colors.foreground }]}>Try again</Text>
          </Pressable>
        </View> : null}
        {chat.messages.length > 0 || (!chat.isInitialLoading && !chat.isError) ? (
          <FlatList
            ref={listRef}
            style={styles.list}
            data={chat.messages}
            keyExtractor={(message) => message.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.messageContent, chat.messages.length === 0 ? styles.emptyList : null]}
            ListHeaderComponent={chat.hasMoreMessages ? <Pressable accessibilityRole="button" onPress={() => { void loadEarlier(); }} style={[styles.earlierButton, { backgroundColor: colors.control }]}><Text style={[TYPOGRAPHY.callout, { color: colors.foreground }]}>Load earlier messages</Text></Pressable> : null}
            ListEmptyComponent={<View style={styles.emptyChat}>
              <Heart size={26} color={colors.primaryText} />
              <Text style={[TYPOGRAPHY.headline, { color: colors.foreground }]}>Start the conversation</Text>
              <Text style={[TYPOGRAPHY.callout, styles.centered, { color: colors.mutedForeground }]}>You and {name} liked each other. Say hello.</Text>
            </View>}
            renderItem={({ item }) => <MessageBubble message={item} isOwn={item.senderId === chat.currentUserId} />}
          />
        ) : null}
        {sendError ? <Text accessibilityRole="alert" style={[TYPOGRAPHY.caption, styles.sendError, { color: colors.destructive }]}>{sendError instanceof Error ? sendError.message : 'Could not send. Your message is still here. Try again.'}</Text> : null}
        <ChatInput
          value={draft}
          onChangeText={setDraft}
          onSend={send}
          clearOnSend={false}
          maxLength={2000}
          isSending={chat.isSending}
          disabled={!canCompose}
          placeholder={`Message ${name}`}
          bottomInset={composerFocused ? 0 : insets.bottom}
          onFocus={() => setComposerFocused(true)}
          onBlur={() => setComposerFocused(false)}
        />
      </KeyboardAvoidingView>
      <SafetyToolkitModal
        visible={safetyVisible}
        onClose={() => setSafetyVisible(false)}
        partnerName={name}
        onUnmatch={confirmUnmatch}
        onBlock={() => openBlockReport('block')}
        onReport={() => openBlockReport('report')}
        onSafetyCenter={() => router.push('/settings' as never)}
      />
      {partnerId ? <BlockReportModal
        visible={blockReportVisible}
        mode={blockReportMode}
        userId={partnerId}
        userName={name}
        onClose={() => setBlockReportVisible(false)}
        onSwitchMode={() => setBlockReportMode((mode) => mode === 'block' ? 'report' : 'block')}
        onBlockUser={submitBlock}
        onReportUser={submitReport}
        onSuccess={() => {
          setBlockReportVisible(false);
          if (blockReportMode === 'block') router.replace('/dating/messages' as never);
        }}
      /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { flex: 1 },
  list: { flex: 1 },
  messageContent: { paddingVertical: SPACING.base, flexGrow: 1 },
  emptyList: { justifyContent: 'center' },
  emptyChat: { alignItems: 'center', gap: SPACING.tight, paddingHorizontal: SPACING.section },
  centered: { textAlign: 'center' },
  bold: { fontWeight: '700' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.section, gap: SPACING.compact },
  retryButton: { minHeight: HEIGHTS.input, paddingHorizontal: SPACING.section, borderRadius: RADIUS.full, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  earlierButton: { alignSelf: 'center', minHeight: HEIGHTS.touchMin, paddingHorizontal: SPACING.base, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.base },
  sendError: { paddingHorizontal: SPACING.base, paddingVertical: SPACING.tight },
});
