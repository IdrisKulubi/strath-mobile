import React, { useCallback, useRef, useEffect, useMemo } from 'react';
import {
    View,
    FlatList,
    StyleSheet,
    StatusBar,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from '@/hooks/use-theme';
import { useChat, Message } from '@/hooks/use-chat';
import { useMatches } from '@/hooks/use-matches';
import { MessageBubble, ChatInput, ChatHeader } from '@/components/chat';

import { SafetyToolkitModal } from '@/components/chat/safety-toolkit-modal';

export default function ChatScreen() {
    const { matchId } = useLocalSearchParams<{ matchId: string }>();
    const { colors, colorScheme } = useTheme();
    const flatListRef = useRef<FlatList>(null);
    const [isSafetyModalVisible, setIsSafetyModalVisible] = React.useState(false);

    const {
        messages,
        isInitialLoading,
        sendMessage,
        isSending,
        currentUserId,
    } = useChat(matchId || '');

    // Get partner info from matches
    const { data: matchesData } = useMatches();
    const currentMatch = matchesData?.matches?.find(m => m.id === matchId);
    const partner = currentMatch?.partner;

    // Track previous message count to know when new messages arrive
    const prevMessageCountRef = useRef(messages.length);

    // Scroll to bottom only when NEW messages arrive (not on every poll)
    useEffect(() => {
        if (messages.length > prevMessageCountRef.current && flatListRef.current) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
        prevMessageCountRef.current = messages.length;
    }, [messages.length]);

    const handleSend = useCallback((content: string) => {
        sendMessage(content);
    }, [sendMessage]);

    // Safety Actions
    const handleUnmatch = useCallback(() => {
        console.log('Unmatch');
        // Implement unmatch logic
    }, []);

    const handleBlock = useCallback(() => {
        console.log('Block');
        // Implement block logic
    }, []);

    const handleReport = useCallback(() => {
        console.log('Report');
        // Implement report logic
    }, []);

    const handleSafetyCenter = useCallback(() => {
        console.log('Safety Center');
        // Navigate to safety center
    }, []);

    // Memoize messages for stable reference in renderItem
    const messagesRef = useRef(messages);
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    const renderMessage = useCallback(({ item, index }: { item: Message; index: number }) => {
        const isOwn = item.senderId === currentUserId;
        // Access messages via ref to avoid dependency causing re-renders
        const prevMessages = messagesRef.current;
        const showTimestamp = index === 0 ||
            (index > 0 && prevMessages[index - 1] &&
                new Date(item.createdAt).getTime() - new Date(prevMessages[index - 1].createdAt).getTime() > 5 * 60 * 1000);

        return (
            <MessageBubble
                message={item}
                isOwn={isOwn}
                showTimestamp={showTimestamp}
            />
        );
    }, [currentUserId]); // Only depend on currentUserId, not messages

    const keyExtractor = useCallback((item: Message) => item.id, []);

    // Header component for the list (Matched date)
    const renderListHeader = useCallback(() => {
        if (!currentMatch) return null;
        const date = new Date(currentMatch.createdAt || Date.now());
        const dateString = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric', year: 'numeric' });

        return (
            <View style={styles.listHeader}>
                <Text style={styles.matchedText}>
                    YOU MATCHED WITH {partner?.profile?.firstName?.toUpperCase() || 'THEM'} ON {dateString}
                </Text>
            </View>
        );
    }, [currentMatch, partner]);

    // Loading state - only show skeletons on the VERY FIRST load when no messages exist
    if (isInitialLoading && messages.length === 0) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
                <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
                <ChatHeader
                    partnerName={partner?.name || 'Loading...'}
                    partnerImage={partner?.image}
                />
                <View style={styles.loadingContainer}>
                    {[1, 2, 3, 4, 5].map((i) => (
                        <View key={i} style={[styles.skeletonRow, i % 2 === 0 ? styles.skeletonRight : styles.skeletonLeft]}>
                            <Skeleton
                                width={i % 2 === 0 ? 200 : 150}
                                height={50}
                                borderRadius={18}
                            />
                        </View>
                    ))}
                </View>
            </SafeAreaView>
        );
    }

    // Empty state
    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            {renderListHeader()}
            <Text className="text-muted-foreground text-center text-base mt-8">
                No messages yet.{'\n'}Say hi to {partner?.name || 'your match'}! 👋
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

            <ChatHeader
                partnerName={partner?.name || 'Chat'}
                partnerImage={partner?.image}
                onMorePress={() => setIsSafetyModalVisible(true)}
            />

            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={0}
            >
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={keyExtractor}
                    contentContainerStyle={[
                        styles.messageList,
                        messages.length === 0 && styles.emptyList,
                    ]}
                    ListHeaderComponent={messages.length > 0 ? renderListHeader : undefined}
                    ListEmptyComponent={renderEmptyState}
                    showsVerticalScrollIndicator={false}
                    onContentSizeChange={() => {
                        if (messages.length > 0) {
                            flatListRef.current?.scrollToEnd({ animated: false });
                        }
                    }}
                />

                <ChatInput
                    onSend={handleSend}
                    isSending={isSending}
                    onMediaPress={() => console.log('Media')}
                    onGifPress={() => console.log('GIF')}
                    onMusicPress={() => console.log('Music')}
                />
            </KeyboardAvoidingView>

            <SafetyToolkitModal
                visible={isSafetyModalVisible}
                onClose={() => setIsSafetyModalVisible(false)}
                partnerName={partner?.name || 'User'}
                onUnmatch={handleUnmatch}
                onBlock={handleBlock}
                onReport={handleReport}
                onSafetyCenter={handleSafetyCenter}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    messageList: {
        paddingVertical: 16,
        flexGrow: 1,
    },
    emptyList: {
        justifyContent: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    loadingContainer: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 20,
        gap: 16,
    },
    skeletonRow: {
        flexDirection: 'row',
    },
    skeletonLeft: {
        justifyContent: 'flex-start',
    },
    skeletonRight: {
        justifyContent: 'flex-end',
    },
    listHeader: {
        paddingVertical: 24,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    matchedText: {
        color: '#636366',
        fontSize: 11,
        fontWeight: '600',
        textAlign: 'center',
        letterSpacing: 0.5,
    },
});
