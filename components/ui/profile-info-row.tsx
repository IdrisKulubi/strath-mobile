import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/text';

interface ProfileInfoRowProps {
    icon: React.ReactNode;
    label: string;
    value: string | string[];
    isDark?: boolean;
    backgroundColor?: string;
}

export function ProfileInfoRow({
    icon,
    label,
    value,
    isDark = false,
    backgroundColor,
}: ProfileInfoRowProps) {
    const displayValue = Array.isArray(value)
        ? value.join(', ')
        : value;

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor:
                        backgroundColor ||
                        (isDark
                            ? 'rgba(255, 255, 255, 0.04)'
                            : 'rgba(0, 0, 0, 0.03)'),
                    borderColor: isDark
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(0, 0, 0, 0.06)',
                },
            ]}
        >
            <View style={styles.iconContainer}>
                {icon}
            </View>
            <View style={styles.content}>
                <Text
                    style={[
                        styles.label,
                        { color: isDark ? '#94a3b8' : '#6b7280' },
                    ]}
                >
                    {label}
                </Text>
                <Text
                    style={[
                        styles.value,
                        { color: isDark ? '#fff' : '#1a1a2e' },
                    ]}
                >
                    {displayValue}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        marginBottom: 12,
        gap: 12,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(236, 72, 153, 0.1)',
    },
    content: {
        flex: 1,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 4,
    },
    value: {
        fontSize: 15,
        fontWeight: '500',
    },
});
