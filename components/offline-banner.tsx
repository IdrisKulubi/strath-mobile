import React, { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { useNetwork } from '@/hooks/use-network';

/**
 * Thin, non-blocking banner that slides down from the top of the screen when
 * the device is confidently offline. Replaces the full-screen "NoInternet"
 * takeover for authenticated users, so they keep their navigation state and
 * whatever cached content they had.
 */
export function OfflineBanner() {
    const { colors, isDark } = useTheme();
    const { isOffline } = useNetwork();
    const insets = useSafeAreaInsets();

    const progress = useSharedValue(0);
    const [rendered, setRendered] = React.useState(false);

    useEffect(() => {
        if (isOffline) {
            setRendered(true);
            progress.value = withTiming(1, { duration: 220 });
        } else {
            progress.value = withTiming(0, { duration: 220 }, (finished) => {
                if (finished) {
                    runOnJS(setRendered)(false);
                }
            });
        }
    }, [isOffline, progress]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: progress.value,
        transform: [
            {
                translateY: (1 - progress.value) * -12,
            },
        ],
    }));

    if (!rendered) return null;

    const topInset = Math.max(insets.top, Platform.OS === 'android' ? 8 : 0);

    return (
        <Animated.View
            pointerEvents="none"
            style={[
                styles.container,
                {
                    paddingTop: topInset + 6,
                    backgroundColor: isDark
                        ? 'rgba(31, 17, 45, 0.96)'
                        : 'rgba(255, 250, 235, 0.96)',
                    borderBottomColor: colors.border,
                },
                animatedStyle,
            ]}
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
        >
            <View style={styles.row}>
                <Ionicons
                    name="cloud-offline-outline"
                    size={16}
                    color={isDark ? '#F5D3A7' : '#8A4B08'}
                    style={styles.icon}
                />
                <Text
                    style={[
                        styles.text,
                        { color: isDark ? '#F5D3A7' : '#8A4B08' },
                    ]}
                    numberOfLines={1}
                >
                    You&apos;re offline — some features may be unavailable.
                </Text>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        paddingBottom: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        zIndex: 1000,
        elevation: 12,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: {
        marginRight: 6,
    },
    text: {
        fontSize: 12.5,
        fontWeight: '600',
        letterSpacing: 0.1,
    },
});
