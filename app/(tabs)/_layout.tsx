import { Redirect, Tabs, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassTabBar, getGlassTabBarHeight } from '@/components/navigation/glass-tab-bar';
import { useTheme } from '@/hooks/use-theme';
import { useNotificationCounts, formatBadgeCount } from '@/hooks/use-notification-counts';
import { useProfile } from '@/hooks/use-profile';
import { isApiError, isAuthExpiredError } from '@/lib/api-client';
import { getProfileRoute } from '@/lib/profile-access';

export default function TabLayout() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = getGlassTabBarHeight(insets.bottom);
  const { unreadMessages, homeAttention, datesActionable } = useNotificationCounts();
  const { data: profile, error: profileError, isError: isProfileError, isLoading, isSuccess } = useProfile();
  const homeBadge = homeAttention ?? 0;
  const datesBadge = datesActionable ?? 0;
  const nextRoute = isSuccess ? getProfileRoute(profile) : null;

  useEffect(() => {
    if (nextRoute && nextRoute !== '/(tabs)') {
      router.replace(nextRoute as any);
    }
  }, [nextRoute, router]);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isSuccess) {
    if (nextRoute !== '/(tabs)') {
      return <Redirect href={nextRoute as any} />;
    }
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
    <Tabs
      initialRouteName="index"
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabIconDefault,
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          height: tabBarHeight,
        },
        tabBarBadgeStyle: {
          backgroundColor: colors.primary,
          color: colors.primaryForeground,
          fontSize: 10,
          fontWeight: '600',
          minWidth: 18,
          height: 18,
          borderRadius: 9,
        },
      }}>
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => <Ionicons size={26} name={focused ? "person" : "person-outline"} color={color} />,
        }}
      />
      <Tabs.Screen
        name="dates"
        options={{
          title: 'Dates',
          tabBarIcon: ({ color, focused }) => <Ionicons size={26} name={focused ? "calendar" : "calendar-outline"} color={color} />,
          tabBarBadge: formatBadgeCount(datesBadge),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => <Ionicons size={26} name={focused ? "home" : "home-outline"} color={color} />,
          tabBarBadge: formatBadgeCount(homeBadge),
        }}
      />
      <Tabs.Screen
        name="pulse"
        options={{
          title: 'Wingman',
          tabBarIcon: ({ color, focused }) => <Ionicons size={26} name={focused ? "people" : "people-outline"} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons size={26} name={focused ? 'chatbubbles' : 'chatbubbles-outline'} color={color} />
          ),
          tabBarBadge: formatBadgeCount(unreadMessages),
        }}
      />
      {/* Hidden routes — accessible but not shown in tab bar */}
      <Tabs.Screen name="explore" options={{ href: null }} />
      <Tabs.Screen name="drops" options={{ href: null }} />
      <Tabs.Screen name="matches" options={{ href: null }} />
      <Tabs.Screen name="study-date" options={{ href: null }} />
      <Tabs.Screen name="date-kit" options={{ href: null }} />
    </Tabs>
  );
}
