import { ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import '../global.css';
import { useState, useEffect, useCallback } from 'react';
import * as ExpoSplashScreen from 'expo-splash-screen';

import { NavigationDarkTheme, NavigationLightTheme } from '@/constants/theme';
import { queryClient } from '@/lib/react-query';
import { ThemeProvider, useThemeContext } from '@/context/theme-context';
import { ToastProvider } from '@/components/ui/toast';
import SplashScreen from '@/components/splash-screen';
import { NoInternetScreen } from '@/components/no-internet-screen';
import { useNetwork } from '@/hooks/use-network';
import { usePushNotifications } from '@/hooks/use-push-notifications';

// Prevent the native splash screen from auto-hiding
ExpoSplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutNav() {
  const { theme } = useThemeContext();
  const { isConnected, isLoading, refresh } = useNetwork();

  // Show no internet screen if not connected (and not still loading initial check)
  if (!isLoading && !isConnected) {
    return (
      <NavThemeProvider value={theme === 'dark' ? NavigationDarkTheme : NavigationLightTheme}>
        <NoInternetScreen onRetry={refresh} />
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      </NavThemeProvider>
    );
  }

  return (
    <NavThemeProvider value={theme === 'dark' ? NavigationDarkTheme : NavigationLightTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="chat/[matchId]" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: true, title: 'Modal' }} />
        <Stack.Screen name="settings" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="hype-request" />
        <Stack.Screen name="legal" />
        <Stack.Screen name="ui-preview" />
      </Stack>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
    </NavThemeProvider>
  );
}

function NotificationsBootstrap() {
  usePushNotifications();
  return null;
}

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load any resources or data here
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
        // Hide the native splash screen
        await ExpoSplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  if (!appIsReady) {
    return null;
  }

  if (showSplash) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ToastProvider>
            <NotificationsBootstrap />
            <RootLayoutNav />
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
