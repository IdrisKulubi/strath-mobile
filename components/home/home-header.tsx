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
    const { colors } = useTheme();
    const greeting = getGreeting();

    const subtext = matchCount && matchCount > 0
        ? `We found ${matchCount} ${matchCount === 1 ? 'person' : 'people'} you may really click with`
        : 'Your curated matches for today';

    return (
        <View style={styles.container}>
            <Text style={[styles.greeting, { color: colors.foreground }]}>
                {greeting}{firstName ? `, ${firstName}` : ''}
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                {subtext}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 18,
        gap: 4,
    },
    greeting: {
        fontSize: 26,
        fontWeight: '800',
        letterSpacing: -0.5,
        lineHeight: 32,
        paddingTop: 2,
    },
    subtitle: {
        fontSize: 13,
        marginTop: 4,
        lineHeight: 18,
    },
});
