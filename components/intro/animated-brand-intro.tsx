import { ConnectionSplash } from '@/components/intro/connection-splash';

/** First launch continues into the existing Rising welcome slides. */
export function AnimatedBrandIntro({ onComplete }: { onComplete: () => void }) {
  return <ConnectionSplash onComplete={onComplete} />;
}
