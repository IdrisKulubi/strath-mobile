import { useState, useCallback } from 'react';
import { AnimatedBrandIntro } from '@/components/intro/animated-brand-intro';
import { FirstLaunchIntroSlides } from '@/components/intro/first-launch-intro-slides';
import { ReturningUserSplash } from '@/components/intro/returning-user-splash';

type Phase = 'newUserBrand' | 'newUserSlides';

type Props = {
  /** First install: full cinematic intro + editorial slides */
  isNewUserIntro: boolean;
  onComplete: () => void;
};

export function LaunchExperience({ isNewUserIntro, onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>('newUserBrand');

  const onNewUserBrandDone = useCallback(() => {
    setPhase('newUserSlides');
  }, []);

  if (!isNewUserIntro) {
    return <ReturningUserSplash onComplete={onComplete} />;
  }

  if (phase === 'newUserBrand') {
    return <AnimatedBrandIntro onComplete={onNewUserBrandDone} />;
  }

  return <FirstLaunchIntroSlides onComplete={onComplete} />;
}
