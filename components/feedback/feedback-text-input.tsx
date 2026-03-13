import React from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';

const MAX_LENGTH = 300;

interface FeedbackTextInputProps {
    value: string;
    onChange: (text: string) => void;
}

export function FeedbackTextInput({ value, onChange }: FeedbackTextInputProps) {
    const { colors, isDark } = useTheme();

    return (
        <View style={styles.container}>
            <View style={[
                styles.inputWrap,
                {
                    borderColor: colors.border,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                },
            ]}>
                <TextInput
                    style={[styles.input, { color: colors.foreground }]}
                    placeholder="Anything to share about the date? (optional)"
                    placeholderTextColor={colors.mutedForeground}
                    value={value}
                    onChangeText={(t) => onChange(t.slice(0, MAX_LENGTH))}
                    multiline
                    maxLength={MAX_LENGTH}
                    textAlignVertical="top"
                />
                <Text style={[styles.count, { color: colors.mutedForeground }]}>
                    {value.length}/{MAX_LENGTH}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    inputWrap: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 14,
        gap: 8,
    },
    input: {
        fontSize: 15,
        lineHeight: 22,
        minHeight: 80,
    },
    count: {
        fontSize: 11,
        textAlign: 'right',
    },
});
