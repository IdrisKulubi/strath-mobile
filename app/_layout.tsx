import { ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import '../global.css';

import { NavigationDarkTheme, NavigationLightTheme } from '@/constants/theme';
import { queryClient } from '@/lib/react-query';
import { ThemeProvider, useThemeContext } from '@/context/theme-context';
import { ToastProvider } from '@/components/ui/toast';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutNav() {
  const { theme } = useThemeContext();

  return (
    <NavThemeProvider value={theme === 'dark' ? NavigationDarkTheme : NavigationLightTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="chat/[matchId]" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ToastProvider>
            <RootLayoutNav />
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
