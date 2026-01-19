import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/text';

const PROMPT_TITLES: Record<string, string> = {
    dating_style: 'What is it like to date you?',
    confession: 'I probably should admit...',
    favorite_way: 'My favorite way to spend a day is...',
};

interface PromptCardProps {
    promptId: string;
    response: string;
    isDark?: boolean;
}

export function PromptCard({
    promptId,
    response,
    isDark = false,
}: PromptCardProps) {
    const title = PROMPT_TITLES[promptId] || 'Prompt';

    return (
        <View
            style={[
                styles.card,
                {
                    backgroundColor: isDark
                        ? 'rgba(255, 255, 255, 0.04)'
                        : 'rgba(0, 0, 0, 0.03)',
                    borderColor: isDark
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(0, 0, 0, 0.06)',
                },
            ]}
        >
            <Text
                style={[
                    styles.promptTitle,
                    { color: isDark ? '#94a3b8' : '#6b7280' },
                ]}
            >
                {title}
            </Text>
            <Text
                style={[
                    styles.response,
                    { color: isDark ? '#fff' : '#1a1a2e' },
                ]}
            >
                {response}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        marginBottom: 12,
    },
    promptTitle: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
    },
    response: {
        fontSize: 15,
        lineHeight: 22,
    },
});
