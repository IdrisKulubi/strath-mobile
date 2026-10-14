import { ConnectionSplash } from '@/components/intro/connection-splash';

export function ReturningUserSplash({ onComplete }: { onComplete: () => void }) {
  return <ConnectionSplash onComplete={onComplete} />;
}
