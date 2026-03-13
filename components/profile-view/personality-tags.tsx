import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';

const TAG_ICONS: Record<string, string> = {
    'Night owl': '🌙',
    'Early bird': '☀️',
    'Introvert': '🎧',
    'Extrovert': '🎉',
    'Ambivert': '⚡',
    'Deep talks': '💬',
    'Light banter': '😄',
    'Spontaneous': '🎲',
    'Career-focused': '💼',
    'Fitness': '💪',
    'Foodie': '🍜',
    'Traveller': '✈️',
};

function getTagIcon(tag: string): string {
    return TAG_ICONS[tag] ?? '✨';
}

interface PersonalityTagsProps {
    tags: string[];
}

export function PersonalityTags({ tags }: PersonalityTagsProps) {
    const { colors, isDark } = useTheme();

    if (!tags || tags.length === 0) return null;

    return (
        <View style={styles.container}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Personality</Text>
            <View style={styles.tags}>
                {tags.map((tag, i) => (
                    <View
                        key={i}
                        style={[
                            styles.tag,
                            {
                                backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
                                borderColor: colors.border,
                            },
                        ]}
                    >
                        <Text style={styles.tagIcon}>{getTagIcon(tag)}</Text>
                        <Text style={[styles.tagText, { color: colors.foreground }]}>{tag}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 10,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    tags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        borderRadius: 20,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 7,
    },
    tagIcon: {
        fontSize: 14,
    },
    tagText: {
        fontSize: 13,
        fontWeight: '500',
    },
});
