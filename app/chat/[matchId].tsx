import React, { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import {
    View,
    FlatList,
    StyleSheet,
    StatusBar,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
    Alert,
    Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from '@/hooks/use-theme';
import { useChat, Message } from '@/hooks/use-chat';
import { useConversations, findConversation } from '@/hooks/use-conversations';
import { useUnmatch } from '@/hooks/use-unmatch';
import { MessageBubble, ChatInput, ChatHeader, ChatAccessGate } from '@/components/chat';
import { useMutualMatches, isChatThreadUnlocked, isChatThreadReadable } from '@/hooks/use-date-requests';
import { SafetyToolkitModal } from '@/components/chat/safety-toolkit-modal';
import { BlockReportModal } from '@/components/discover/block-report-modal';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    runOnJS,
    interpolate,
    Extrapolation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 100;
export default function ChatScreen() {
    const { matchId } = useLocalSearchParams<{ matchId: string }>();
    const { colors, colorScheme } = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const flatListRef = useRef<FlatList>(null);

    const [isSafetyModalVisible, setIsSafetyModalVisible] = useState(false);
    const [blockReportModalVisible, setBlockReportModalVisible] = useState(false);
    const [blockReportMode, setBlockReportMode] = useState<'block' | 'report'>('block');
    const [draftMessage, setDraftMessage] = useState('');
    const [isComposerFocused, setIsComposerFocused] = useState(false);

    const translateX = useSharedValue(0);

    const { mutate: unmatch } = useUnmatch();
    const { data: mutualDates = [], isLoading: mutualDatesLoading } = useMutualMatches();

    const mutualMatch = useMemo(
        () => mutualDates.find((m) => m.legacyMatchId === matchId),
        [mutualDates, matchId],
    );

    const chatReadable = !mutualMatch || isChatThreadReadable(mutualMatch);
    const chatSendable = mutualMatch
        ? isChatThreadUnlocked(mutualMatch)
        : true;

    const {
        messages,
        isInitialLoading,
        sendMessage,
        isSending,
        currentUserId,
        isAccessDenied,
        isError,
        error,
        refetch,
        canSend,
    } = useChat(matchId || '', {
        enabled: chatReadable,
        pausePolling: isComposerFocused,
    });

    const showFullAccessGate = !chatReadable || (isAccessDenied && !mutualMatch);
    const showSendGate = chatReadable && mutualMatch && !chatSendable;
    const composerDisabled = showFullAccessGate || !chatSendable || !canSend;

    useEffect(() => {
        setDraftMessage('');
    }, [matchId]);

    const { data: conversations } = useConversations();
    const thread = findConversation(conversations, matchId || '');
    const partner = thread
        ? {
              id: thread.partner.id,
              name: thread.partner.name,
              image: thread.partner.image ?? undefined,
          }
        : undefined;

    const prevMessageCountRef = useRef(messages.length);
    const isComposerFocusedRef = useRef(isComposerFocused);
    useEffect(() => {
        isComposerFocusedRef.current = isComposerFocused;
    }, [isComposerFocused]);

    useEffect(() => {
        if (
            messages.length > prevMessageCountRef.current
            && flatListRef.current
            && !isComposerFocusedRef.current
        ) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
        prevMessageCountRef.current = messages.length;
    }, [messages.length]);

    const handleSend = useCallback((content: string) => {
        sendMessage(content);
        setDraftMessage('');
    }, [sendMessage]);

    const goBack = useCallback(() => {
        router.back();
    }, [router]);

    const handleUnmatch = useCallback(() => {
        setIsSafetyModalVisible(false);

        Alert.alert(
            'Unmatch',
            `Are you sure you want to unmatch from ${partner?.name || 'this person'}?\n\nThis will:\n• Remove them from your matches\n• Delete all your messages\n• This action cannot be undone`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Unmatch',
                    style: 'destructive',
                    onPress: () => {
                        if (!matchId) return;

                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        unmatch(
                            { matchId },
                            {
                                onSuccess: () => {
                                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                    router.back();
                                },
                                onError: (err) => {
                                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                                    Alert.alert('Error', err.message || 'Failed to unmatch. Please try again.');
                                },
                            }
                        );
                    },
                },
            ]
        );
    }, [partner?.name, matchId, unmatch, router]);

    const handleBlock = useCallback(() => {
        setIsSafetyModalVisible(false);
        setBlockReportMode('block');
        setTimeout(() => {
            setBlockReportModalVisible(true);
        }, 300);
    }, []);

    const handleReport = useCallback(() => {
        setIsSafetyModalVisible(false);
        setBlockReportMode('report');
        setTimeout(() => {
            setBlockReportModalVisible(true);
        }, 300);
    }, []);

    const handleSafetyCenter = useCallback(() => {
        setIsSafetyModalVisible(false);
        Alert.alert('Safety Center', 'Safety Center coming soon! For now, you can block or report users if needed.');
    }, []);

    const handleBlockReportSuccess = useCallback(() => {
        router.back();
    }, [router]);

    const swipeGesture = Gesture.Pan()
        .activeOffsetX([20, SCREEN_WIDTH])
        .onUpdate((event) => {
            if (event.translationX > 0) {
                translateX.value = event.translationX;
            }
        })
        .onEnd((event) => {
            if (event.translationX > SWIPE_THRESHOLD && event.velocityX > 0) {
                runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
                translateX.value = withSpring(SCREEN_WIDTH, { damping: 20, stiffness: 200 }, () => {
                    runOnJS(goBack)();
                });
            } else {
                translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
            }
        });

    const screenStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: interpolate(
            translateX.value,
            [0, SCREEN_WIDTH],
            [0, 0.5],
            Extrapolation.CLAMP
        ),
    }));

    const messagesRef = useRef(messages);
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    const renderMessage = useCallback(({ item, index }: { item: Message; index: number }) => {
        const isOwn = item.senderId === currentUserId;
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
    }, [currentUserId]);

    const keyExtractor = useCallback((item: Message) => item.id, []);

    const renderListHeader = useCallback(() => {
        if (!thread) return null;
        const date = new Date(thread.createdAt);
        const dateString = date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'numeric',
            year: 'numeric',
        });

        return (
            <View style={styles.listHeader}>
                <View style={styles.matchedTextContainer}>
                    <Text style={[styles.matchedText, { color: colors.mutedForeground }]}>
                        YOU CONNECTED WITH {(partner?.name ?? 'them').toUpperCase()} ON {dateString}
                    </Text>
                </View>
            </View>
        );
    }, [thread, partner?.name, colors.mutedForeground]);

    const renderErrorState = () => (
        <View style={styles.emptyContainer}>
            <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: '600', textAlign: 'center', marginBottom: 8 }}>
                Couldn&apos;t load messages
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 15, textAlign: 'center', marginBottom: 16 }}>
                {error instanceof Error ? error.message : 'Check your connection and try again.'}
            </Text>
            <Pressable
                onPress={() => refetch()}
                style={[styles.retryButton, { backgroundColor: colors.primary }]}
            >
                <Text style={{ color: colors.primaryForeground, fontWeight: '600' }}>Retry</Text>
            </Pressable>
        </View>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <Text style={{ color: colors.mutedForeground, textAlign: 'center', fontSize: 16, marginTop: 32 }}>
                No messages yet.{'\n'}Say hi to {partner?.name || 'your connection'}! 👋
            </Text>
        </View>
    );

    const renderLoadingSkeleton = () => (
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
    );

    const renderMessageArea = () => {
        if (showFullAccessGate && mutualMatch) {
            return (
                <ChatAccessGate
                    match={mutualMatch}
                    partnerName={partner?.name ?? mutualMatch.withUser.firstName}
                    partnerImage={partner?.image ?? mutualMatch.withUser.profilePhoto}
                />
            );
        }

        if (showFullAccessGate && mutualDatesLoading) {
            return renderLoadingSkeleton();
        }

        if (showFullAccessGate) {
            return (
                <View style={styles.emptyContainer}>
                    <Text style={{ color: colors.foreground, textAlign: 'center', fontSize: 18, fontWeight: '600', marginBottom: 8 }}>
                        Confirm your date to message
                    </Text>
                    <Text style={{ color: colors.mutedForeground, textAlign: 'center', fontSize: 16 }}>
                        Open the Dates tab to confirm your meetup before chatting with{' '}
                        {partner?.name || 'your match'}.
                    </Text>
                </View>
            );
        }

        if (isInitialLoading && messages.length === 0) {
            return renderLoadingSkeleton();
        }

        if (isError && messages.length === 0) {
            return renderErrorState();
        }

        return (
            <>
                {isError ? (
                    <Pressable
                        onPress={() => refetch()}
                        style={[styles.errorBanner, { backgroundColor: colors.destructive }]}
                    >
                        <Text style={{ color: colors.primaryForeground, fontSize: 13, flex: 1 }}>
                            Couldn&apos;t refresh messages. Tap to retry.
                        </Text>
                    </Pressable>
                ) : null}

                {showSendGate && mutualMatch ? (
                    <View style={[styles.sendGateBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '600' }}>
                            Confirm your date to send messages
                        </Text>
                        <Text style={{ color: colors.mutedForeground, fontSize: 13, marginTop: 4 }}>
                            You can read messages below. Confirm on Dates to reply.
                        </Text>
                    </View>
                ) : null}

                <FlatList
                    ref={flatListRef}
                    style={styles.messageFlatList}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={keyExtractor}
                    contentContainerStyle={[
                        styles.messageList,
                        messages.length === 0 && !isError && styles.emptyList,
                    ]}
                    ListHeaderComponent={renderListHeader}
                    ListEmptyComponent={isError ? null : renderEmptyState}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                />
            </>
        );
    };

    const composerPlaceholder = showFullAccessGate || !chatSendable
        ? 'Confirm your date to message'
        : 'Type a message';

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <Animated.View
                style={[
                    StyleSheet.absoluteFill,
                    { backgroundColor: '#000' },
                    backdropStyle,
                ]}
                pointerEvents="none"
            />

            <GestureDetector gesture={swipeGesture}>
                <Animated.View style={[{ flex: 1 }, screenStyle]}>
                    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
                        <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

                        <ChatHeader
                            partnerName={partner?.name || (isInitialLoading ? 'Loading...' : 'Chat')}
                            partnerImage={partner?.image}
                            onMorePress={() => setIsSafetyModalVisible(true)}
                        />

                        <KeyboardAvoidingView
                            style={styles.keyboardView}
                            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                            keyboardVerticalOffset={0}
                        >
                            <View style={styles.messageArea}>
                                {renderMessageArea()}
                            </View>

                            <ChatInput
                                value={draftMessage}
                                onChangeText={setDraftMessage}
                                onSend={handleSend}
                                isSending={isSending}
                                disabled={composerDisabled}
                                placeholder={composerPlaceholder}
                                bottomInset={isComposerFocused ? 0 : insets.bottom}
                                onFocus={() => setIsComposerFocused(true)}
                                onBlur={() => setIsComposerFocused(false)}
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
                </Animated.View>
            </GestureDetector>

            {partner && (
                <BlockReportModal
                    visible={blockReportModalVisible}
                    mode={blockReportMode}
                    userId={partner.id}
                    userName={partner.name || 'User'}
                    onClose={() => setBlockReportModalVisible(false)}
                    onSuccess={handleBlockReportSuccess}
                    onSwitchMode={() => setBlockReportMode(prev => prev === 'block' ? 'report' : 'block')}
                />
            )}
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    messageArea: {
        flex: 1,
    },
    messageFlatList: {
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
        alignItems: 'stretch',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    matchedTextContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 4,
    },
    matchedText: {
        fontSize: 11,
        fontWeight: '600',
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    retryButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24,
    },
    errorBanner: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginHorizontal: 16,
        marginTop: 8,
        borderRadius: 8,
    },
    sendGateBanner: {
        marginHorizontal: 16,
        marginTop: 8,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
});
