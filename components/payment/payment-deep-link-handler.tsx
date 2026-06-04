import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

/**
 * Completes in-app browser auth sessions and routes payment deep links to Dates.
 */
export function PaymentDeepLinkHandler() {
    const router = useRouter();

    useEffect(() => {
        const handleUrl = (url: string) => {
            if (!url.includes('payments/')) {
                return;
            }

            WebBrowser.maybeCompleteAuthSession();

            if (url.includes('payments/success') || url.includes('payments/failed')) {
                router.push('/(tabs)/dates');
            }
        };

        Linking.getInitialURL()
            .then((url) => {
                if (url) handleUrl(url);
            })
            .catch(() => undefined);

        const subscription = Linking.addEventListener('url', (event) => {
            handleUrl(event.url);
        });

        return () => subscription.remove();
    }, [router]);

    return null;
}
