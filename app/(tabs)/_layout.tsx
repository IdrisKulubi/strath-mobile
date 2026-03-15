import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { useTheme } from '@/hooks/use-theme';
import { useNotificationCounts, formatBadgeCount } from '@/hooks/use-notification-counts';

export default function TabLayout() {
  const { colors } = useTheme();
  const { unreadMessages, incomingRequests } = useNotificationCounts();
  const datesBadge = incomingRequests ?? 0;

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#8E8E93',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          height: Platform.OS === 'ios' ? 94 : 74,
          paddingTop: 12,
          paddingBottom: Platform.OS === 'ios' ? 34 : 14,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 4,
        },
        tabBarBadgeStyle: {
          backgroundColor: colors.primary,
          color: '#fff',
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
        name="date-kit"
        options={{
          title: 'Date Kit',
          tabBarIcon: ({ color, focused }) => <Ionicons size={26} name={focused ? "reader" : "reader-outline"} color={color} />,
        }}
      />
      {/* Hidden routes — accessible but not shown in tab bar */}
      <Tabs.Screen name="explore" options={{ href: null }} />
      <Tabs.Screen name="drops" options={{ href: null }} />
      <Tabs.Screen name="matches" options={{ href: null }} />
      <Tabs.Screen name="study-date" options={{ href: null }} />
      <Tabs.Screen
        name="chats"
        options={{
          href: null,
          tabBarBadge: formatBadgeCount(unreadMessages),
        }}
      />
    </Tabs>
  );
}
