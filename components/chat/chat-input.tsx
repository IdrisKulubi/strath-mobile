import React, { useState } from 'react';
import {
    View,
    TextInput,
    Pressable,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Send } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface ChatInputProps {
    onSend: (message: string) => void;
    isSending?: boolean;
    placeholder?: string;
}

export function ChatInput({ onSend, isSending = false, placeholder = "Message..." }: ChatInputProps) {
    const { colors } = useTheme();
    const [message, setMessage] = useState('');

    const handleSend = () => {
        const trimmed = message.trim();
        if (!trimmed || isSending) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSend(trimmed);
        setMessage('');
    };

    const canSend = message.trim().length > 0 && !isSending;

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <View style={[styles.container, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
                <View style={[styles.inputContainer, { backgroundColor: colors.card }]}>
                    <TextInput
                        style={[styles.input, { color: colors.foreground }]}
                        placeholder={placeholder}
                        placeholderTextColor={colors.mutedForeground}
                        value={message}
                        onChangeText={setMessage}
                        multiline
                        maxLength={1000}
                        editable={!isSending}
                        returnKeyType="default"
                    />
                </View>

                <Pressable
                    style={[
                        styles.sendButton,
                        { backgroundColor: canSend ? colors.primary : colors.muted }
                    ]}
                    onPress={handleSend}
                    disabled={!canSend}
                >
                    {isSending ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <Send size={20} color={canSend ? '#FFFFFF' : colors.mutedForeground} />
                    )}
                </Pressable>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderTopWidth: StyleSheet.hairlineWidth,
        gap: 10,
    },
    inputContainer: {
        flex: 1,
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 10,
        minHeight: 44,
        maxHeight: 120,
        justifyContent: 'center',
    },
    input: {
        fontSize: 16,
        lineHeight: 22,
        maxHeight: 100,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
