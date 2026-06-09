import React, { useState } from 'react';
import {
    View,
    TextInput,
    Pressable,
    StyleSheet,
    ActivityIndicator,
    Text,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import * as Haptics from 'expo-haptics';

interface ChatInputProps {
    onSend: (message: string) => void;
    isSending?: boolean;
    disabled?: boolean;
    placeholder?: string;
    value?: string;
    onChangeText?: (text: string) => void;
    onFocus?: () => void;
    onBlur?: () => void;
    /** Home-indicator padding when keyboard is closed. Omit while typing. */
    bottomInset?: number;
    onMediaPress?: () => void;
    onGifPress?: () => void;
    onMusicPress?: () => void;
}

export function ChatInput({
    onSend,
    isSending = false,
    disabled = false,
    placeholder = 'Type a message',
    value: controlledValue,
    onChangeText: controlledOnChangeText,
    onFocus,
    onBlur,
    bottomInset = 0,
}: ChatInputProps) {
    const { colors } = useTheme();
    const [internalMessage, setInternalMessage] = useState('');

    const isControlled = controlledValue !== undefined;
    const message = isControlled ? controlledValue : internalMessage;
    const setMessage = isControlled ? controlledOnChangeText! : setInternalMessage;

    const handleSend = () => {
        const trimmed = message.trim();
        if (!trimmed || isSending || disabled) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSend(trimmed);
        setMessage('');
    };

    const canSend = message.trim().length > 0 && !isSending && !disabled;

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: colors.background,
                    borderTopColor: colors.border,
                    paddingBottom: Math.max(bottomInset, 8),
                },
            ]}
        >
            <View style={styles.inputRow}>
                <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <TextInput
                        style={[styles.input, { color: colors.foreground }]}
                        placeholder={placeholder}
                        placeholderTextColor={colors.mutedForeground}
                        value={message}
                        onChangeText={setMessage}
                        onFocus={onFocus}
                        onBlur={onBlur}
                        multiline
                        maxLength={1000}
                        editable={!isSending && !disabled}
                        returnKeyType="default"
                    />
                </View>

                <Pressable
                    style={[
                        styles.sendButton,
                        canSend && { backgroundColor: colors.primary },
                    ]}
                    onPress={handleSend}
                    disabled={!canSend}
                >
                    {isSending ? (
                        <ActivityIndicator
                            size="small"
                            color={canSend ? colors.primaryForeground : colors.mutedForeground}
                        />
                    ) : (
                        <Text
                            style={{
                                color: canSend ? colors.primaryForeground : colors.mutedForeground,
                                fontWeight: '600',
                                fontSize: 16,
                            }}
                        >
                            Send
                        </Text>
                    )}
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingTop: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
        gap: 12,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 12,
    },
    inputContainer: {
        flex: 1,
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 10,
        minHeight: 44,
        maxHeight: 120,
        justifyContent: 'center',
        borderWidth: 1,
    },
    input: {
        fontSize: 16,
        lineHeight: 22,
        padding: 0,
    },
    sendButton: {
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 12,
        borderRadius: 22,
    },
});
