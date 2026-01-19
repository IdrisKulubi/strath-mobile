import React from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    TextInput,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import Animated, { FadeIn } from 'react-native-reanimated';

const PROMPTS = [
    {
        id: 'dating_style',
        label: 'What is it like to date you?',
        placeholder: 'e.g., Coffee dates and deep conversations...',
    },
    {
        id: 'confession',
        label: 'I probably should admit...',
        placeholder: 'e.g., I am obsessed with true crime podcasts...',
    },
    {
        id: 'favorite_way',
        label: 'My favorite way to spend a day is...',
        placeholder: 'e.g., Exploring new restaurants or binge-watching shows...',
    },
];

interface PromptData {
    promptId: string;
    response: string;
}

interface Phase5PromptsProps {
    prompts: PromptData[];
    onUpdate: (prompts: PromptData[]) => void;
    isDark: boolean;
}

export function Phase5Prompts({
    prompts,
    onUpdate,
    isDark,
}: Phase5PromptsProps) {
    const { colors } = useTheme();

    const updatePrompt = (promptId: string, response: string) => {
        const existingIndex = prompts.findIndex(p => p.promptId === promptId);
        let newPrompts = [...prompts];

        if (existingIndex >= 0) {
            if (response.trim() === '') {
                newPrompts.splice(existingIndex, 1);
            } else {
                newPrompts[existingIndex].response = response;
            }
        } else if (response.trim() !== '') {
            newPrompts.push({ promptId, response });
        }

        onUpdate(newPrompts);
    };

    const getPromptResponse = (promptId: string) => {
        const prompt = prompts.find(p => p.promptId === promptId);
        return prompt?.response || '';
    };

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: colors.background }]}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
        >
            {/* Header */}
            <Animated.View entering={FadeIn}>
                <Text style={[styles.title, { color: isDark ? '#fff' : '#1a1a2e' }]}>
                    Share a bit about you
                </Text>
                <Text
                    style={[styles.subtitle, { color: isDark ? '#94a3b8' : '#6b7280' }]}
                >
                    Answer at least one prompt to help people get to know you better
                </Text>
            </Animated.View>

            {/* Prompts */}
            <View style={styles.promptsContainer}>
                {PROMPTS.map((prompt, index) => {
                    const response = getPromptResponse(prompt.id);

                    return (
                        <Animated.View
                            key={prompt.id}
                            entering={FadeIn.delay(index * 50)}
                            style={[
                                styles.promptCard,
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
                                    styles.promptLabel,
                                    { color: isDark ? '#fff' : '#1a1a2e' },
                                ]}
                            >
                                {prompt.label}
                            </Text>
                            <TextInput
                                style={[
                                    styles.promptInput,
                                    {
                                        color: isDark ? '#fff' : '#1a1a2e',
                                        borderColor: isDark
                                            ? 'rgba(255, 255, 255, 0.12)'
                                            : 'rgba(0, 0, 0, 0.1)',
                                        backgroundColor: isDark
                                            ? 'rgba(255, 255, 255, 0.06)'
                                            : 'rgba(0, 0, 0, 0.02)',
                                    },
                                ]}
                                placeholder={prompt.placeholder}
                                placeholderTextColor={
                                    isDark ? '#64748b' : '#9ca3af'
                                }
                                value={response}
                                onChangeText={(text) =>
                                    updatePrompt(prompt.id, text)
                                }
                                multiline
                                maxLength={150}
                            />
                            <Text
                                style={[
                                    styles.characterCount,
                                    {
                                        color: isDark ? '#64748b' : '#9ca3af',
                                    },
                                ]}
                            >
                                {response.length}/150
                            </Text>
                        </Animated.View>
                    );
                })}
            </View>

            {/* Answered count */}
            <View style={styles.countContainer}>
                <Text
                    style={[
                        styles.countText,
                        {
                            color:
                                prompts.length === 0
                                    ? isDark
                                        ? '#64748b'
                                        : '#9ca3af'
                                    : isDark
                                    ? '#10b981'
                                    : '#059669',
                        },
                    ]}
                >
                    {prompts.length} of 3 prompts answered
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 20,
    },
    contentContainer: {
        paddingVertical: 30,
        paddingBottom: 100,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 8,
        lineHeight: 32,
    },
    subtitle: {
        fontSize: 15,
        marginBottom: 28,
        lineHeight: 22,
    },
    promptsContainer: {
        gap: 16,
        marginBottom: 20,
    },
    promptCard: {
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
    },
    promptLabel: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    promptInput: {
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        fontSize: 15,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    characterCount: {
        fontSize: 12,
        marginTop: 8,
        textAlign: 'right',
    },
    countContainer: {
        alignItems: 'center',
        marginTop: 20,
    },
    countText: {
        fontSize: 14,
        fontWeight: '600',
    },
});
