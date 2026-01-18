import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, StatusBar, Pressable, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { useMatches, Match } from '@/hooks/use-matches';
import { ConversationsList, ArchivedConversationsSheet } from '@/components/chat';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { ChatCircleDots, MagnifyingGlass, Archive, FunnelSimple } from 'phosphor-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

export default function ChatsScreen() {
    const { colors, colorScheme, isDark } = useTheme();
    const router = useRouter();

    const { data, isLoading, refetch } = useMatches();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    
    // Archive and mute state management
    const [archivedIds, setArchivedIds] = useState<Set<string>>(new Set());
    const [mutedIds, setMutedIds] = useState<Set<string>>(new Set());
    const [showArchivedSheet, setShowArchivedSheet] = useState(false);

    // Filter to only show matches with messages (excluding archived)
    const allConversations = useMemo(() => {
        return (data?.matches?.filter(m => m.lastMessage && !archivedIds.has(m.id)) ?? []);
    }, [data?.matches, archivedIds]);
    
    // Get archived conversations
    const archivedConversations = useMemo(() => {
        return (data?.matches?.filter(m => m.lastMessage && archivedIds.has(m.id)) ?? []);
    }, [data?.matches, archivedIds]);
    
    // Apply search filter
    const conversations = searchQuery 
        ? allConversations.filter(m => {
            const name = m.partner.name || m.partner.profile?.firstName || '';
            return name.toLowerCase().includes(searchQuery.toLowerCase());
        })
        : allConversations;

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await refetch();
        setIsRefreshing(false);
    }, [refetch]);

    const handleConversationPress = useCallback((match: Match) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push({ pathname: '/chat/[matchId]', params: { matchId: match.id } } as any);
    }, [router]);

    const handleExplore = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/(tabs)');
    }, [router]);

    const handleArchive = useCallback((match: Match) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setArchivedIds(prev => new Set([...prev, match.id]));
    }, []);

    const handleUnarchive = useCallback((match: Match) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setArchivedIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(match.id);
            return newSet;
        });
    }, []);

    const handleDelete = useCallback((match: Match) => {
        Alert.alert(
            'Delete Conversation',
            `Are you sure you want to delete your conversation with ${match.partner.name || match.partner.profile?.firstName}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        // Remove from archived if present
                        setArchivedIds(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(match.id);
                            return newSet;
                        });
                        // TODO: Implement delete API
                    }
                }
            ]
        );
    }, []);

    const handleMute = useCallback((match: Match) => {
        const isMuted = mutedIds.has(match.id);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        
        setMutedIds(prev => {
            const newSet = new Set(prev);
            if (isMuted) {
                newSet.delete(match.id);
            } else {
                newSet.add(match.id);
            }
            return newSet;
        });
    }, [mutedIds]);

    const toggleSearch = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowSearch(!showSearch);
        if (showSearch) {
            setSearchQuery('');
        }
    };

    return (
        <SafeAreaView
            style={[styles.container, { backgroundColor: colors.background }]}
            edges={['top']}
        >
            <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View style={styles.headerTitleRow}>
                        <LinearGradient
                            colors={['#ec4899', '#f43f5e']}
                            style={styles.headerIcon}
                        >
                            <ChatCircleDots size={18} color="#fff" weight="fill" />
                        </LinearGradient>
                        <Text style={[styles.headerTitle, { color: isDark ? '#fff' : '#1a1a2e' }]}>
                            Chats
                        </Text>
                    </View>
                    
                    <View style={styles.headerButtonsRow}>
                        {/* Archive Button */}
                        {archivedConversations.length > 0 && (
                            <Pressable
                                style={[
                                    styles.actionButton,
                                    { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }
                                ]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setShowArchivedSheet(true);
                                }}
                            >
                                <Archive size={20} color={isDark ? '#94a3b8' : '#6b7280'} />
                                <View style={styles.archiveBadge}>
                                    <Text style={styles.archiveBadgeText}>{archivedConversations.length}</Text>
                                </View>
                            </Pressable>
                        )}
                        
                        {/* Search Button */}
                        <Pressable
                            style={[
                                styles.actionButton,
                                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }
                            ]}
                            onPress={toggleSearch}
                        >
                            <MagnifyingGlass size={20} color={isDark ? '#94a3b8' : '#6b7280'} />
                        </Pressable>
                    </View>
                </View>
                
                {conversations.length > 0 && !showSearch && (
                    <Animated.View entering={FadeIn}>
                        <Text style={[styles.headerSubtitle, { color: isDark ? '#94a3b8' : '#6b7280' }]}>
                            {conversations.length} {conversations.length === 1 ? 'conversation' : 'conversations'}
                        </Text>
                    </Animated.View>
                )}

                {/* Search Input */}
                {showSearch && (
                    <Animated.View entering={FadeIn} style={styles.searchContainer}>
                        <View style={[
                            styles.searchInputWrapper,
                            { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)' }
                        ]}>
                            <MagnifyingGlass size={18} color={isDark ? '#64748b' : '#9ca3af'} />
                            <TextInput
                                style={[styles.searchInput, { color: isDark ? '#fff' : '#1a1a2e' }]}
                                placeholder="Search conversations..."
                                placeholderTextColor={isDark ? '#64748b' : '#9ca3af'}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoFocus
                            />
                        </View>
                    </Animated.View>
                )}
            </View>

            {/* Conversations List */}
            <View style={styles.listContainer}>
                <ConversationsList
                    conversations={conversations}
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

            {/* Archived Conversations Sheet */}
            <ArchivedConversationsSheet
                visible={showArchivedSheet}
                onClose={() => setShowArchivedSheet(false)}
                archivedConversations={archivedConversations}
                onConversationPress={(match) => {
                    setShowArchivedSheet(false);
                    handleConversationPress(match);
                }}
                onUnarchive={handleUnarchive}
                onDelete={handleDelete}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 12,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    headerButtonsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerIcon: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        lineHeight: 36,
    },
    headerSubtitle: {
        fontSize: 14,
        marginTop: 6,
        fontWeight: '500',
    },
    actionButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    archiveBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: '#ec4899',
        borderRadius: 8,
        minWidth: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    archiveBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    },
    searchContainer: {
        marginTop: 12,
    },
    searchInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 14,
        gap: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        padding: 0,
    },
    listContainer: {
        flex: 1,
    },
});
