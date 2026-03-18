import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';

interface EmptyDatesProps {
    section: 'mutual' | 'call_pending' | 'being_arranged' | 'upcoming' | 'history';
}

const CONFIG: Record<EmptyDatesProps['section'], { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; subtitle: string }> = {
    mutual: {
        icon: 'heart-outline',
        title: 'No mutuals yet 💕',
        subtitle: "When you both say yes, they'll show up here.",
    },
    call_pending: {
        icon: 'call-outline',
        title: 'No vibe checks waiting 📞',
        subtitle: "Quick 3-min calls will show up here when you're both a match.",
    },
    being_arranged: {
        icon: 'sparkles-outline',
        title: 'Nothing in the works yet ✨',
        subtitle: "When plans start getting made, you'll see them here.",
    },
    upcoming: {
        icon: 'calendar-outline',
        title: 'No dates planned yet 📅',
        subtitle: 'Scheduled plans will appear here.',
    },
    history: {
        icon: 'time-outline',
        title: 'No date history yet 📖',
        subtitle: 'Your future stories start here.',
    },
};

export function EmptyDates({ section }: EmptyDatesProps) {
    const { colors } = useTheme();
    const { icon, title, subtitle } = CONFIG[section];

    return (
        <View style={styles.container}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
                <Ionicons name={icon} size={36} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
        paddingVertical: 60,
        gap: 12,
    },
    iconWrap: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
    },
});
