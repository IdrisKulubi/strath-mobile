import React, { useEffect } from 'react';
import { View, StyleSheet, Pressable, Platform, Linking } from 'react-native';
import { Text } from '@/components/ui/text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
    FadeIn,
    FadeInDown,
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSequence,
} from 'react-native-reanimated';

interface NoInternetScreenProps {
    onRetry?: () => void;
}

const H_PAD = 24;
const CONTENT_MAX = 400;

export function NoInternetScreen({ onRetry }: NoInternetScreenProps) {
    const { colors, colorScheme } = useTheme();
    const isDark = colorScheme === 'dark';

    const pulse = useSharedValue(1);

    useEffect(() => {
        pulse.value = withRepeat(
            withSequence(
                withTiming(1.1, { duration: 1000 }),
                withTiming(1, { duration: 1000 })
            ),
            -1,
            true
        );
    }, [pulse]);

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulse.value }],
    }));

    const openSettings = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        if (Platform.OS === 'ios') {
            await Linking.openURL('App-Prefs:WIFI');
        } else {
            await Linking.sendIntent('android.settings.WIFI_SETTINGS');
        }
    };

    const handleRetry = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onRetry?.();
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right', 'bottom']}>
            <View style={styles.main}>
                <View style={styles.content}>
                    <Animated.View entering={FadeIn.duration(500)} style={[styles.iconContainer, pulseStyle]}>
                        <LinearGradient
                            colors={isDark ? ['#3d2459', '#2d1b47'] : ['#F3F4F6', '#E5E7EB']}
                            style={styles.iconBackground}
                        >
                            <Ionicons
                                name="wifi-outline"
                                size={80}
                                color={isDark ? '#6B7280' : '#9CA3AF'}
                            />
                            <View style={styles.slashOverlay}>
                                <View style={[styles.slash, { backgroundColor: colors.destructive }]} />
                            </View>
                        </LinearGradient>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.titleBlock}>
                        <Text style={[styles.title, { color: colors.foreground }]}>No Internet Connection</Text>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.descBlock}>
                        <Text style={[styles.description, { color: colors.mutedForeground }]}>
                            Your phone is not connected to the internet. To connect, turn off Airplane Mode or connect to a
                            Wi-Fi network.
                        </Text>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.buttonsContainer}>
                        <Pressable
                            onPress={openSettings}
                            style={({ pressed }) => [
                                styles.settingsButton,
                                { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6' },
                                pressed && styles.buttonPressed,
                            ]}
                        >
                            <Text style={[styles.settingsButtonText, { color: colors.primary }]}>Go to Settings</Text>
                        </Pressable>

                        {onRetry ? (
                            <Pressable
                                onPress={handleRetry}
                                style={({ pressed }) => [styles.retryButton, pressed && styles.buttonPressed]}
                            >
                                <Ionicons name="refresh" size={18} color={colors.mutedForeground} />
                                <Text style={[styles.retryButtonText, { color: colors.mutedForeground }]}>Try Again</Text>
                            </Pressable>
                        ) : null}
                    </Animated.View>
                </View>
            </View>

            <View style={styles.footer}>
                <Animated.View entering={FadeIn.delay(600).duration(500)} style={styles.bottomHint}>
                    <Ionicons name="information-circle-outline" size={16} color={colors.mutedForeground} />
                    <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
                        Make sure Wi-Fi or mobile data is turned on
                    </Text>
                </Animated.View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    main: {
        flex: 1,
        justifyContent: 'center',
        minHeight: 0,
    },
    content: {
        width: '100%',
        maxWidth: CONTENT_MAX,
        alignSelf: 'center',
        alignItems: 'center',
        paddingHorizontal: H_PAD,
    },
    iconContainer: {
        marginBottom: 22,
    },
    iconBackground: {
        width: 140,
        height: 140,
        borderRadius: 70,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    slashOverlay: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    slash: {
        width: 4,
        height: 88,
        borderRadius: 2,
        transform: [{ rotate: '45deg' }],
    },
    titleBlock: {
        width: '100%',
        marginBottom: 10,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        textAlign: 'center',
        letterSpacing: -0.3,
    },
    descBlock: {
        width: '100%',
        marginBottom: 26,
    },
    description: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
    },
    buttonsContainer: {
        width: '100%',
        alignItems: 'stretch',
    },
    settingsButton: {
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 14,
        alignItems: 'center',
    },
    settingsButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        marginTop: 4,
    },
    retryButtonText: {
        fontSize: 15,
        fontWeight: '500',
        marginLeft: 8,
    },
    buttonPressed: {
        opacity: 0.7,
    },
    footer: {
        paddingHorizontal: H_PAD,
        paddingTop: 12,
        paddingBottom: 8,
        alignItems: 'center',
    },
    bottomHint: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        maxWidth: CONTENT_MAX,
        gap: 8,
    },
    hintText: {
        fontSize: 12,
        lineHeight: 17,
        flexShrink: 1,
        textAlign: 'center',
    },
});
