import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';

interface EmptyMatchesProps {
    /** User finished acting on today’s card(s) and has no active introduction right now. */
    allActioned?: boolean;
    /** Server has a queued introduction scheduled for a later UTC day (no countdown). */
    hasUpcomingQueued?: boolean;
}

export function EmptyMatches({ allActioned = false, hasUpcomingQueued = false }: EmptyMatchesProps) {
    const { colors, isDark } = useTheme();

    const stillSearchingNoQueue = !allActioned && !hasUpcomingQueued;

    const title = allActioned
        ? hasUpcomingQueued
            ? 'Your next intro is on the way'
            : 'We’re still finding the right fit'
        : stillSearchingNoQueue
          ? 'We’re still looking for your match'
          : 'We’re still finding the right fit';

    const subtitle = allActioned
        ? hasUpcomingQueued
            ? 'We’ll notify you when the next person is ready — no rush, just your pace.'
            : 'When someone scores well with you, we’ll ping you and show them on Home.'
        : stillSearchingNoQueue
          ? 'Give us a little time — we only show someone when the fit is strong. We’ll notify you when we’ve got one.'
          : 'Strong matches take a little time. Turn on notifications so you don’t miss it.';

    return (
        <View style={styles.container}>
            <View
                style={[
                    styles.iconWrap,
                    { backgroundColor: isDark ? 'rgba(233,30,140,0.12)' : 'rgba(233,30,140,0.08)' },
                ]}
            >
                <Ionicons name="heart-outline" size={40} color={colors.primary} />
            </View>

            <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        paddingHorizontal: 32,
        paddingTop: 48,
        paddingBottom: 32,
        gap: 12,
    },
    iconWrap: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
    },
});
