import React, { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Haptics from 'expo-haptics';

import { RisingAuthEntry } from '@/components/auth/rising-auth-entry';
import { useToast } from '@/components/ui/toast';
import { authClient, signIn } from '@/lib/auth-client';
import { clearSession, getStoredAuth } from '@/lib/auth-helpers';
import { apiFetch, isApiError, isAuthExpiredError, isNetworkError } from '@/lib/api-client';
import { getProfileRoute } from '@/lib/profile-access';
import { setCachedProfile } from '@/lib/session-cache';
import { devError, devLog } from '@/lib/dev-log';

async function waitForStoredAuth(timeoutMs = 3000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    await authClient.getSession();
    const stored = await getStoredAuth();
    if (stored?.token) return stored;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return null;
}

async function routeAfterAuth(timeoutMs = 8000) {
  const startedAt = Date.now();
  let storedAuth = await getStoredAuth();

  while (Date.now() - startedAt < timeoutMs) {
    if (!storedAuth?.token || !storedAuth.userId) {
      await authClient.getSession();
      storedAuth = await getStoredAuth();
      await new Promise((resolve) => setTimeout(resolve, 250));
      continue;
    }

    try {
      const response = await apiFetch<{ data?: any }>('/api/user/me', { timeoutMs: 6000 });
      const profile = response?.data ?? null;
      await setCachedProfile(storedAuth.userId, profile);
      return getProfileRoute(profile);
    } catch (error) {
      if (
        isApiError(error) &&
        error.status === 404 &&
        error.message.toLowerCase().includes('profile not found')
      ) {
        await setCachedProfile(storedAuth.userId, null);
        return '/onboarding' as const;
      }

      if (isNetworkError(error)) {
        return '/(tabs)' as const;
      }

      if (isAuthExpiredError(error)) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }

  return '/onboarding' as const;
}

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoLoginEnabled, setDemoLoginEnabled] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const authInFlight = useRef(false);
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    const loadFeatureFlags = async () => {
      try {
        const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://www.strathspace.com';
        const response = await fetch(`${apiUrl}/api/public/feature-flags`);
        if (!response.ok) {
          return;
        }

        const payload = await response.json();
        setDemoLoginEnabled(Boolean(payload?.data?.demoLoginEnabled));
      } catch (error) {
        devLog('Could not load public feature flags:', error);
      }
    };

    loadFeatureFlags();
  }, []);

  const handleGoogleAuth = async () => {
    if (authInFlight.current) return;
    authInFlight.current = true;
    setAuthError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      const result = await signIn.social({
        provider: 'google',
        callbackURL: '/',
      });
      if (result.error) {
        setAuthError(result.error.message || 'Google sign-in was not completed.');
        return;
      }
      // Android can finish the deep-link handoff slightly after the browser closes.
      // Do not treat Better Auth's redirect payload as a completed login until
      // the Expo storage layer has actually persisted a token.
      const storedAuth = await waitForStoredAuth();
      if (storedAuth?.token) {
        const nextRoute = await routeAfterAuth();
        toast.show({ message: 'Welcome to StrathSpace', variant: 'success' });
        router.replace(nextRoute as any);
      } else {
        setAuthError('Sign-in did not finish in the app. Close any browser tab and try again.');
      }
    } catch (error) {
      devError('Auth error:', error);
      setAuthError('Authentication failed. Please try again.');
    } finally {
      setLoading(false);
      authInFlight.current = false;
    }
  };

  const handleAppleAuth = async () => {
    if (authInFlight.current) return;
    authInFlight.current = true;
    setAuthError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAppleLoading(true);
    try {
      const available = await AppleAuthentication.isAvailableAsync();
      if (!available) {
        setAuthError('Apple sign-in is unavailable in this app build. Use Google for now.');
        return;
      }
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://www.strathspace.com';
      const response = await fetch(`${apiUrl}/api/auth/apple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identityToken: credential.identityToken,
          authorizationCode: credential.authorizationCode,
          fullName: credential.fullName,
          email: credential.email,
          user: credential.user,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Apple sign in failed');
      }

      const SecureStore = await import('expo-secure-store');
      if (data.data?.token && data.data?.user) {
        const sessionData = {
          session: {
            token: data.data.token,
            userId: data.data.user.id,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
          user: data.data.user,
        };
        await SecureStore.setItemAsync('strathspace_session', JSON.stringify(sessionData));
        await SecureStore.setItemAsync('strathspace_session_token', data.data.token);
      }

      const nextRoute = await routeAfterAuth();
      toast.show({ message: 'Welcome to StrathSpace', variant: 'success' });
      router.replace(nextRoute as any);
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      if (err.code === 'ERR_REQUEST_CANCELED' || err.code === 'ERR_CANCELED') {
        setAuthError('Apple sign-in was canceled. You can try again.');
        return;
      }
      devError('Apple auth error:', error);
      setAuthError(
        err.message?.includes('Unimplemented')
          ? 'Apple sign-in is unavailable in this app build. Use Google for now.'
          : err.message || 'Apple sign in failed. Please try again.'
      );
    } finally {
      setAppleLoading(false);
      authInFlight.current = false;
    }
  };

  const handleDemoAuth = async () => {
    if (authInFlight.current) return;
    authInFlight.current = true;
    setAuthError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDemoLoading(true);
    try {
      await clearSession();

      const SecureStore = await import('expo-secure-store');
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://www.strathspace.com';
      const response = await fetch(`${apiUrl}/api/auth/demo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Demo auth failed (${response.status})`);
      }

      const data = await response.json();
      const sessionToken = data?.data?.token;
      const sessionUser = data?.data?.user;

      if (!sessionToken || !sessionUser?.id) {
        throw new Error('Demo auth did not return a session');
      }

      const sessionData = {
        session: {
          token: sessionToken,
          userId: sessionUser.id,
          expiresAt: data?.data?.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        user: sessionUser,
      };

      await SecureStore.setItemAsync('strathspace_session', JSON.stringify(sessionData));
      await SecureStore.setItemAsync('strathspace_session_token', sessionToken);

      const nextRoute = await routeAfterAuth();
      toast.show({ message: 'Signed in as demo', variant: 'success' });
      router.replace(nextRoute as any);
    } catch (error) {
      devError('Demo auth error:', error);
      setAuthError('Demo sign in failed. The demo session may need to be reseeded.');
    } finally {
      setDemoLoading(false);
      authInFlight.current = false;
    }
  };

  return (
    <RisingAuthEntry
      googleLoading={loading}
      appleLoading={appleLoading}
      demoLoading={demoLoading}
      appleAvailable={Platform.OS === 'ios'}
      demoEnabled={demoLoginEnabled}
      error={authError}
      onGoogle={handleGoogleAuth}
      onApple={handleAppleAuth}
      onDemo={handleDemoAuth}
      onLegal={(section) => router.push(`/legal?section=${section}`)}
    />
  );
}
