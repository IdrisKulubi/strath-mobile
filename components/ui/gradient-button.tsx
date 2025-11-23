import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, View } from 'react-native';

interface GradientButtonProps {
    title: string;
    onPress: () => void;
    loading?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
    // Keeping colors prop optional for backward compatibility but ignoring it
    colors?: [string, string, ...string[]];
}

export function GradientButton({
    title,
    onPress,
    loading = false,
    style,
    textStyle,
}: GradientButtonProps) {
    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={loading}
            activeOpacity={0.8}
            style={[styles.container, style]}
        >
            <View style={styles.buttonContent}>
                {loading ? (
                    <ActivityIndicator color="#FFF" />
                ) : (
                    <Text style={[styles.text, textStyle]}>{title}</Text>
                )}
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: 56,
        borderRadius: 28,
        overflow: 'hidden',
        backgroundColor: '#e91e8c', // Solid Neon Pink
        shadowColor: '#e91e8c',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    buttonContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
});
