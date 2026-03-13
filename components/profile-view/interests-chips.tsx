import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';

interface InterestsChipsProps {
    interests: string[];
}

export function InterestsChips({ interests }: InterestsChipsProps) {
    const { colors, isDark } = useTheme();

    if (!interests || interests.length === 0) return null;

    return (
        <View style={styles.container}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Interests</Text>
            <View style={styles.chips}>
                {interests.map((interest, i) => (
                    <View
                        key={i}
                        style={[
                            styles.chip,
                            {
                                backgroundColor: isDark ? colors.card : '#f5f5f5',
                                borderColor: colors.border,
                            },
                        ]}
                    >
                        <Text style={[styles.chipText, { color: colors.foreground }]}>
                            {interest}
                        </Text>
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
    chips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        borderRadius: 20,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 7,
    },
    chipText: {
        fontSize: 14,
        fontWeight: '500',
    },
});
