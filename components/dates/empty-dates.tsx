import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';

interface EmptyDatesProps {
    section: 'requests' | 'upcoming' | 'past' | 'incoming' | 'sent' | 'confirmed' | 'history';
}

const CONFIG: Record<EmptyDatesProps['section'], { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; subtitle: string }> = {
    requests: {
        icon: 'heart-outline',
        title: 'No invites yet',
        subtitle: 'When someone invites you on a date, it will show up here.',
    },
    incoming: {
        icon: 'heart-outline',
        title: 'No invites right now',
        subtitle: 'When someone invites you on a date, you\'ll see them here.',
    },
    sent: {
        icon: 'paper-plane-outline',
        title: 'No invites sent yet',
        subtitle: 'Send a date invite from the Home screen to get started.',
    },
    confirmed: {
        icon: 'checkmark-circle-outline',
        title: 'No confirmed matches yet',
        subtitle: 'Once both of you accept, your match will appear here and we\'ll arrange the date.',
    },
    history: {
        icon: 'time-outline',
        title: 'No history yet',
        subtitle: 'Your completed and past dates will appear here.',
    },
    upcoming: {
        icon: 'calendar-outline',
        title: 'No upcoming dates',
        subtitle: 'Accept an invite and our team will set everything up for you.',
    },
    past: {
        icon: 'time-outline',
        title: 'No past dates yet',
        subtitle: 'Your date history will appear here once you have been on a date.',
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
