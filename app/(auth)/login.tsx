import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { LoginBenefitsCard } from '@/components/auth/login-benefits-card';
import { LoginWelcomeBackground } from '@/components/auth/login-welcome-background';
import { GoogleLogo } from '@/components/icons/google-logo';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { authClient, signIn } from '@/lib/auth-client';
import { clearSession } from '@/lib/auth-helpers';
import { useTheme } from '@/hooks/use-theme';

const CTA_H = 50;

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);
  const [demoLoginEnabled, setDemoLoginEnabled] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const { colors, isDark } = useTheme();

  useEffect(() => {
    const checkAppleAuth = async () => {
      if (Platform.OS === 'ios') {
        try {
          const isAvailable = await AppleAuthentication.isAvailableAsync();
          setAppleAuthAvailable(isAvailable);
        } catch {
          setAppleAuthAvailable(false);
        }
      }
    };
    checkAppleAuth();
  }, []);

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
        console.log('Could not load public feature flags:', error);
      }
    };

    loadFeatureFlags();
  }, []);

  const handleGoogleAuth = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      const result = await signIn.social({
        provider: 'google',
        callbackURL: '/',
      });
      if (result.error) {
        toast.show({
          message: result.error.message || 'Google sign-in was not completed.',
          variant: 'danger',
        });
        return;
      }
      // Android: deep link can be handled slightly after the browser closes; refresh session cache.
      const refreshed = await authClient.getSession();
      if (refreshed.data?.session || result.data) {
        toast.show({ message: 'Welcome to StrathSpace', variant: 'success' });
        router.replace('/');
      } else {
        toast.show({
          message: 'Sign-in did not finish in the app. Close any browser tab and try again.',
          variant: 'danger',
        });
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast.show({ message: 'Authentication failed. Please try again.', variant: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  const handleAppleAuth = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAppleLoading(true);
    try {
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

      toast.show({ message: 'Welcome to StrathSpace', variant: 'success' });
      router.replace('/');
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      if (err.code === 'ERR_REQUEST_CANCELED' || err.code === 'ERR_CANCELED') {
        toast.show({ message: 'Sign in canceled. You can try Google above.' });
        return;
      }
      console.error('Apple auth error:', error);
      toast.show({
        message: err.message || 'Apple sign in failed. Please try again.',
        variant: 'danger',
      });
    } finally {
      setAppleLoading(false);
    }
  };

  const handleDemoAuth = async () => {
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

      toast.show({ message: 'Signed in as demo', variant: 'success' });
      router.replace('/');
    } catch (error) {
      console.error('Demo auth error:', error);
      toast.show({
        message: 'Demo sign in failed. The demo session may need to be reseeded.',
        variant: 'danger',
      });
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <LoginWelcomeBackground isDark={isDark} colors={colors} />

      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false} bounces={false}>
          <Animated.View entering={FadeInDown.delay(60).duration(420)} style={styles.hero}>
            <View style={styles.logoMarkWrap}>
              <View style={styles.logoAuraOuter} pointerEvents="none">
                <LinearGradient
                  colors={
                    isDark
                      ? ['rgba(233,30,140,0.28)', 'rgba(147,51,234,0.14)', 'transparent']
                      : ['rgba(233,30,140,0.2)', 'rgba(255,206,228,0.14)', 'transparent']
                  }
                  locations={[0, 0.42, 1]}
                  start={{ x: 0.5, y: 0.1 }}
                  end={{ x: 0.85, y: 0.95 }}
                  style={styles.logoGlow}
                />
              </View>
              <View
                style={[
                  styles.logoHalo,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.74)',
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(233,30,140,0.08)',
                  },
                ]}
              >
                <Image
                  source={require('@/assets/images/logos/LOGO.png')}
                  style={styles.logoImg}
                  resizeMode="contain"
                />
              </View>
            </View>

            <Text style={[styles.wordmark, { color: colors.foreground }]}>StrathSpace</Text>
            <Text style={[styles.headline, { color: colors.foreground }]}>Real dates.{"\n"}Less noise.</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Meet people at your university who actually fit your vibe.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(120).duration(420)} style={styles.benefitsWrap}>
            <LoginBenefitsCard isDark={isDark} />
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(180).duration(420)} style={styles.auth}>
            <View
              style={[
                styles.authShell,
                {
                  backgroundColor: isDark ? 'rgba(24, 15, 34, 0.72)' : 'rgba(255,255,255,0.72)',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(233,30,140,0.1)',
                },
              ]}
            >
              <View style={styles.authIntro}>
                <View
                  style={[
                    styles.authEyebrow,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(233,30,140,0.08)',
                      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(233,30,140,0.1)',
                    },
                  ]}
                >
                  <Ionicons name="sparkles-outline" size={13} color={colors.primary} />
                  <Text style={[styles.authEyebrowText, { color: colors.foreground }]}>Jump in quick</Text>
                </View>
                <Text style={[styles.authCaption, { color: colors.mutedForeground }]}>
                  Pick your smoothest way in.
                </Text>
              </View>

              <Pressable
                onPress={handleGoogleAuth}
                disabled={loading || appleLoading || demoLoading}
                style={({ pressed }) => [styles.googleBtn, pressed && !loading && !appleLoading && !demoLoading && styles.pressedBtn]}
              >
                <LinearGradient
                  colors={['#ff4fa8', '#e91e8c', '#c61c77']}
                  start={{ x: 0, y: 0.2 }}
                  end={{ x: 1, y: 0.9 }}
                  style={styles.googleGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <View style={styles.googleBtnInner}>
                      <View style={styles.googleIconBadge}>
                        <GoogleLogo size={20} />
                      </View>
                      <Text style={styles.googleLabelPrimary}>Continue with Google</Text>
                      <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                    </View>
                  )}
                </LinearGradient>
              </Pressable>

              {demoLoginEnabled && (
                <Pressable
                  onPress={handleDemoAuth}
                  disabled={loading || appleLoading || demoLoading}
                  style={({ pressed }) => [
                    styles.demoBtn,
                    {
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(233,30,140,0.14)',
                      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(233,30,140,0.05)',
                      opacity: pressed && !loading && !appleLoading && !demoLoading ? 0.72 : 1,
                    },
                  ]}
                >
                  {demoLoading ? (
                    <ActivityIndicator color={colors.primary} size="small" />
                  ) : (
                    <View style={styles.demoBtnInner}>
                      <View style={[styles.demoIconBadge, { backgroundColor: isDark ? 'rgba(233,30,140,0.18)' : 'rgba(233,30,140,0.1)' }]}>
                        <Ionicons name="flask-outline" size={18} color={colors.primary} />
                      </View>
                      <View style={styles.demoTextWrap}>
                        <Text style={[styles.demoLabelPrimary, { color: colors.foreground }]}>Continue as Demo</Text>
                        <Text style={[styles.demoLabelSecondary, { color: colors.mutedForeground }]}>
                          Preview seeded matches and dates
                        </Text>
                      </View>
                      <Ionicons name="arrow-forward" size={18} color={colors.primary} />
                    </View>
                  )}
                </Pressable>
              )}

              {appleAuthAvailable && (
                <View style={styles.appleWrap}>
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                    buttonStyle={
                      isDark
                        ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                        : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                    }
                    cornerRadius={18}
                    style={styles.appleNative}
                    onPress={handleAppleAuth}
                  />
                  {appleLoading && (
                    <View style={styles.appleOverlay}>
                      <ActivityIndicator color={isDark ? '#111111' : '#FFFFFF'} size="small" />
                    </View>
                  )}
                </View>
              )}
            </View>

            <View style={styles.termsWrap}>
              <Text style={[styles.termsLead, { color: colors.mutedForeground }]}>
                By continuing, you agree to our
              </Text>
              <View style={styles.termsLinksRow}>
                <Text
                  style={[styles.termsLink, { color: colors.primary }]}
                  onPress={() => router.push('/legal?section=terms')}
                >
                  Terms of Service
                </Text>
                <Text style={[styles.termsDot, { color: colors.mutedForeground }]}> · </Text>
                <Text
                  style={[styles.termsLink, { color: colors.primary }]}
                  onPress={() => router.push('/legal?section=privacy')}
                >
                  Privacy Policy
                </Text>
              </View>
            </View>

            <Pressable
              onPress={handleGoogleAuth}
              disabled={loading || appleLoading || demoLoading}
              style={({ pressed }) => [styles.signInRow, pressed && { opacity: 0.65 }]}
            >
              <Text style={[styles.signInMuted, { color: colors.mutedForeground }]}>
                Already have an account?{' '}
                <Text style={[styles.signInAccent, { color: colors.primary }]}>Sign in</Text>
              </Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safe: {
    flex: 1,
    zIndex: 1,
  },
  page: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 12,
  },
  hero: {
    alignItems: 'center',
    paddingTop: 0,
  },
  logoMarkWrap: {
    width: 98,
    height: 98,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    overflow: 'visible',
  },
  logoAuraOuter: {
    position: 'absolute',
    width: 144,
    height: 144,
    left: -23,
    top: -23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoGlow: {
    width: 144,
    height: 144,
    borderRadius: 72,
  },
  logoHalo: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#e91e8c',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 22,
    elevation: 8,
  },
  logoImg: {
    width: 64,
    height: 64,
  },
  wordmark: {
    marginTop: 7,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    opacity: 0.9,
  },
  headline: {
    marginTop: 8,
    fontSize: 37,
    fontWeight: '800',
    letterSpacing: -1.3,
    textAlign: 'center',
    lineHeight: 39,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 10,
    maxWidth: 320,
  },
  benefitsWrap: {
    marginTop: 0,
  },
  auth: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    alignItems: 'stretch',
    marginTop: 0,
  },
  authShell: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 11,
    gap: 9,
    shadowColor: '#1a0d2e',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 6,
  },
  authIntro: {
    gap: 6,
  },
  authEyebrow: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  authEyebrowText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  authCaption: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    letterSpacing: -0.2,
  },
  appleWrap: {
    width: '100%',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.16,
        shadowRadius: 16,
      },
      android: { elevation: 6 },
    }),
  },
  appleNative: {
    width: '100%',
    height: CTA_H,
  },
  appleOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 16,
  },
  googleBtn: {
    alignSelf: 'stretch',
    width: '100%',
    minHeight: CTA_H,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#1a0d2e',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.14,
        shadowRadius: 16,
      },
      android: { elevation: 6 },
    }),
  },
  pressedBtn: {
    opacity: 0.92,
    transform: [{ scale: 0.995 }],
  },
  googleGradient: {
    minHeight: CTA_H,
    borderRadius: 16,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  googleBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  googleIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleLabelPrimary: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.25,
    textAlign: 'center',
  },
  demoBtn: {
    width: '100%',
    minHeight: CTA_H,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  demoBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  demoIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoTextWrap: {
    flex: 1,
    gap: 1,
  },
  demoLabelPrimary: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  demoLabelSecondary: {
    fontSize: 12,
    lineHeight: 16,
  },
  termsWrap: {
    width: '100%',
    marginTop: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  termsLead: {
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'center',
    opacity: 0.82,
    maxWidth: 290,
  },
  termsLinksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    gap: 0,
  },
  termsLink: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
  },
  termsDot: {
    fontSize: 11,
    lineHeight: 15,
    opacity: 0.6,
  },
  signInRow: {
    marginTop: 2,
    paddingVertical: 4,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInMuted: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.2,
    textAlign: 'center',
    width: '100%',
  },
  signInAccent: {
    fontWeight: '700',
  },
});
