import { ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../global.css';
import { useState, useEffect, useCallback } from 'react';
import * as ExpoSplashScreen from 'expo-splash-screen';

import { NavigationDarkTheme, NavigationLightTheme } from '@/constants/theme';
import { queryClient } from '@/lib/react-query';
import { ThemeProvider, useThemeContext } from '@/context/theme-context';
import { ToastProvider } from '@/components/ui/toast';
import { LaunchExperience } from '@/components/intro/launch-experience';
import { NoInternetScreen } from '@/components/no-internet-screen';
import { OfflineBanner } from '@/components/offline-banner';
import { SessionBootstrap } from '@/components/session-bootstrap';
import { AppFeedbackNudge } from '@/components/feedback/app-feedback-nudge';
import { useNetwork } from '@/hooks/use-network';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { usePresenceHeartbeat } from '@/hooks/use-presence-heartbeat';
import { hasCompletedIntroSlides } from '@/lib/intro-storage';
import { isAuthenticated } from '@/lib/auth-helpers';

ExpoSplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutNav({ hasAuthToken }: { hasAuthToken: boolean }) {
  const { theme } = useThemeContext();
  const { isOffline, isLoading, refresh } = useNetwork();

  // Only show the full-screen "No Internet" takeover for truly unauthenticated
  // users (first-launch / login flow). Authenticated users should stay in the
  // app with a subtle banner + their cached data — losing Wi-Fi should never
  // feel like being logged out.
  const showFullOfflineScreen = !hasAuthToken && !isLoading && isOffline;

  if (showFullOfflineScreen) {
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
        <Stack.Screen name="verification" />
        <Stack.Screen name="waitlist" options={{ gestureEnabled: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: true, title: 'Modal' }} />
        <Stack.Screen name="settings" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="hype-request" />
        <Stack.Screen name="legal" />
        <Stack.Screen name="ui-preview" />
        <Stack.Screen name="profile/[userId]" />
        <Stack.Screen name="feedback/[dateId]" />
        <Stack.Screen name="app-feedback" />
      </Stack>
      <OfflineBanner />
      <AppFeedbackNudge hasAuthToken={hasAuthToken} />
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
    </NavThemeProvider>
  );
}

function NotificationsBootstrap() {
  usePushNotifications();
  usePresenceHeartbeat();
  return null;
}

interface BootstrapState {
  isNewUserIntro: boolean;
  hasAuthToken: boolean;
}

export default function RootLayout() {
  const [bootstrap, setBootstrap] = useState<BootstrapState | null>(null);
  const [showLaunch, setShowLaunch] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function prepare() {
      try {
        const [, slidesDone, authed] = await Promise.all([
          new Promise<void>((resolve) => setTimeout(resolve, 350)),
          hasCompletedIntroSlides(),
          isAuthenticated(),
        ]);
        if (!cancelled) {
          setBootstrap({ isNewUserIntro: !slidesDone, hasAuthToken: authed });
        }
      } catch (e) {
        console.warn(e);
        if (!cancelled) {
          setBootstrap({ isNewUserIntro: true, hasAuthToken: false });
        }
      } finally {
        if (!cancelled) {
          await ExpoSplashScreen.hideAsync();
        }
      }
    }

    prepare();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLaunchComplete = useCallback(() => {
    setShowLaunch(false);
  }, []);

  if (!bootstrap) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <ToastProvider>
              {showLaunch ? (
                <LaunchExperience
                  isNewUserIntro={bootstrap.isNewUserIntro}
                  onComplete={handleLaunchComplete}
                />
              ) : (
                <>
                  <SessionBootstrap />
                  <NotificationsBootstrap />
                  <RootLayoutNav hasAuthToken={bootstrap.hasAuthToken} />
                </>
              )}
            </ToastProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
