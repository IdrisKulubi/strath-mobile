import React from 'react';
import {
    View,
    Modal,
    StyleSheet,
    Pressable,
    Dimensions,
    FlatList,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { CachedImage } from '@/components/ui/cached-image';
import { useTheme } from '@/hooks/use-theme';
import { Match, getRelativeTime } from '@/hooks/use-matches';
import { Ionicons } from '@expo/vector-icons';
import { Archive, Trash, ArrowCounterClockwise } from 'phosphor-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    runOnJS,
    FadeIn,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ArchivedConversationsSheetProps {
    visible: boolean;
    onClose: () => void;
    archivedConversations: Match[];
    onConversationPress: (match: Match) => void;
    onUnarchive: (match: Match) => void;
    onDelete: (match: Match) => void;
}

export function ArchivedConversationsSheet({
    visible,
    onClose,
    archivedConversations,
    onConversationPress,
    onUnarchive,
    onDelete,
}: ArchivedConversationsSheetProps) {
    const { isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const translateY = useSharedValue(SCREEN_HEIGHT);

    React.useEffect(() => {
        if (visible) {
            translateY.value = withSpring(0, { damping: 25, stiffness: 300 });
        } else {
            translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    const closeSheet = () => {
        translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 }, () => {
            runOnJS(onClose)();
        });
    };

    const panGesture = Gesture.Pan()
        .onUpdate((event) => {
            if (event.translationY > 0) {
                translateY.value = event.translationY;
            }
        })
        .onEnd((event) => {
            if (event.translationY > 100 || event.velocityY > 500) {
                closeSheet();
            } else {
                translateY.value = withSpring(0, { damping: 25, stiffness: 300 });
            }
        });

    const sheetStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: withTiming(visible ? 1 : 0, { duration: 200 }),
    }));

    const renderItem = ({ item, index }: { item: Match; index: number }) => {
        const partnerName = item.partner.name ||
            (item.partner.profile?.firstName
                ? `${item.partner.profile.firstName} ${item.partner.profile.lastName || ''}`.trim()
                : 'Unknown');

        const avatarUri = item.partner.image ||
            item.partner.profile?.profilePhoto ||
            (item.partner.profile?.photos?.[0]);

        const initial = partnerName.charAt(0).toUpperCase();
        const lastMessageText = item.lastMessage?.content || 'No messages';
        const lastMessageTime = item.lastMessage?.createdAt
            ? getRelativeTime(item.lastMessage.createdAt)
            : getRelativeTime(item.createdAt);

        return (
            <Animated.View entering={FadeIn.delay(index * 50)}>
                <Pressable
                    style={[
                        styles.conversationItem,
                        { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc' }
                    ]}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onConversationPress(item);
                    }}
                >
                    {/* Avatar */}
                    <View style={styles.avatarContainer}>
                        {avatarUri ? (
                            <CachedImage uri={avatarUri} style={styles.avatar} fallbackType="avatar" />
                        ) : (
                            <LinearGradient
                                colors={['#ec4899', '#f43f5e']}
                                style={styles.avatarPlaceholder}
                            >
                                <Text style={styles.avatarInitial}>{initial}</Text>
                            </LinearGradient>
                        )}
                    </View>

                    {/* Content */}
                    <View style={styles.conversationContent}>
                        <View style={styles.conversationHeader}>
                            <Text
                                style={[styles.conversationName, { color: isDark ? '#fff' : '#1a1a2e' }]}
                                numberOfLines={1}
                            >
                                {partnerName}
                            </Text>
                            <Text style={[styles.conversationTime, { color: isDark ? '#64748b' : '#9ca3af' }]}>
                                {lastMessageTime}
                            </Text>
                        </View>
                        <Text
                            style={[styles.conversationPreview, { color: isDark ? '#94a3b8' : '#6b7280' }]}
                            numberOfLines={1}
                        >
                            {lastMessageText}
                        </Text>

                        {/* Actions */}
                        <View style={styles.conversationActions}>
                            <Pressable
                                style={[
                                    styles.actionButton,
                                    { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)' }
                                ]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    onUnarchive(item);
                                }}
                            >
                                <ArrowCounterClockwise size={16} color="#10b981" weight="bold" />
                                <Text style={[styles.actionButtonText, { color: '#10b981' }]}>Unarchive</Text>
                            </Pressable>
                            <Pressable
                                style={[
                                    styles.actionButton,
                                    { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)' }
                                ]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    onDelete(item);
                                }}
                            >
                                <Trash size={16} color="#ef4444" weight="bold" />
                                <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>Delete</Text>
                            </Pressable>
                        </View>
                    </View>
                </Pressable>
            </Animated.View>
        );
    };

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <View style={[
                styles.emptyIcon,
                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)' }
            ]}>
                <Archive size={48} color={isDark ? '#64748b' : '#9ca3af'} />
            </View>
            <Text style={[styles.emptyTitle, { color: isDark ? '#fff' : '#1a1a2e' }]}>
                No archived conversations
            </Text>
            <Text style={[styles.emptySubtitle, { color: isDark ? '#64748b' : '#9ca3af' }]}>
                Swipe left on a conversation to archive it
            </Text>
        </View>
    );

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
            <GestureHandlerRootView style={styles.modalContainer}>
                {/* Backdrop */}
                <Animated.View style={[styles.backdrop, backdropStyle]}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} />
                </Animated.View>

                {/* Sheet */}
                <GestureDetector gesture={panGesture}>
                    <Animated.View
                        style={[
                            styles.sheet,
                            {
                                backgroundColor: isDark ? '#1a1a2e' : '#ffffff',
                                paddingBottom: insets.bottom + 20,
                            },
                            sheetStyle,
                        ]}
                    >
                        {/* Handle */}
                        <View style={styles.handleContainer}>
                            <View style={[
                                styles.handle,
                                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)' }
                            ]} />
                        </View>

                        {/* Header */}
                        <View style={styles.header}>
                            <View style={styles.headerLeft}>
                                <Archive size={24} color={isDark ? '#fff' : '#1a1a2e'} weight="fill" />
                                <Text style={[styles.headerTitle, { color: isDark ? '#fff' : '#1a1a2e' }]}>
                                    Archived Conversations
                                </Text>
                            </View>
                            <Pressable
                                style={[
                                    styles.closeButton,
                                    { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }
                                ]}
                                onPress={closeSheet}
                            >
                                <Ionicons name="close" size={20} color={isDark ? '#fff' : '#1a1a2e'} />
                            </Pressable>
                        </View>

                        {archivedConversations.length > 0 && (
                            <Text style={[styles.countText, { color: isDark ? '#64748b' : '#9ca3af' }]}>
                                {archivedConversations.length} archived {archivedConversations.length === 1 ? 'conversation' : 'conversations'}
                            </Text>
                        )}

                        {/* List */}
                        <FlatList
                            data={archivedConversations}
                            renderItem={renderItem}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={styles.listContent}
                            ListEmptyComponent={renderEmpty}
                            showsVerticalScrollIndicator={false}
                        />
                    </Animated.View>
                </GestureDetector>
            </GestureHandlerRootView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        maxHeight: SCREEN_HEIGHT * 0.85,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 16,
    },
    handleContainer: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 12,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    countText: {
        fontSize: 14,
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 20,
        flexGrow: 1,
    },
    conversationItem: {
        flexDirection: 'row',
        padding: 12,
        borderRadius: 16,
        marginBottom: 8,
        gap: 12,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    avatarPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitial: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
    },
    conversationContent: {
        flex: 1,
    },
    conversationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    conversationName: {
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
        marginRight: 8,
    },
    conversationTime: {
        fontSize: 12,
    },
    conversationPreview: {
        fontSize: 14,
        marginBottom: 10,
    },
    conversationActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 6,
    },
    actionButtonText: {
        fontSize: 13,
        fontWeight: '600',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        textAlign: 'center',
    },
});
