import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '@/hooks/use-theme';
import { IconProps } from 'phosphor-react-native';

interface SectionCardProps {
    title: string;
    subtitle?: string;
    icon: React.ReactElement<IconProps>;
    children: React.ReactNode;
    delay?: number;
}

export function SectionCard({
    title,
    subtitle,
    icon,
    children,
    delay = 0,
}: SectionCardProps) {
    const { colors, isDark } = useTheme();

    return (
        <Animated.View
            entering={FadeInDown.delay(delay).springify()}
            style={[
                styles.container,
                {
                    backgroundColor: isDark
                        ? 'rgba(255, 255, 255, 0.04)'
                        : '#ffffff',
                    borderColor: isDark
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(0, 0, 0, 0.06)',
                    // Add shadow for light mode
                    ...(isDark
                        ? {}
                        : {
                              shadowColor: '#000',
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.06,
                              shadowRadius: 8,
                              elevation: 2,
                          }),
                },
            ]}
        >
            {/* Header */}
            <View style={styles.header}>
                <View
                    style={[
                        styles.iconContainer,
                        {
                            backgroundColor: isDark
                                ? 'rgba(236, 72, 153, 0.15)'
                                : 'rgba(236, 72, 153, 0.1)',
                        },
                    ]}
                >
                    {React.cloneElement(icon, {
                        size: 18,
                        color: colors.primary,
                        weight: 'fill',
                    })}
                </View>
                <View style={styles.headerText}>
                    <Text style={[styles.title, { color: colors.foreground }]}>
                        {title}
                    </Text>
                    {subtitle && (
                        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                            {subtitle}
                        </Text>
                    )}
                </View>
            </View>

            {/* Content */}
            <View style={styles.content}>{children}</View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 16,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingBottom: 12,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    headerText: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
    },
    subtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    content: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
});
