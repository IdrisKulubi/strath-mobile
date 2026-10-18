import { Redirect } from 'expo-router';
import { ConnectionSplash } from '@/components/intro/connection-splash';

export default function SplashPreview() {
  if (!__DEV__) return <Redirect href="/" />;
  return <ConnectionSplash preview onComplete={() => {}} />;
}
