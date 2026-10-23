import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/ui/text';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { useTheme } from '@/hooks/use-theme';

export interface WingmanNote {
    id: string;
    content: string;
    authorName?: string;
    isApproved?: boolean;
}

interface WingmanNotesCardProps {
    notes: WingmanNote[];
    onHypePress?: () => void;
}

export function WingmanNotesCard({ notes, onHypePress }: WingmanNotesCardProps) {
    const { colors, isDark } = useTheme();
    const displayNotes = notes.filter((n) => n.isApproved !== false).slice(0, 3);
    const hasNotes = displayNotes.length > 0;

    if (!hasNotes && !onHypePress) return null;

    return (
        <Animated.View entering={FadeInDown.duration(280)} style={styles.section}>
            <Text style={[styles.title, { color: colors.mutedForeground }]}>Wingman notes</Text>

            <View
                style={[
                    styles.card,
                    {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                    },
                    !isDark && styles.cardShadowLight,
                ]}
            >
                {hasNotes ? (
                    <View style={styles.notesList}>
                        {displayNotes.map((note, index) => (
                            <View
                                key={note.id}
                                style={[
                                    styles.noteRow,
                                    index < displayNotes.length - 1 && {
                                        borderBottomWidth: StyleSheet.hairlineWidth,
                                        borderBottomColor: colors.border,
                                    },
                                ]}
                            >
                                <Text style={[styles.noteText, { color: colors.foreground }]}>
                                    {note.content}
                                </Text>
                                {note.authorName && (
                                    <Text variant="caption" style={{ color: colors.mutedForeground }}>
                                        {note.authorName}
                                    </Text>
                                )}
                            </View>
                        ))}
                    </View>
                ) : (
                    <Pressable
                        onPress={onHypePress}
                        style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
                    >
                        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                            Ask friends to vouch for you
                        </Text>
                        <Text variant="muted" style={{ color: colors.mutedForeground, marginTop: SPACING.tight }}>
                            They do not need the app. Send a quick link with three questions.
                        </Text>
                        <View style={styles.emptyRow}>
                            <Text style={{ color: colors.primary, fontWeight: '600' }}>Open Wingman</Text>
                            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                        </View>
                    </Pressable>
                )}
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    section: {
        paddingHorizontal: SPACING.screenX,
        paddingBottom: SPACING.section,
        gap: SPACING.compact,
    },
    title: {
        ...TYPOGRAPHY.label,
        fontWeight: '600',
    },
    card: {
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        padding: SPACING.base,
    },
    cardShadowLight: {
        shadowColor: '#1C1524',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    notesList: {
        gap: 0,
    },
    noteRow: {
        paddingVertical: SPACING.compact,
        gap: SPACING.micro,
    },
    noteText: {
        ...TYPOGRAPHY.callout,
        lineHeight: 22,
    },
    emptyTitle: {
        ...TYPOGRAPHY.headline,
    },
    emptyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.micro,
        marginTop: SPACING.compact,
    },
});
