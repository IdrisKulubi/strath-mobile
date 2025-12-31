import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Heart, X, Star } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';

interface SwipeButtonsProps {
    onPass: () => void;
    onLike: () => void;
    onSuperLike?: () => void;
    disabled?: boolean;
}

export function SwipeButtons({
    onPass,
    onLike,
    onSuperLike,
    disabled = false,
}: SwipeButtonsProps) {
    const handlePress = (action: () => void) => {
        if (disabled) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        action();
    };

    return (
        <View style={styles.container}>
            {/* Pass Button - Left side */}
            <Pressable
                style={({ pressed }) => [
                    styles.button,
                    styles.passButton,
                    { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] },
                ]}
                onPress={() => handlePress(onPass)}
                disabled={disabled}
            >
                <X size={28} color="#000000" weight="bold" />
            </Pressable>

            {/* Super Like Button - Center (Optional) */}
            {onSuperLike && (
                <Pressable
                    style={({ pressed }) => [
                        styles.button,
                        styles.superButton,
                        { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] },
                    ]}
                    onPress={() => handlePress(onSuperLike)}
                    disabled={disabled}
                >
                    <Star size={24} color="#000000" weight="fill" />
                </Pressable>
            )}

            {/* Like Button - Right side (Larger) */}
            <Pressable
                style={({ pressed }) => [
                    styles.button,
                    styles.likeButton,
                    { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] },
                ]}
                onPress={() => handlePress(onLike)}
                disabled={disabled}
            >
                <Heart size={32} color="#000000" weight="fill" />
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 24,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    button: {
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    passButton: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#FFFFFF',
    },
    superButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFD700',
    },
    likeButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#FFBD3D', // Bumble Yellow/Orange
    },
});
