import React from 'react';
import {
    View,
    Modal,
    StyleSheet,
    Pressable,
    Dimensions,
    FlatList,
    ActivityIndicator,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { Match } from '@/hooks/use-matches';
import { MatchCard } from './match-card';
import { Ionicons } from '@expo/vector-icons';
import { Archive, Trash } from 'phosphor-react-native';
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

interface ArchivedChatsSheetProps {
    visible: boolean;
    onClose: () => void;
    archivedMatches: Match[];
    isLoading: boolean;
    onMatchPress: (match: Match) => void;
    onUnarchive: (match: Match) => void;
    onDelete: (match: Match) => void;
}

export function ArchivedChatsSheet({
    visible,
    onClose,
    archivedMatches,
    isLoading,
    onMatchPress,
    onUnarchive,
    onDelete,
}: ArchivedChatsSheetProps) {
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

    const renderItem = ({ item, index }: { item: Match; index: number }) => (
        <Animated.View entering={FadeIn.delay(index * 50)}>
            <View style={styles.archivedItem}>
                <MatchCard
                    match={item}
                    onPress={onMatchPress}
                    showOptions={false}
                />
                <View style={styles.archivedActions}>
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
                        <Archive size={18} color="#10b981" weight="bold" />
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
                        <Trash size={18} color="#ef4444" weight="bold" />
                        <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>Delete</Text>
                    </Pressable>
                </View>
            </View>
        </Animated.View>
    );

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <View style={[
                styles.emptyIcon,
                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)' }
            ]}>
                <Archive size={48} color={isDark ? '#64748b' : '#9ca3af'} />
            </View>
            <Text style={[styles.emptyTitle, { color: isDark ? '#fff' : '#1a1a2e' }]}>
                No archived chats
            </Text>
            <Text style={[styles.emptySubtitle, { color: isDark ? '#64748b' : '#9ca3af' }]}>
                Long press a match to archive it
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
                                    Archived Chats
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

                        {archivedMatches.length > 0 && (
                            <Text style={[styles.countText, { color: isDark ? '#64748b' : '#9ca3af' }]}>
                                {archivedMatches.length} archived {archivedMatches.length === 1 ? 'chat' : 'chats'}
                            </Text>
                        )}

                        {/* Content */}
                        {isLoading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color="#ec4899" />
                            </View>
                        ) : (
                            <FlatList
                                data={archivedMatches}
                                renderItem={renderItem}
                                keyExtractor={(item) => item.id}
                                ListEmptyComponent={renderEmpty}
                                contentContainerStyle={[
                                    styles.listContent,
                                    archivedMatches.length === 0 && styles.emptyList
                                ]}
                                showsVerticalScrollIndicator={false}
                            />
                        )}
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
        minHeight: SCREEN_HEIGHT * 0.5,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 16,
    },
    handleContainer: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 8,
    },
    handle: {
        width: 40,
        height: 5,
        borderRadius: 3,
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
        gap: 10,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    countText: {
        fontSize: 13,
        fontWeight: '500',
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingBottom: 20,
    },
    emptyList: {
        flexGrow: 1,
    },
    archivedItem: {
        marginBottom: 8,
    },
    archivedActions: {
        flexDirection: 'row',
        gap: 10,
        paddingHorizontal: 20,
        marginTop: 8,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 12,
        gap: 6,
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    emptyIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        textAlign: 'center',
    },
});
