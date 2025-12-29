import React, { useCallback, useRef, useEffect, useState } from 'react';
import {
    View,
    FlatList,
    StyleSheet,
    StatusBar,
    ActivityIndicator,
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

export default function ChatScreen() {
    const { matchId } = useLocalSearchParams<{ matchId: string }>();
    const { colors, colorScheme } = useTheme();
    const flatListRef = useRef<FlatList>(null);

    const {
        messages,
        isLoading,
        sendMessage,
        isSending,
        currentUserId,
    } = useChat(matchId || '');

    // Get partner info from matches
    const { data: matchesData } = useMatches();
    const currentMatch = matchesData?.matches?.find(m => m.id === matchId);
    const partner = currentMatch?.partner;

    // Scroll to bottom on new messages
    useEffect(() => {
        if (messages.length > 0 && flatListRef.current) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages.length]);

    const handleSend = useCallback((content: string) => {
        sendMessage(content);
    }, [sendMessage]);

    const renderMessage = useCallback(({ item, index }: { item: Message; index: number }) => {
        const isOwn = item.senderId === currentUserId;
        // Show timestamp if first message or different day/time gap
        const showTimestamp = index === 0 ||
            (index > 0 &&
                new Date(item.createdAt).getTime() - new Date(messages[index - 1].createdAt).getTime() > 5 * 60 * 1000);

        return (
            <MessageBubble
                message={item}
                isOwn={isOwn}
                showTimestamp={showTimestamp}
            />
        );
    }, [currentUserId, messages]);

    const keyExtractor = useCallback((item: Message) => item.id, []);

    // Loading state
    if (isLoading && messages.length === 0) {
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
            <Text className="text-muted-foreground text-center text-base">
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
                />
            </KeyboardAvoidingView>
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
});
