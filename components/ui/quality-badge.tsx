import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { X } from 'phosphor-react-native';

const QUALITY_COLORS: Record<string, { bg: string; text: string; emoji: string }> = {
    humor: { bg: '#fef3c7', text: '#d97706', emoji: '😄' },
    kindness: { bg: '#dcfce7', text: '#16a34a', emoji: '💚' },
    optimism: { bg: '#fef9c3', text: '#ca8a04', emoji: '☀️' },
    loyalty: { bg: '#e0e7ff', text: '#4f46e5', emoji: '🤝' },
    sarcasm: { bg: '#fce7f3', text: '#be185d', emoji: '😏' },
    adventurous: { bg: '#ffe4e6', text: '#be185d', emoji: '🚀' },
    thoughtful: { bg: '#e0e7ff', text: '#4f46e5', emoji: '🧠' },
    energetic: { bg: '#fcd34d', text: '#b45309', emoji: '⚡' },
    calm: { bg: '#d1fae5', text: '#059669', emoji: '🧘' },
    ambitious: { bg: '#ddd6fe', text: '#6d28d9', emoji: '🎯' },
    creative: { bg: '#fbcfe8', text: '#be185d', emoji: '🎨' },
    independent: { bg: '#fed7aa', text: '#b45309', emoji: '🦅' },
};

interface QualityBadgeProps {
    quality: string;
    onRemove?: () => void;
    isDark?: boolean;
}

export function QualityBadge({
    quality,
    onRemove,
    isDark = false,
}: QualityBadgeProps) {
    const colors = QUALITY_COLORS[quality.toLowerCase()] || {
        bg: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
        text: isDark ? '#fff' : '#1a1a2e',
        emoji: '✨',
    };

    return (
        <View
            style={[
                styles.badge,
                { backgroundColor: colors.bg },
            ]}
        >
            <Text
                style={[
                    styles.emoji,
                    { color: colors.text },
                ]}
            >
                {colors.emoji}
            </Text>
            <Text
                style={[
                    styles.label,
                    { color: colors.text },
                ]}
            >
                {quality.charAt(0).toUpperCase() + quality.slice(1)}
            </Text>
            {onRemove && (
                <TouchableOpacity onPress={onRemove}>
                    <X
                        size={16}
                        color={colors.text}
                        style={styles.removeIcon}
                    />
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
    },
    emoji: {
        fontSize: 16,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
    },
    removeIcon: {
        marginLeft: 4,
        cursor: 'pointer',
    },
});
