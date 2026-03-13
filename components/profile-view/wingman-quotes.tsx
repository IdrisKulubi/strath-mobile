import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';

export interface WingmanQuote {
    text: string;
    authorLabel?: string;
}

interface WingmanQuotesProps {
    quotes: WingmanQuote[];
}

export function WingmanQuotes({ quotes }: WingmanQuotesProps) {
    const { colors, isDark } = useTheme();

    if (!quotes || quotes.length === 0) return null;

    return (
        <View style={styles.container}>
            <View style={styles.labelRow}>
                <Ionicons name="people" size={14} color={colors.primary} />
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                    What their friends say
                </Text>
            </View>
            <View style={styles.quotesList}>
                {quotes.map((quote, i) => (
                    <View
                        key={i}
                        style={[
                            styles.quoteCard,
                            {
                                backgroundColor: isDark ? colors.card : '#f9f9f9',
                                borderColor: colors.border,
                            },
                        ]}
                    >
                        <Text style={[styles.quoteIcon, { color: colors.primary }]}>"</Text>
                        <Text style={[styles.quoteText, { color: colors.foreground }]}>
                            {quote.text}
                        </Text>
                        {quote.authorLabel && (
                            <Text style={[styles.quoteAuthor, { color: colors.mutedForeground }]}>
                                — {quote.authorLabel}
                            </Text>
                        )}
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
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    quotesList: {
        gap: 10,
    },
    quoteCard: {
        borderRadius: 14,
        borderWidth: 1,
        padding: 14,
        gap: 4,
    },
    quoteIcon: {
        fontSize: 22,
        fontWeight: '700',
        lineHeight: 20,
        marginBottom: -4,
    },
    quoteText: {
        fontSize: 14,
        lineHeight: 20,
        fontStyle: 'italic',
    },
    quoteAuthor: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 2,
    },
});
