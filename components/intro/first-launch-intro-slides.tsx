import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { OnboardingPrimaryButton, OnboardingScreenShell, RisingInlineFeedback, useRisingBeatController } from '@/components/onboarding';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { markIntroSlidesCompleted } from '@/lib/intro-storage';

const SLIDES = [
  { title: 'Less swiping, more connection', detail: 'See a few people you are more likely to click with.' },
  { title: 'Get to know the person', detail: 'Your preferences and answers help make introductions feel relevant.' },
  { title: 'Start something real', detail: 'Build your profile, find a connection, and take it at your own pace.' },
];

export function FirstLaunchIntroSlides({ onComplete }: { onComplete: () => void }) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const { beat, advance, back } = useRisingBeatController(SLIDES.length - 1, reducedMotion);
  const [finishing, setFinishing] = useState(false);
  const [completionError, setCompletionError] = useState(false);
  const finishingRef = useRef(false);
  const slide = SLIDES[beat];

  const finish = async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setFinishing(true);
    setCompletionError(false);
    try {
      await markIntroSlidesCompleted();
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onComplete();
    } catch {
      finishingRef.current = false;
      setFinishing(false);
      setCompletionError(true);
    }
  };

  return (
    <OnboardingScreenShell
      presentation="rising"
      stepIndex={beat}
      beatKey={beat}
      progressLabel="Welcome"
      progressIndex={beat}
      progressCount={SLIDES.length}
      title={slide.title}
      subtitle={slide.detail}
      onBack={beat > 0 ? back : undefined}
      footer={
        <View style={styles.footer}>
          <OnboardingPrimaryButton appearance="rising" label={beat === SLIDES.length - 1 ? 'Get started' : 'Continue'} disabled={finishing} onPress={beat === SLIDES.length - 1 ? () => { void finish(); } : advance} />
          {beat < SLIDES.length - 1 ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Skip introduction" onPress={() => { void finish(); }} style={styles.skip}>
              <Text style={[styles.skipText, { color: colors.primaryText }]}>Skip introduction</Text>
            </Pressable>
          ) : null}
        </View>
      }
    >
      <View style={styles.body}>
        <Text style={[styles.note, { color: colors.mutedForeground }]}>You can choose what to share as you go.</Text>
        {completionError ? <RisingInlineFeedback tone="error" message="Could not open the next step. Please try again." /> : null}
      </View>
    </OnboardingScreenShell>
  );
}

const styles = StyleSheet.create({
  body: { gap: SPACING.compact },
  footer: { gap: SPACING.compact },
  skip: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  skipText: { ...TYPOGRAPHY.body, fontWeight: '600' },
  note: { ...TYPOGRAPHY.caption, textAlign: 'center' },
});
