import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';

interface MatchReasonsProps {
    reasons: string[];
}

export function MatchReasons({ reasons }: MatchReasonsProps) {
    const { colors, isDark } = useTheme();

    if (!reasons || reasons.length === 0) return null;

    return (
        <View style={[styles.container, {
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            borderColor: colors.border,
        }]}>
            <View style={styles.labelRow}>
                <Ionicons name="sparkles" size={11} color={colors.primary} />
                <Text style={[styles.label, { color: colors.mutedForeground }]}>
                    Why you might match
                </Text>
            </View>
            {reasons.slice(0, 3).map((reason, i) => (
                <Text key={i} style={[styles.reason, { color: colors.foreground }]}>
                    • {reason}
                </Text>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 12,
        gap: 4,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 2,
    },
    label: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    reason: {
        fontSize: 13,
        lineHeight: 18,
    },
});
