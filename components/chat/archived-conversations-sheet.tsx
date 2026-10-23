/* Reanimated gesture shared values are mutable by design. */
/* eslint-disable react-hooks/immutability */
import React from 'react';
import {
    View,
    Modal,
    StyleSheet,
    Pressable,
    Dimensions,
    FlatList,
    Alert,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { CachedImage } from '@/components/ui/cached-image';
import { useTheme } from '@/hooks/use-theme';
import type { Conversation } from '@/hooks/use-conversations';
import { getRelativeTime } from '@/lib/messaging/format-time';
import { Ionicons } from '@expo/vector-icons';
import { Archive, Trash, ArrowCounterClockwise } from 'phosphor-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
    useReducedMotion,
    runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { MOTION, RADIUS } from '@/lib/design-tokens';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const OPEN_EASING = Easing.out(Easing.cubic);
const CLOSE_EASING = Easing.inOut(Easing.cubic);

interface ArchivedConversationsSheetProps {
    visible: boolean;
    onClose: () => void;
    archivedConversations: Conversation[];
    onConversationPress: (conversation: Conversation) => void;
    onUnarchive: (conversation: Conversation) => void;
    onDelete: (conversation: Conversation) => void;
}

export function ArchivedConversationsSheet({
    visible,
    onClose,
    archivedConversations,
    onConversationPress,
    onUnarchive,
    onDelete,
}: ArchivedConversationsSheetProps) {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const reducedMotion = useReducedMotion();
    const translateY = useSharedValue(SCREEN_HEIGHT);
    const backdropOpacity = useSharedValue(0);

    React.useEffect(() => {
        if (visible) {
            translateY.value = reducedMotion ? 0 : withTiming(0, { duration: MOTION.medium, easing: OPEN_EASING });
            backdropOpacity.value = reducedMotion ? 1 : withTiming(1, { duration: MOTION.short });
        } else {
            translateY.value = SCREEN_HEIGHT;
            backdropOpacity.value = 0;
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible, reducedMotion]);

    const closeSheet = () => {
        if (reducedMotion) {
            onClose();
            return;
        }
        backdropOpacity.value = withTiming(0, { duration: MOTION.short });
        translateY.value = withTiming(SCREEN_HEIGHT, { duration: MOTION.short, easing: CLOSE_EASING }, (finished) => {
            if (finished) runOnJS(onClose)();
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
                backdropOpacity.value = withTiming(0, { duration: MOTION.short });
                translateY.value = withTiming(SCREEN_HEIGHT, { duration: MOTION.short, easing: CLOSE_EASING }, (finished) => {
                    if (finished) runOnJS(onClose)();
                });
            } else {
                translateY.value = withTiming(0, { duration: MOTION.short, easing: OPEN_EASING });
            }
        });

    const sheetStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: backdropOpacity.value,
    }));

    const renderItem = ({ item }: { item: Conversation }) => {
        const partnerName = item.partner.name || 'Unknown';
        const avatarUri = item.partner.image;

        const initial = partnerName.charAt(0).toUpperCase();
        const lastMessageText = item.lastMessage?.content || 'No messages';
        const lastMessageTime = item.lastMessage?.createdAt
            ? getRelativeTime(item.lastMessage.createdAt)
            : getRelativeTime(item.createdAt);

        return (
            <View>
                <Pressable
                    style={[
                        styles.conversationItem,
                        { backgroundColor: colors.control }
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
                                style={[styles.conversationName, { color: colors.foreground }]}
                                numberOfLines={1}
                            >
                                {partnerName}
                            </Text>
                            <Text style={[styles.conversationTime, { color: colors.mutedForeground }]}>
                                {lastMessageTime}
                            </Text>
                        </View>
                        <Text
                            style={[styles.conversationPreview, { color: colors.mutedForeground }]}
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
                                    Alert.alert('Remove from inbox', `Remove your conversation with ${partnerName} from this device? The message history stays available if a new message arrives.`, [
                                        { text: 'Cancel', style: 'cancel' },
                                        { text: 'Remove', style: 'destructive', onPress: () => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                            onDelete(item);
                                        } },
                                    ]);
                                }}
                            >
                                <Trash size={16} color="#ef4444" weight="bold" />
                                <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>Remove</Text>
                            </Pressable>
                        </View>
                    </View>
                </Pressable>
            </View>
        );
    };

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <View style={[
                styles.emptyIcon,
                { backgroundColor: colors.control }
            ]}>
                <Archive size={48} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                Nothing archived yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                Archived chats will appear here when you archive them
            </Text>
        </View>
    );

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={closeSheet}>
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
                                backgroundColor: colors.sheet,
                                paddingBottom: insets.bottom + 20,
                            },
                            sheetStyle,
                        ]}
                    >
                        {/* Handle */}
                        <View style={styles.handleContainer}>
                            <View style={[
                                styles.handle,
                                { backgroundColor: colors.controlBorder }
                            ]} />
                        </View>

                        {/* Header */}
                        <View style={styles.header}>
                            <View style={styles.headerLeft}>
                                <Archive size={24} color={colors.foreground} weight="fill" />
                                <Text style={[styles.headerTitle, { color: colors.foreground }]}>
                                    Archived Conversations
                                </Text>
                            </View>
                            <Pressable
                                style={[
                                    styles.closeButton,
                                    { backgroundColor: colors.control }
                                ]}
                                onPress={closeSheet}
                            >
                                <Ionicons name="close" size={20} color={colors.foreground} />
                            </Pressable>
                        </View>

                        {archivedConversations.length > 0 && (
                            <Text style={[styles.countText, { color: colors.mutedForeground }]}>
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
        ...StyleSheet.absoluteFill,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        maxHeight: SCREEN_HEIGHT * 0.85,
        borderTopLeftRadius: RADIUS.sheet,
        borderTopRightRadius: RADIUS.sheet,
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
