import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}

interface HomeHeaderProps {
    firstName?: string;
    matchCount?: number;
}

export function HomeHeader({ firstName, matchCount }: HomeHeaderProps) {
    const { colors, isDark } = useTheme();
    const greeting = getGreeting();
    const visibleCount = matchCount && matchCount > 0 ? Math.min(matchCount, 4) : 0;
    const subtitle =
        visibleCount > 0
            ? `Your top ${visibleCount} matches today`
            : 'We’re curating your introduction';

    return (
        <View style={styles.container}>
            <Text style={[styles.greeting, { color: colors.foreground }]}>
                {greeting}{firstName ? `, ${firstName}` : ''} ☀️
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
            {visibleCount > 0 && (
                <Text style={[styles.refreshLine, { color: colors.mutedForeground }]}>
                    Only {visibleCount} matches refresh every 24 hours
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 22,
        gap: 8,
    },
    greeting: {
        fontSize: 34,
        fontWeight: '800',
        letterSpacing: -1,
        lineHeight: 40,
    },
    subtitle: {
        fontSize: 16,
        lineHeight: 22,
        fontWeight: '500',
    },
    refreshLine: {
        fontSize: 12,
        fontWeight: '500',
        letterSpacing: 0.2,
        marginTop: 2,
        opacity: 0.85,
    },
});
