import { StyleSheet, View } from 'react-native';

import { useOnboardingTheme, withOnboardingAlpha } from '@/lib/onboarding-theme';

export function OnboardingScreenBackdrop() {
    const theme = useOnboardingTheme();

    return (
        <>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.background }]} />
            {theme.isDark ? (
                <View
                    pointerEvents="none"
                    style={[
                        styles.darkWash,
                        { backgroundColor: withOnboardingAlpha(theme.primary, 0.06) },
                    ]}
                />
            ) : null}
        </>
    );
}

const styles = StyleSheet.create({
    darkWash: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 280,
        borderBottomLeftRadius: 120,
        borderBottomRightRadius: 120,
    },
});
