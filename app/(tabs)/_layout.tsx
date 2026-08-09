import { Redirect, usePathname, useRouter } from 'expo-router';
import { TabList, Tabs, TabSlot, TabTrigger } from 'expo-router/ui';
import {
    TabBarMinimizeProvider,
    renderFadingTabScreen,
} from 'expo-glass-tabs';
import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import {
    buildGlassTabItems,
    getVisibleTabRoutes,
    HIDDEN_TAB_ROUTES,
} from '@/components/navigation/glass-tab-config';
import { StrathGlassTabBar, StrathGlassTabButton } from '@/components/navigation/strath-glass-tab-bar';
import { HomeExperienceProvider, useHomeExperience } from '@/context/home-experience-context';
import { useTheme } from '@/hooks/use-theme';
import { formatBadgeCount, useNotificationCounts } from '@/hooks/use-notification-counts';
import { useProfile } from '@/hooks/use-profile';
import { isApiError, isAuthExpiredError } from '@/lib/api-client';
import { MATCHMAKER_HOME } from '@/lib/design-tokens';
import { getProfileRoute } from '@/lib/profile-access';

export const unstable_settings = {
    initialRouteName: 'index',
};

function TabLayoutContent() {
    const router = useRouter();
    const pathname = usePathname();
    const { colors, isDark } = useTheme();
    const { unreadMessages, incomingLikes, homeAttention, datesActionable } = useNotificationCounts();
    const { data: profile, error: profileError, isError: isProfileError, isLoading, isSuccess } = useProfile();
    const { isV2Enabled, isLoading: isExperienceLoading } = useHomeExperience();
    const visibleTabRoutes = useMemo(() => getVisibleTabRoutes(isV2Enabled), [isV2Enabled]);
    const homeBadge = formatBadgeCount(
        isV2Enabled ? homeAttention : (homeAttention ?? 0) + incomingLikes,
    );
    const datesBadge = formatBadgeCount(datesActionable ?? 0);
    const chatsBadge = formatBadgeCount(unreadMessages);
    const likesBadge = formatBadgeCount(incomingLikes);
    const nextRoute = isSuccess ? getProfileRoute(profile) : null;

    const isMatchmakerHome = isV2Enabled && (
        pathname === '/(tabs)' ||
        pathname === '/' ||
        pathname.endsWith('/index')
    );

    const glassTabItems = useMemo(
        () =>
            buildGlassTabItems(visibleTabRoutes, {
                homeBadge,
                datesBadge,
                chatsBadge,
                likesBadge,
                badgeBackground: colors.primary,
                badgeColor: colors.primaryForeground,
            }),
        [chatsBadge, colors.primary, colors.primaryForeground, datesBadge, homeBadge, likesBadge, visibleTabRoutes],
    );

    const barTheme = useMemo(() => {
        if (isMatchmakerHome) {
            return {
                activeTint: MATCHMAKER_HOME.primary,
                inactiveTint: MATCHMAKER_HOME.mutedForeground,
                highlight: MATCHMAKER_HOME.navActive,
                glassTint: MATCHMAKER_HOME.navFill,
                solidFallback: MATCHMAKER_HOME.navFill,
            };
        }

        return {
            activeTint: colors.primary,
            inactiveTint: colors.tabIconDefault,
            highlight: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)',
            glassTint: isDark ? 'rgba(28, 23, 36, 0.45)' : 'rgba(255, 255, 255, 0.18)',
            solidFallback: isDark ? 'rgba(28, 23, 36, 0.88)' : 'rgba(255, 255, 255, 0.82)',
        };
    }, [colors.primary, colors.tabIconDefault, isDark, isMatchmakerHome]);

    useEffect(() => {
        if (nextRoute && nextRoute !== '/(tabs)') {
            router.replace(nextRoute as never);
        }
    }, [nextRoute, router]);

    useEffect(() => {
        if (!isExperienceLoading && !isV2Enabled && pathname.endsWith('/pulse')) {
            router.replace('/(tabs)?homeTab=interested' as never);
        }
    }, [isExperienceLoading, isV2Enabled, pathname, router]);

    if (isLoading || isExperienceLoading) {
        return (
            <View style={[styles.centered, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (isSuccess && nextRoute !== '/(tabs)') {
        return <Redirect href={nextRoute as never} />;
    }

    if (isProfileError) {
        if (isAuthExpiredError(profileError) || (profileError instanceof Error && profileError.message === 'Not authenticated')) {
            return <Redirect href="/(auth)/login" />;
        }

        if (
            isApiError(profileError) &&
            profileError.status === 404 &&
            profileError.message.toLowerCase().includes('profile not found')
        ) {
            return <Redirect href="/onboarding" />;
        }
    }

    return (
        <TabBarMinimizeProvider>
            <Tabs>
                <TabSlot style={styles.slot} renderFn={renderFadingTabScreen} />
                <TabList style={styles.hiddenTabList}>
                    {visibleTabRoutes.map((route) => (
                        <TabTrigger key={route.name} name={route.name} href={route.href as never} />
                    ))}
                    {!isV2Enabled ? (
                        <TabTrigger name="pulse" href="/(tabs)/pulse" />
                    ) : null}
                    {HIDDEN_TAB_ROUTES.map((route) => (
                        <TabTrigger key={route.name} name={route.name} href={route.href as never} />
                    ))}
                </TabList>
                <StrathGlassTabBar
                    theme={barTheme}
                    onIndexSelected={(index) => router.navigate(visibleTabRoutes[index].href as never)}
                >
                    {glassTabItems.map((item, index) => (
                        <TabTrigger key={item.name} name={item.name} asChild>
                            <StrathGlassTabButton item={item} index={index} />
                        </TabTrigger>
                    ))}
                </StrathGlassTabBar>
            </Tabs>
        </TabBarMinimizeProvider>
    );
}

export default function TabLayout() {
    return (
        <HomeExperienceProvider>
            <TabLayoutContent />
        </HomeExperienceProvider>
    );
}

const styles = StyleSheet.create({
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    slot: {
        flex: 1,
    },
    hiddenTabList: {
        display: 'none',
    },
});
