import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text as RNText, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import { Screen } from '@/components/ui/screen';
import { useTheme } from '@/hooks/use-theme';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';

export default function PaymentFailedScreen() {
    const { colors } = useTheme();
    const router = useRouter();

    useEffect(() => {
        WebBrowser.maybeCompleteAuthSession();
        const timer = setTimeout(() => {
            router.replace('/(tabs)/dates');
        }, 900);
        return () => clearTimeout(timer);
    }, [router]);

    return (
        <Screen style={styles.screen}>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <ActivityIndicator color={colors.primary} />
                <RNText style={[styles.title, { color: colors.foreground }]}>Payment not completed</RNText>
                <RNText style={[styles.subtitle, { color: colors.mutedForeground }]}>
                    You can try again from your date card.
                </RNText>
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    screen: {
        justifyContent: 'center',
        paddingHorizontal: SPACING.screenX,
    },
    card: {
        alignItems: 'center',
        gap: SPACING.compact,
        padding: SPACING.section,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
    },
    title: {
        ...TYPOGRAPHY.title,
        textAlign: 'center',
    },
    subtitle: {
        ...TYPOGRAPHY.caption,
        textAlign: 'center',
    },
});
