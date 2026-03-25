import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';

interface DateKitTipPillProps {
    label: string;
    icon?: keyof typeof Ionicons.glyphMap;
    selected?: boolean;
    onPress?: () => void;
}

export function DateKitTipPill({
    label,
    icon,
    selected = false,
    onPress,
}: DateKitTipPillProps) {
    const { colors, isDark } = useTheme();

    const content = (
        <>
            {icon ? (
                <Ionicons
                    name={icon}
                    size={14}
                    color={selected ? '#fff' : colors.primary}
                />
            ) : null}
            <Text
                style={[
                    styles.label,
                    { color: selected ? '#fff' : colors.foreground },
                ]}
            >
                {label}
            </Text>
        </>
    );

    if (onPress) {
        return (
            <Pressable
                onPress={onPress}
                style={[
                    styles.base,
                    {
                        backgroundColor: selected
                            ? colors.primary
                            : isDark ? 'rgba(255,255,255,0.07)' : '#fff',
                        borderColor: selected ? colors.primary : colors.border,
                    },
                ]}
            >
                {content}
            </Pressable>
        );
    }

    return (
        <View
            style={[
                styles.base,
                {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
                    borderColor: colors.border,
                },
            ]}
        >
            {content}
        </View>
    );
}

const styles = StyleSheet.create({
    base: {
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
    },
});
