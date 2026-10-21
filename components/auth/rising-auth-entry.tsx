import React from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { GoogleLogo } from '@/components/icons/google-logo';
import { OnboardingScreenShell, RisingInlineFeedback } from '@/components/onboarding';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { HEIGHTS, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';

interface RisingAuthEntryProps {
  googleLoading: boolean;
  appleLoading: boolean;
  demoLoading: boolean;
  appleAvailable: boolean;
  demoEnabled: boolean;
  error: string | null;
  onGoogle: () => void;
  onApple: () => void;
  onDemo: () => void;
  onLegal: (section: 'terms' | 'privacy') => void;
}

export function RisingAuthEntry({ googleLoading, appleLoading, demoLoading, appleAvailable, demoEnabled, error, onGoogle, onApple, onDemo, onLegal }: RisingAuthEntryProps) {
  const { colors } = useTheme();
  const busy = googleLoading || appleLoading || demoLoading;

  return (
    <OnboardingScreenShell
      presentation="rising"
      stepIndex={0}
      progressLabel="Welcome"
      progressIndex={0}
      progressCount={1}
      showProgress={false}
      title="Make room for something real"
      subtitle="Sign in to build your profile and meet people who fit your rhythm."
      headingAccessory={
        <Image
          accessibilityLabel="StrathSpace"
          source={require('@/assets/images/logos/LOGO.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      }
      contentContainerStyle={styles.authBeat}
    >
      <View style={styles.content}>
        {error ? <RisingInlineFeedback tone="error" message={error} /> : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue with Google"
          accessibilityState={{ disabled: busy, busy: googleLoading }}
          disabled={busy}
          onPress={onGoogle}
          style={[styles.provider, { backgroundColor: colors.primary, opacity: busy && !googleLoading ? 0.5 : 1 }]}
        >
          <View style={styles.providerInner}>
            {googleLoading ? <ActivityIndicator color={colors.primaryForeground} /> : <GoogleLogo size={20} />}
            <Text style={[styles.providerLabel, { color: colors.primaryForeground }]}>Continue with Google</Text>
          </View>
        </Pressable>
        {appleAvailable ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continue with Apple"
            accessibilityState={{ disabled: busy, busy: appleLoading }}
            disabled={busy}
            onPress={onApple}
            style={[styles.provider, { backgroundColor: colors.foreground, opacity: busy && !appleLoading ? 0.5 : 1 }]}
          >
            <View style={styles.providerInner}>
              {appleLoading ? <ActivityIndicator color={colors.background} /> : <Ionicons name="logo-apple" size={22} color={colors.background} />}
              <Text style={[styles.providerLabel, { color: colors.background }]}>Continue with Apple</Text>
            </View>
          </Pressable>
        ) : null}
        {demoEnabled ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continue as demo"
            accessibilityState={{ disabled: busy, busy: demoLoading }}
            disabled={busy}
            onPress={onDemo}
            style={[styles.provider, styles.secondary, { backgroundColor: colors.control, borderColor: colors.controlBorder, opacity: busy && !demoLoading ? 0.5 : 1 }]}
          >
            <View style={styles.providerInner}>
              {demoLoading ? <ActivityIndicator color={colors.foreground} /> : <Ionicons name="flask-outline" size={20} color={colors.foreground} />}
              <Text style={[styles.providerLabel, { color: colors.foreground }]}>Continue as demo</Text>
            </View>
          </Pressable>
        ) : null}
        <View style={styles.legal}>
          <Text style={[styles.legalLead, { color: colors.mutedForeground }]}>Read how StrathSpace works before you continue.</Text>
          <View style={styles.links}>
            <Pressable accessibilityRole="link" onPress={() => onLegal('terms')} style={styles.linkTouch}>
              <Text style={[styles.link, { color: colors.primaryText }]}>Terms of Service</Text>
            </Pressable>
            <Text style={{ color: colors.mutedForeground }}>·</Text>
            <Pressable accessibilityRole="link" onPress={() => onLegal('privacy')} style={styles.linkTouch}>
              <Text style={[styles.link, { color: colors.primaryText }]}>Privacy Policy</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </OnboardingScreenShell>
  );
}

const styles = StyleSheet.create({
  authBeat: { justifyContent: 'center' },
  content: { gap: SPACING.compact, width: '100%' },
  logo: { width: 96, height: 96, alignSelf: 'center' },
  provider: { minHeight: 56, width: '100%', borderRadius: RADIUS.full, justifyContent: 'center', paddingHorizontal: SPACING.base },
  providerInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.compact, minHeight: 56 },
  providerLabel: { ...TYPOGRAPHY.body, fontWeight: '600' },
  secondary: { borderWidth: StyleSheet.hairlineWidth },
  legal: { alignItems: 'center', marginTop: SPACING.compact },
  legalLead: { ...TYPOGRAPHY.caption, textAlign: 'center' },
  links: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', gap: SPACING.tight },
  linkTouch: { minHeight: HEIGHTS.touchMin, justifyContent: 'center' },
  link: { ...TYPOGRAPHY.caption, fontWeight: '600' },
});
