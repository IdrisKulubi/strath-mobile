import React, { useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import type { Conversation } from '@/hooks/use-conversations';
import { ConversationCard } from './conversation-card';
import { Skeleton } from '@/components/ui/skeleton';
import { ChatCircleDots } from 'phosphor-react-native';

import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

interface ConversationsListProps {
    conversations: Conversation[];
    isLoading: boolean;
    isRefreshing: boolean;
    isError?: boolean;
    errorMessage?: string;
    onRefresh: () => void;
    onRetry?: () => void;
    onConversationPress: (conversation: Conversation) => void;
    onArchive?: (conversation: Conversation) => void;
    onDelete?: (conversation: Conversation) => void;
    onMute?: (conversation: Conversation) => void;
    onExplore?: () => void;
    mutedIds?: Set<string>;
}

// Skeleton loader for conversations
function ConversationSkeleton({ index }: { index: number }) {
    const { isDark } = useTheme();
    return (
        <Animated.View 
            entering={FadeInDown.delay(index * 50).duration(300)}
            style={[
                styles.skeletonCard,
                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc' }
            ]}
        >
            <Skeleton width={56} height={56} borderRadius={28} />
            <View style={styles.skeletonContent}>
                <View style={styles.skeletonRow}>
                    <Skeleton width={120} height={18} borderRadius={4} />
                    <Skeleton width={40} height={14} borderRadius={4} />
                </View>
                <Skeleton width={200} height={14} borderRadius={4} style={{ marginTop: 8 }} />
            </View>
        </Animated.View>
    );
}

// Empty state component
function EmptyState({ onExplore }: { onExplore?: () => void }) {
    const { colors, isDark } = useTheme();
    
    return (
        <Animated.View 
            entering={FadeIn.duration(500)}
            style={styles.emptyContainer}
        >
            <View style={[
                styles.emptyIconContainer,
                { backgroundColor: isDark ? 'rgba(236, 72, 153, 0.15)' : 'rgba(236, 72, 153, 0.1)' }
            ]}>
                <ChatCircleDots size={48} color={colors.primary} weight="duotone" />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                No messages yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                When you and someone are a mutual match, they&apos;ll appear here so you can chat.
            </Text>
        </Animated.View>
    );
}

function ErrorState({
    message,
    onRetry,
}: {
    message?: string;
    onRetry?: () => void;
}) {
    const { colors } = useTheme();

    return (
        <View style={styles.emptyContainer}>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                Couldn&apos;t load conversations
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                {message || 'Check your connection and try again.'}
            </Text>
            {onRetry ? (
                <Pressable
                    onPress={onRetry}
                    style={[styles.retryButton, { backgroundColor: colors.primary }]}
                >
                    <Text style={{ color: colors.primaryForeground, fontWeight: '600' }}>Retry</Text>
                </Pressable>
            ) : null}
        </View>
    );
}

export function ConversationsList({
    conversations,
    isLoading,
    isRefreshing,
    isError = false,
    errorMessage,
    onRefresh,
    onRetry,
    onConversationPress,
    onArchive,
    onDelete,
    onMute,
    onExplore,
    mutedIds = new Set(),
}: ConversationsListProps) {
    const { colors } = useTheme();

    const renderItem = useCallback(({ item, index }: { item: Conversation; index: number }) => (
        <Animated.View entering={FadeInDown.delay(index * 30).duration(300)}>
            <ConversationCard
                conversation={item}
                onPress={onConversationPress}
                onArchive={onArchive}
                onDelete={onDelete}
                onMute={onMute}
                isMuted={mutedIds.has(item.id)}
            />
        </Animated.View>
    ), [onConversationPress, onArchive, onDelete, onMute, mutedIds]);

    const keyExtractor = useCallback(
        (item: Conversation) => `${item.id}:${item.mutualMatchId}`,
        [],
    );

    const renderHeader = useCallback(() => {
        if (conversations.length === 0) return null;
        return (
            <View style={styles.listHeader}>
                <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
                    ← Swipe left for quick actions
                </Text>
            </View>
        );
    }, [conversations.length, colors.mutedForeground]);

    // Loading state
    if (isLoading && !isRefreshing && !isError) {
        return (
            <View style={styles.loadingContainer}>
                {[0, 1, 2, 3, 4].map((i) => (
                    <ConversationSkeleton key={i} index={i} />
                ))}
            </View>
        );
    }

    // Error state
    if (isError && conversations.length === 0) {
        return <ErrorState message={errorMessage} onRetry={onRetry ?? onRefresh} />;
    }

    // Empty state
    if (!isLoading && !isError && conversations.length === 0) {
        return <EmptyState onExplore={onExplore} />;
    }

    return (
        <FlatList
            data={conversations}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={renderHeader}
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl
                    refreshing={isRefreshing}
                    onRefresh={onRefresh}
                    tintColor={colors.primary}
                    colors={[colors.primary]}
                />
            }
            ItemSeparatorComponent={() => <View style={{ height: 4 }} />}
        />
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        paddingTop: 8,
    },
    skeletonCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        marginHorizontal: 16,
        marginVertical: 4,
        borderRadius: 16,
        gap: 12,
    },
    skeletonContent: {
        flex: 1,
    },
    skeletonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 12,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
    },
    listContent: {
        paddingTop: 4,
        paddingBottom: 100,
    },
    listHeader: {
        paddingHorizontal: 20,
        paddingVertical: 8,
    },
    hintText: {
        fontSize: 13,
        fontWeight: '500',
    },
    retryButton: {
        marginTop: 20,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24,
    },
});
