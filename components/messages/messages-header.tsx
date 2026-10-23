import React from 'react';
import { View, StyleSheet, Pressable, TextInput } from 'react-native';
import { Archive, MagnifyingGlass, ChatCircleDots } from 'phosphor-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { SPACING, RADIUS, TYPOGRAPHY } from '@/lib/design-tokens';
import { useTheme } from '@/hooks/use-theme';

interface MessagesHeaderProps {
    count: number;
    showSearch: boolean;
    searchQuery: string;
    archivedCount: number;
    onToggleSearch: () => void;
    onSearchChange: (value: string) => void;
    onOpenArchived: () => void;
}

export function MessagesHeader({
    count,
    showSearch,
    searchQuery,
    archivedCount,
    onToggleSearch,
    onSearchChange,
    onOpenArchived,
}: MessagesHeaderProps) {
    const { colors } = useTheme();

    return (
        <View style={styles.header}>
            <View style={styles.headerTop}>
                <View style={styles.titleRow}>
                    <View style={[styles.iconWrap, { backgroundColor: colors.muted }]}>
                        <ChatCircleDots size={20} color={colors.primary} weight="fill" />
                    </View>
                    <Text variant="h3" style={{ color: colors.foreground }}>
                        Messages
                    </Text>
                </View>

                <View style={styles.actions}>
                    {archivedCount > 0 && (
                        <Pressable
                            style={[styles.actionBtn, { backgroundColor: colors.muted }]}
                            onPress={onOpenArchived}
                            accessibilityLabel="Archived conversations"
                        >
                            <Archive size={20} color={colors.mutedForeground} />
                            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                                <Text style={[styles.badgeText, { color: colors.primaryForeground }]}>
                                    {archivedCount}
                                </Text>
                            </View>
                        </Pressable>
                    )}
                    <Pressable
                        style={[styles.actionBtn, { backgroundColor: colors.muted }]}
                        onPress={onToggleSearch}
                        accessibilityLabel="Search messages"
                    >
                        <MagnifyingGlass size={20} color={colors.mutedForeground} />
                    </Pressable>
                </View>
            </View>

            {count > 0 && !showSearch && (
                <Animated.View entering={FadeIn}>
                    <Text variant="caption" style={{ color: colors.mutedForeground, marginTop: SPACING.tight }}>
                        {count === 1 ? '1 match' : `${count} matches`}
                    </Text>
                </Animated.View>
            )}

            {showSearch && (
                <Animated.View entering={FadeIn} style={{ marginTop: SPACING.compact }}>
                    <View style={[styles.searchWrap, { backgroundColor: colors.muted }]}>
                        <MagnifyingGlass size={18} color={colors.mutedForeground} />
                        <TextInput
                            style={[styles.searchInput, { color: colors.foreground }]}
                            placeholder="Search by name"
                            placeholderTextColor={colors.mutedForeground}
                            value={searchQuery}
                            onChangeText={onSearchChange}
                            autoFocus
                        />
                    </View>
                </Animated.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: SPACING.screenX,
        paddingTop: SPACING.base,
        paddingBottom: SPACING.compact,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.compact,
    },
    iconWrap: {
        width: 40,
        height: 40,
        borderRadius: RADIUS.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actions: {
        flexDirection: 'row',
        gap: SPACING.tight,
    },
    actionBtn: {
        width: 44,
        height: 44,
        borderRadius: RADIUS.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badge: {
        position: 'absolute',
        top: 4,
        right: 4,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    badgeText: {
        ...TYPOGRAPHY.label,
        fontSize: 10,
        fontWeight: '700',
    },
    searchWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.compact,
        paddingVertical: SPACING.compact,
        borderRadius: RADIUS.lg,
        gap: SPACING.tight,
    },
    searchInput: {
        flex: 1,
        ...TYPOGRAPHY.body,
        padding: 0,
    },
});
