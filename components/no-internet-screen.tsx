import React, { useEffect } from 'react';
import { View, StyleSheet, Pressable, Platform, Linking, ScrollView, useWindowDimensions } from 'react-native';
import { Text } from '@/components/ui/text';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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

const H_PAD = 28;
const CONTENT_MAX = 400;
const FOOTER_TOP_GAP = 32;

export function NoInternetScreen({ onRetry }: NoInternetScreenProps) {
    const { colors, colorScheme } = useTheme();
    const isDark = colorScheme === 'dark';
    const insets = useSafeAreaInsets();
    const { height: windowHeight } = useWindowDimensions();

    const scrollMinHeight = Math.max(0, windowHeight - insets.top - Math.max(insets.bottom, 8));

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
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: Math.max(insets.bottom, 20) },
                ]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                bounces={false}
            >
                <View style={[styles.centerColumn, { minHeight: scrollMinHeight }]}>
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
                                style={({ pressed }) => [
                                    styles.retryButton,
                                    {
                                        borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                                        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FAFAFA',
                                    },
                                    pressed && styles.buttonPressed,
                                ]}
                            >
                                <View style={styles.retryRow}>
                                    <View style={styles.retryIconBox}>
                                        <Ionicons name="refresh" size={17} color={colors.mutedForeground} />
                                    </View>
                                    <Text style={[styles.retryButtonText, { color: colors.mutedForeground }]}>
                                        Try Again
                                    </Text>
                                </View>
                            </Pressable>
                        ) : null}
                    </Animated.View>

                    <View style={{ height: FOOTER_TOP_GAP }} />

                    <Animated.View entering={FadeIn.delay(600).duration(500)} style={styles.bottomHint}>
                        <Ionicons name="information-circle-outline" size={18} color={colors.mutedForeground} />
                        <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
                            Make sure Wi-Fi or mobile data is turned on.
                        </Text>
                    </Animated.View>
                </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: H_PAD,
        paddingTop: 12,
    },
    centerColumn: {
        justifyContent: 'center',
        width: '100%',
    },
    content: {
        width: '100%',
        maxWidth: CONTENT_MAX,
        alignSelf: 'center',
        alignItems: 'center',
    },
    iconContainer: {
        marginBottom: 22,
        paddingVertical: 10,
        paddingHorizontal: 10,
        overflow: 'visible',
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
        alignItems: 'center',
        paddingTop: 4,
        paddingBottom: 2,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        textAlign: 'center',
        letterSpacing: -0.3,
        paddingHorizontal: 8,
        lineHeight: 30,
        ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
    },
    descBlock: {
        width: '100%',
        marginBottom: 28,
        paddingHorizontal: 2,
    },
    description: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
    },
    buttonsContainer: {
        width: '100%',
        alignItems: 'stretch',
        gap: 12,
    },
    settingsButton: {
        width: '100%',
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    settingsButtonText: {
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    retryButton: {
        width: '100%',
        borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth * 2,
        overflow: 'hidden',
    },
    retryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        paddingHorizontal: 20,
        minHeight: 52,
    },
    retryIconBox: {
        width: 22,
        height: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    retryButtonText: {
        fontSize: 15,
        fontWeight: '600',
        lineHeight: 20,
        textAlign: 'center',
        ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
    },
    buttonPressed: {
        opacity: 0.72,
    },
    bottomHint: {
        alignItems: 'center',
        gap: 10,
        width: '100%',
        maxWidth: CONTENT_MAX,
        alignSelf: 'center',
        paddingHorizontal: 8,
    },
    hintText: {
        fontSize: 12,
        lineHeight: 18,
        textAlign: 'center',
        width: '100%',
        maxWidth: CONTENT_MAX - 24,
    },
});
