import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, StatusBar, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { ConversationsList, ArchivedConversationsSheet } from '@/components/chat';
import { MessagesHeader } from '@/components/messages';
import { TabSwipeView } from '@/components/navigation/tab-swipe-view';
import { useTheme } from '@/hooks/use-theme';
import { useConversations, type Conversation } from '@/hooks/use-conversations';
import { useDailyMatches } from '@/hooks/use-daily-matches';
import { ActionRequiredBanner } from '@/components/attention/action-required-banner';

export default function ChatsScreen() {
    const { colors, colorScheme } = useTheme();
    const router = useRouter();

    const { data: conversations = [], isLoading, refetch } = useConversations();
    const dailyMatches = useDailyMatches();
    const activeHold = dailyMatches.data?.hold ?? null;
    const showConfirmBanner = Boolean(
        activeHold?.slotConfirmation?.needsSlotConfirmation
        && !activeHold?.slotConfirmation?.viewerSlotConfirmed
        && activeHold?.slotConfirmation?.confirmWindowOpen,
    );
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [archivedIds, setArchivedIds] = useState<Set<string>>(new Set());
    const [mutedIds, setMutedIds] = useState<Set<string>>(new Set());
    const [showArchivedSheet, setShowArchivedSheet] = useState(false);

    const allConversations = useMemo(
        () => conversations.filter((c) => !archivedIds.has(c.id)),
        [conversations, archivedIds],
    );

    const archivedConversations = useMemo(
        () => conversations.filter((c) => archivedIds.has(c.id)),
        [conversations, archivedIds],
    );

    const visibleConversations = useMemo(() => {
        if (!searchQuery.trim()) return allConversations;
        const q = searchQuery.toLowerCase();
        return allConversations.filter((c) =>
            c.partner.name.toLowerCase().includes(q),
        );
    }, [allConversations, searchQuery]);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await refetch();
        setIsRefreshing(false);
    }, [refetch]);

    const handleConversationPress = useCallback(
        (conversation: Conversation) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push({
                pathname: '/chat/[matchId]',
                params: { matchId: conversation.id },
            } as any);
        },
        [router],
    );

    const handleExplore = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/(tabs)');
    }, [router]);

    const handleArchive = useCallback((conversation: Conversation) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setArchivedIds((prev) => new Set([...prev, conversation.id]));
    }, []);

    const handleUnarchive = useCallback((conversation: Conversation) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setArchivedIds((prev) => {
            const next = new Set(prev);
            next.delete(conversation.id);
            return next;
        });
    }, []);

    const handleDelete = useCallback((conversation: Conversation) => {
        Alert.alert(
            'Delete conversation',
            `Remove your chat with ${conversation.partner.name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        setArchivedIds((prev) => {
                            const next = new Set(prev);
                            next.delete(conversation.id);
                            return next;
                        });
                    },
                },
            ],
        );
    }, []);

    const handleMute = useCallback((conversation: Conversation) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setMutedIds((prev) => {
            const next = new Set(prev);
            if (next.has(conversation.id)) {
                next.delete(conversation.id);
            } else {
                next.add(conversation.id);
            }
            return next;
        });
    }, []);

    const toggleSearch = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowSearch((open) => {
            if (open) setSearchQuery('');
            return !open;
        });
    }, []);

    return (
        <TabSwipeView route="/(tabs)/chats">
            <SafeAreaView
                style={[styles.container, { backgroundColor: colors.background }]}
                edges={['top']}
            >
                <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

                <MessagesHeader
                    count={allConversations.length}
                    showSearch={showSearch}
                    searchQuery={searchQuery}
                    archivedCount={archivedConversations.length}
                    onToggleSearch={toggleSearch}
                    onSearchChange={setSearchQuery}
                    onOpenArchived={() => setShowArchivedSheet(true)}
                />

                {showConfirmBanner && activeHold ? (
                    <ActionRequiredBanner
                        partnerFirstName={activeHold.partner.firstName ?? 'your match'}
                        slot={activeHold.slotConfirmation}
                        onPress={() => router.push('/(tabs)')}
                    />
                ) : null}

                <View style={styles.listContainer}>
                    <ConversationsList
                        conversations={visibleConversations}
                        isLoading={isLoading}
                        isRefreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        onConversationPress={handleConversationPress}
                        onArchive={handleArchive}
                        onDelete={handleDelete}
                        onMute={handleMute}
                        onExplore={handleExplore}
                        mutedIds={mutedIds}
                    />
                </View>

                <ArchivedConversationsSheet
                    visible={showArchivedSheet}
                    onClose={() => setShowArchivedSheet(false)}
                    archivedConversations={archivedConversations}
                    onConversationPress={(conversation) => {
                        setShowArchivedSheet(false);
                        handleConversationPress(conversation);
                    }}
                    onUnarchive={handleUnarchive}
                    onDelete={handleDelete}
                />
            </SafeAreaView>
        </TabSwipeView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    listContainer: {
        flex: 1,
    },
});
