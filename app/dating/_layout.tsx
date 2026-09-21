import React from 'react';
import { Redirect, Tabs } from 'expo-router';
import { Compass, Heart, MessageCircle, User } from 'lucide-react-native';

import { Action, Feedback, Loading, Page } from '@/components/questionnaire/ui';
import { useTheme } from '@/hooks/use-theme';
import { useExperience } from '@/lib/questionnaire';

export default function DatingLayout() {
  const { colors } = useTheme();
  const experience = useExperience();
  if (experience.isPending) return <Page title="Strathspace"><Loading label="Opening your dating experience" /></Page>;
  if (experience.isError) return <Page title="Strathspace"><Feedback error={experience.error} /><Action label="Try again" tone="primary" onPress={() => { void experience.refetch(); }} /></Page>;
  if (!experience.data?.shell) return <Redirect href="/(tabs)" />;
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.mutedForeground,
      tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border, minHeight: 62, paddingTop: 6 },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Discover', tabBarAccessibilityLabel: 'Discover', tabBarIcon: ({ color, size }) => <Compass color={color} size={size} /> }} />
      <Tabs.Screen name="likes" options={{ title: 'Likes', tabBarAccessibilityLabel: 'Likes', tabBarIcon: ({ color, size }) => <Heart color={color} size={size} /> }} />
      <Tabs.Screen name="messages" options={{ title: 'Messages', tabBarAccessibilityLabel: 'Messages', tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarAccessibilityLabel: 'Profile', tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }} />
    </Tabs>
  );
}
