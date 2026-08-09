import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { GlassTabItem } from 'expo-glass-tabs';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export interface VisibleTabRoute {
    name: string;
    href: string;
    label: string;
    icon: IoniconName;
    badge?: string | null;
}

export const V1_TAB_ROUTES: VisibleTabRoute[] = [
    { name: 'profile', href: '/(tabs)/profile', label: 'Profile', icon: 'person' },
    { name: 'dates', href: '/(tabs)/dates', label: 'Dates', icon: 'calendar' },
    { name: 'index', href: '/(tabs)', label: 'Home', icon: 'home' },
    { name: 'chats', href: '/(tabs)/chats', label: 'Messages', icon: 'chatbubbles' },
];

export const V2_TAB_ROUTES: VisibleTabRoute[] = [
    ...V1_TAB_ROUTES.slice(0, 3),
    { name: 'pulse', href: '/(tabs)/pulse', label: 'Likes', icon: 'heart' },
    V1_TAB_ROUTES[3],
];

export function getVisibleTabRoutes(isV2Enabled: boolean) {
    return isV2Enabled ? V2_TAB_ROUTES : V1_TAB_ROUTES;
}

export const HIDDEN_TAB_ROUTES = [
    { name: 'explore', href: '/(tabs)/explore' },
    { name: 'drops', href: '/(tabs)/drops' },
    { name: 'matches', href: '/(tabs)/matches' },
    { name: 'study-date', href: '/(tabs)/study-date' },
    { name: 'date-kit', href: '/(tabs)/date-kit' },
] as const;

interface TabIconWithBadgeProps {
    icon: IoniconName;
    tint: string;
    size: number;
    badge?: string | null;
    badgeBackground?: string;
    badgeColor?: string;
}

function TabIconWithBadge({
    icon,
    tint,
    size,
    badge,
    badgeBackground = '#B8327A',
    badgeColor = '#FFFFFF',
}: TabIconWithBadgeProps) {
    return (
        <View style={styles.iconWrap}>
            <Ionicons name={icon} size={size} color={tint} />
            {badge ? (
                <View style={[styles.badge, { backgroundColor: badgeBackground }]}>
                    <Text style={[styles.badgeText, { color: badgeColor }]}>{badge}</Text>
                </View>
            ) : null}
        </View>
    );
}

export function buildGlassTabItems(
    routes: VisibleTabRoute[],
    options: {
        homeBadge?: string | null;
        datesBadge?: string | null;
        chatsBadge?: string | null;
        likesBadge?: string | null;
        badgeBackground: string;
        badgeColor: string;
    },
): GlassTabItem[] {
    return routes.map((route) => {
        const badge =
            route.name === 'index'
                ? options.homeBadge
                : route.name === 'dates'
                  ? options.datesBadge
                  : route.name === 'chats'
                    ? options.chatsBadge
                    : route.name === 'pulse'
                      ? options.likesBadge
                    : null;

        return {
            name: route.name,
            label: route.label,
            renderIcon: ({ tint, size }) => (
                <TabIconWithBadge
                    icon={route.icon}
                    tint={tint}
                    size={size}
                    badge={badge}
                    badgeBackground={options.badgeBackground}
                    badgeColor={options.badgeColor}
                />
            ),
        };
    });
}

const styles = StyleSheet.create({
    iconWrap: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
    },
    badge: {
        position: 'absolute',
        top: -5,
        right: -11,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '600',
    },
});
