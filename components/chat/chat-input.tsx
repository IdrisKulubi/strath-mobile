import React, { useState } from 'react';
import {
    View,
    TextInput,
    Pressable,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Text,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { PaperPlaneTilt, Image, MusicNote, Sticker } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';

interface ChatInputProps {
    onSend: (message: string) => void;
    isSending?: boolean;
    placeholder?: string;
    onMediaPress?: () => void;
    onGifPress?: () => void;
    onMusicPress?: () => void;
}

export function ChatInput({
    onSend,
    isSending = false,
    placeholder = "Type a message",
    onMediaPress,
    onGifPress,
    onMusicPress
}: ChatInputProps) {
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
                {/* Input Row */}
                <View style={styles.inputRow}>
                    <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
                            // Send button only shows background when active
                            canSend && { backgroundColor: colors.primary }
                        ]}
                        onPress={handleSend}
                        disabled={!canSend}
                    >
                        {isSending ? (
                            <ActivityIndicator size="small" color={canSend ? "#FFFFFF" : colors.mutedForeground} />
                        ) : (
                            <Text style={{
                                color: canSend ? '#FFFFFF' : colors.mutedForeground,
                                fontWeight: '600',
                                fontSize: 16
                            }}>
                                Send
                            </Text>
                        )}
                    </Pressable>
                </View>

                {/* Accessory Buttons Row */}
                {/* <View style={styles.accessoryRow}>
                    <AccessoryButton
                        icon={<ImageIcon size={20} color="#FFFFFF" />}
                        bgColor="#007AFF" // Blue
                        onPress={onMediaPress}
                    />
                    <AccessoryButton
                        icon={<Text style={{ fontSize: 11, fontWeight: '900', color: '#000000' }}>GIF</Text>}
                        bgColor="#FFFFFF" // White
                        onPress={onGifPress}
                    />
                    <AccessoryButton
                        icon={<Music size={20} color="#FFFFFF" />}
                        bgColor="#34C759" // Green
                        onPress={onMusicPress}
                    />
                </View> */}
            </View>
        </KeyboardAvoidingView>
    );
}

function AccessoryButton({ icon, bgColor, onPress }: { icon: React.ReactNode, bgColor: string, onPress?: () => void }) {
    return (
        <Pressable
            style={({ pressed }) => [
                styles.accessoryButton,
                { backgroundColor: bgColor },
                pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] }
            ]}
            onPress={() => {
                if (onPress) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onPress();
                }
            }}
        >
            {icon}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8, // Safe area handled by parent or defaults
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
        padding: 0, // Reset default padding
    },
    sendButton: {
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 12,
        borderRadius: 22,
    },
    accessoryRow: {
        flexDirection: 'row',
        gap: 12,
        paddingBottom: 4,
    },
    accessoryButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
