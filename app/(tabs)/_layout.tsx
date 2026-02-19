import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { useTheme } from '@/hooks/use-theme';
import { useNotificationCounts, formatBadgeCount } from '@/hooks/use-notification-counts';

export default function TabLayout() {
  const { colors } = useTheme();
  const { unopenedMatches, unreadMessages, incomingRequests } = useNotificationCounts();
  const connectionBadge = unopenedMatches + (incomingRequests ?? 0);

  return (
    <Tabs
      initialRouteName="explore"
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
        name="drops"
        options={{
          title: 'Drops',
          tabBarIcon: ({ color, focused }) => <Ionicons size={26} name={focused ? "gift" : "gift-outline"} color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Find',
          tabBarIcon: ({ color, focused }) => <Ionicons size={26} name={focused ? "sparkles" : "sparkles-outline"} color={color} />,
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: 'Connections',
          tabBarIcon: ({ color, focused }) => <Ionicons size={26} name={focused ? "hand-right" : "hand-right-outline"} color={color} />,
          tabBarBadge: formatBadgeCount(connectionBadge),
        }}
      />
      <Tabs.Screen
        name="pulse"
        options={{
          title: 'Pulse',
          tabBarIcon: ({ color, focused }) => <Ionicons size={26} name={focused ? "flame" : "flame-outline"} color={color} />,
        }}
      />
      <Tabs.Screen
        name="study-date"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
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
