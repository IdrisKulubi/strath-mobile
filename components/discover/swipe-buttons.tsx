import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { X, Heart, ArrowCounterClockwise } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';

interface SwipeButtonsProps {
    onPass: () => void;
    onLike: () => void;
    onUndo?: () => void;
    canUndo?: boolean;
    disabled?: boolean;
}

export function SwipeButtons({
    onPass,
    onLike,
    onUndo,
    canUndo = false,
    disabled = false,
}: SwipeButtonsProps) {
    const { colors } = useTheme();

    const handlePress = (action: () => void) => {
        if (disabled) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        action();
    };

    return (
        <View style={styles.container}>
            {/* Undo Button */}
            {onUndo && (
                <Pressable
                    style={({ pressed }) => [
                        styles.button,
                        styles.smallButton,
                        {
                            backgroundColor: colors.card,
                            borderColor: canUndo ? '#FF9500' : colors.border,
                            opacity: pressed ? 0.7 : (canUndo ? 1 : 0.4),
                        },
                    ]}
                    onPress={() => handlePress(onUndo)}
                    disabled={!canUndo || disabled}
                >
                    <ArrowCounterClockwise
                        size={24}
                        color={canUndo ? '#FF9500' : colors.mutedForeground}
                        weight="bold"
                    />
                </Pressable>
            )}

            {/* Pass Button */}
            <Pressable
                style={({ pressed }) => [
                    styles.button,
                    styles.mainButton,
                    {
                        backgroundColor: colors.card,
                        borderColor: '#FF3B30',
                        opacity: pressed ? 0.7 : 1,
                    },
                ]}
                onPress={() => handlePress(onPass)}
                disabled={disabled}
            >
                <X size={32} color="#FF3B30" weight="bold" />
            </Pressable>

            {/* Like Button */}
            <Pressable
                style={({ pressed }) => [
                    styles.button,
                    styles.mainButton,
                    {
                        backgroundColor: colors.card,
                        borderColor: '#34C759',
                        opacity: pressed ? 0.7 : 1,
                    },
                ]}
                onPress={() => handlePress(onLike)}
                disabled={disabled}
            >
                <Heart size={32} color="#34C759" weight="fill" />
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
        paddingVertical: 16,
    },
    button: {
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    smallButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    mainButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
    },
});
