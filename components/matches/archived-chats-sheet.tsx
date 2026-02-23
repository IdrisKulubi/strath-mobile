import React from 'react';
import {
    View,
    Modal,
    StyleSheet,
    Pressable,
    FlatList,
    ActivityIndicator,
    TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { Match } from '@/hooks/use-matches';
import { MatchCard } from './match-card';
import { Archive, Trash, X } from 'phosphor-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

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

    const renderItem = ({ item, index }: { item: Match; index: number }) => (
        <Animated.View entering={FadeIn.delay(index * 40)}>
            <View style={styles.archivedItem}>
                <MatchCard match={item} onPress={onMatchPress} showOptions={false} />
                <View style={styles.archivedActions}>
                    <TouchableOpacity
                        activeOpacity={0.75}
                        style={[
                            styles.actionButton,
                            { backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)' },
                        ]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            onUnarchive(item);
                        }}
                    >
                        <Archive size={16} color="#10b981" weight="bold" />
                        <Text style={[styles.actionButtonText, { color: '#10b981' }]}>Unarchive</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        activeOpacity={0.75}
                        style={[
                            styles.actionButton,
                            { backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)' },
                        ]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            onDelete(item);
                        }}
                    >
                        <Trash size={16} color="#ef4444" weight="bold" />
                        <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>Delete</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Animated.View>
    );

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <View style={[
                styles.emptyIconBox,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
            ]}>
                <Archive size={40} color={isDark ? '#475569' : '#94a3b8'} />
            </View>
            <Text style={[styles.emptyTitle, { color: isDark ? '#fff' : '#1a1a2e' }]}>
                No archived chats
            </Text>
            <Text style={[styles.emptySubtitle, { color: isDark ? '#64748b' : '#94a3b8' }]}>
                Long press a match card to archive it
            </Text>
        </View>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <SafeAreaView
                style={[styles.root, { backgroundColor: isDark ? '#0f0d23' : '#f8fafc' }]}
                edges={['top', 'bottom']}
            >
                {/* Header */}
                <View style={[
                    styles.header,
                    {
                        backgroundColor: isDark ? '#0f0d23' : '#f8fafc',
                        borderBottomColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
                    },
                ]}>
                    <View style={styles.headerLeft}>
                        <View style={[
                            styles.headerIconBox,
                            { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' },
                        ]}>
                            <Archive size={18} color={isDark ? '#94a3b8' : '#6b7280'} weight="fill" />
                        </View>
                        <View>
                            <Text style={[styles.headerTitle, { color: isDark ? '#fff' : '#1a1a2e' }]}>
                                Archived Chats
                            </Text>
                            {archivedMatches.length > 0 && (
                                <Text style={[styles.headerCount, { color: isDark ? '#64748b' : '#94a3b8' }]}>
                                    {archivedMatches.length} {archivedMatches.length === 1 ? 'chat' : 'chats'}
                                </Text>
                            )}
                        </View>
                    </View>

                    <Pressable
                        onPress={onClose}
                        hitSlop={12}
                        style={({ pressed }) => ([
                            styles.closeButton,
                            {
                                backgroundColor: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.06)',
                                opacity: pressed ? 0.7 : 1,
                            },
                        ])}
                    >
                        <X size={18} color={isDark ? '#94a3b8' : '#6b7280'} weight="bold" />
                    </Pressable>
                </View>

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
                            archivedMatches.length === 0 && styles.emptyList,
                        ]}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    headerCount: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 1,
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },

    listContent: {
        paddingTop: 8,
        paddingBottom: 32,
    },
    emptyList: { flexGrow: 1 },

    archivedItem: { marginBottom: 4 },
    archivedActions: {
        flexDirection: 'row',
        gap: 10,
        paddingHorizontal: 16,
        paddingBottom: 10,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 14,
        gap: 6,
    },
    actionButtonText: {
        fontSize: 13,
        fontWeight: '700',
    },

    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyIconBox: {
        width: 80,
        height: 80,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 8,
        textAlign: 'center',
        letterSpacing: -0.3,
    },
    emptySubtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
});
