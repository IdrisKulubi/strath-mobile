import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
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
    const displayNotes = notes
        .filter((n) => n.isApproved !== false)
        .slice(0, 3);
    const hasNotes = displayNotes.length > 0;

    if (!hasNotes && !onHypePress) return null;

    return (
        <Animated.View
            entering={FadeInDown.delay(360).springify().damping(14)}
            style={[
                styles.card,
                {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                    borderColor: isDark ? 'rgba(233,30,140,0.2)' : 'rgba(233,30,140,0.12)',
                },
                !isDark && styles.cardShadow,
            ]}
        >
            <LinearGradient
                colors={isDark ? ['rgba(233,30,140,0.08)', 'transparent'] : ['rgba(233,30,140,0.04)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientBg}
            >
                <View style={styles.header}>
                    <View style={[styles.iconWrap, { backgroundColor: isDark ? 'rgba(233,30,140,0.25)' : 'rgba(233,30,140,0.12)' }]}>
                        <Ionicons name="people" size={18} color={colors.primary} />
                    </View>
                    <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                        What your people say
                    </Text>
                </View>
                {hasNotes ? (
                    <View style={styles.notesList}>
                        {displayNotes.map((note) => (
                            <View
                                key={note.id}
                                style={[
                                    styles.noteCard,
                                    {
                                        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                                        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                    },
                                ]}
                            >
                                <Text style={[styles.quoteMark, { color: colors.primary }]}>"</Text>
                                <Text style={[styles.noteText, { color: colors.foreground }]}>
                                    {note.content}
                                </Text>
                                {note.authorName && (
                                    <Text style={[styles.author, { color: colors.mutedForeground }]}>
                                        — {note.authorName}
                                    </Text>
                                )}
                            </View>
                        ))}
                    </View>
                ) : (
                    <Pressable
                        onPress={onHypePress}
                        style={({ pressed }) => [
                            styles.emptyCta,
                            {
                                backgroundColor: isDark ? 'rgba(233,30,140,0.15)' : 'rgba(233,30,140,0.08)',
                                borderColor: isDark ? 'rgba(233,30,140,0.3)' : 'rgba(233,30,140,0.2)',
                                opacity: pressed ? 0.9 : 1,
                            },
                        ]}
                    >
                        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                            Get friends to vouch for you
                        </Text>
                        <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                            They don't need the app — quick link, 3 questions
                        </Text>
                        <View style={styles.emptyRow}>
                            <Text style={[styles.emptyLink, { color: colors.primary }]}>Open Hype Me</Text>
                            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
                        </View>
                    </Pressable>
                )}
            </LinearGradient>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    card: {
        marginHorizontal: 20,
        marginBottom: 16,
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
    },
    cardShadow: {
        shadowColor: '#e91e8c',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 4,
    },
    gradientBg: {
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 14,
    },
    iconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.8,
    },
    notesList: {
        gap: 12,
    },
    noteCard: {
        borderRadius: 14,
        borderWidth: 1,
        padding: 14,
        gap: 4,
    },
    quoteMark: {
        fontSize: 24,
        fontWeight: '700',
        lineHeight: 20,
        marginBottom: -4,
    },
    noteText: {
        fontSize: 14,
        lineHeight: 20,
        fontStyle: 'italic',
    },
    author: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 2,
    },
    emptyCta: {
        borderRadius: 14,
        borderWidth: 1,
        padding: 16,
        gap: 8,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    emptySub: {
        fontSize: 13,
        lineHeight: 18,
    },
    emptyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    emptyLink: {
        fontSize: 14,
        fontWeight: '600',
    },
});
