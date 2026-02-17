import React from 'react';
import { View, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { useWeeklyDrop } from '@/hooks/use-weekly-drop';
import { ArrowLeft } from 'phosphor-react-native';

function formatDate(value: string) {
    const date = new Date(value);
    return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

export default function WeeklyDropHistoryScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { dropHistory, isHistoryLoading } = useWeeklyDrop();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={22} color={colors.foreground} weight="bold" />
                </Pressable>
                <Text style={[styles.title, { color: colors.foreground }]}>Weekly Drop History</Text>
                <View style={styles.backButton} />
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                {isHistoryLoading && (
                    <View style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#fff', borderColor: colors.border }]}>
                        <Text style={[styles.meta, { color: colors.mutedForeground }]}>Loading history...</Text>
                    </View>
                )}

                {!isHistoryLoading && dropHistory.length === 0 && (
                    <View style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#fff', borderColor: colors.border }]}>
                        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No past drops yet</Text>
                        <Text style={[styles.meta, { color: colors.mutedForeground }]}>Your expired weekly drops will appear here.</Text>
                    </View>
                )}

                {dropHistory.map((item) => (
                    <View
                        key={item.id}
                        style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#fff', borderColor: colors.border }]}
                    >
                        <View style={styles.rowBetween}>
                            <Text style={[styles.weekLabel, { color: colors.foreground }]}>Week {item.dropNumber}</Text>
                            <Text style={[styles.meta, { color: colors.mutedForeground }]}>{item.matchCount} matches</Text>
                        </View>

                        <Text style={[styles.meta, { color: colors.mutedForeground }]}>Delivered {item.deliveredAt ? formatDate(item.deliveredAt) : formatDate(item.createdAt)}</Text>

                        <View style={styles.previewRow}>
                            {item.previews.slice(0, 3).map((preview) => {
                                const image = preview.profilePhoto || preview.photos?.[0] || null;
                                return (
                                    <View key={preview.userId} style={styles.previewItem}>
                                        {image ? (
                                            <Image source={{ uri: image }} style={styles.avatar} />
                                        ) : (
                                            <View style={[styles.avatarFallback, { backgroundColor: colors.primary + '22' }]}>
                                                <Text style={[styles.avatarInitial, { color: colors.primary }]}>😊</Text>
                                            </View>
                                        )}
                                        <Text style={[styles.name, { color: colors.mutedForeground }]} numberOfLines={1}>
                                            {preview.firstName || 'Match'}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    backButton: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '800',
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        gap: 10,
    },
    card: {
        borderRadius: 14,
        borderWidth: 1,
        padding: 12,
        gap: 8,
    },
    rowBetween: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    weekLabel: {
        fontSize: 14,
        fontWeight: '800',
    },
    meta: {
        fontSize: 12,
        fontWeight: '600',
    },
    emptyTitle: {
        fontSize: 15,
        fontWeight: '700',
    },
    previewRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 2,
    },
    previewItem: {
        width: 64,
        alignItems: 'center',
        gap: 4,
    },
    avatar: {
        width: 46,
        height: 46,
        borderRadius: 23,
    },
    avatarFallback: {
        width: 46,
        height: 46,
        borderRadius: 23,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitial: {
        fontSize: 18,
        fontWeight: '700',
    },
    name: {
        fontSize: 11,
        fontWeight: '600',
    },
});
