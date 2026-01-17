import React from 'react';
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
import { useEffect } from 'react';

interface NoInternetScreenProps {
    onRetry?: () => void;
}

export function NoInternetScreen({ onRetry }: NoInternetScreenProps) {
    const { colors, colorScheme } = useTheme();
    const isDark = colorScheme === 'dark';
    
    // Pulse animation for the WiFi icon
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
            // Opens iOS Settings app (WiFi settings)
            await Linking.openURL('App-Prefs:WIFI');
        } else {
            // Opens Android WiFi settings
            await Linking.sendIntent('android.settings.WIFI_SETTINGS');
        }
    };

    const handleRetry = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onRetry?.();
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.content}>
                {/* Animated WiFi Icon */}
                <Animated.View 
                    entering={FadeIn.duration(500)}
                    style={[styles.iconContainer, pulseStyle]}
                >
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

                {/* Title */}
                <Animated.View entering={FadeInDown.delay(200).duration(500)}>
                    <Text style={[styles.title, { color: colors.foreground }]}>
                        No Internet Connection
                    </Text>
                </Animated.View>

                {/* Description */}
                <Animated.View entering={FadeInDown.delay(300).duration(500)}>
                    <Text style={[styles.description, { color: colors.mutedForeground }]}>
                        Your phone is not connected to the internet. To connect, turn off Airplane Mode or connect to a Wi-Fi network.
                    </Text>
                </Animated.View>

                {/* Buttons */}
                <Animated.View 
                    entering={FadeInDown.delay(400).duration(500)}
                    style={styles.buttonsContainer}
                >
                    {/* Go to Settings Button */}
                    <Pressable
                        onPress={openSettings}
                        style={({ pressed }) => [
                            styles.settingsButton,
                            { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6' },
                            pressed && styles.buttonPressed
                        ]}
                    >
                        <Text style={[styles.settingsButtonText, { color: colors.primary }]}>
                            Go to Settings
                        </Text>
                    </Pressable>

                    {/* Retry Button */}
                    {onRetry && (
                        <Pressable
                            onPress={handleRetry}
                            style={({ pressed }) => [
                                styles.retryButton,
                                pressed && styles.buttonPressed
                            ]}
                        >
                            <Ionicons name="refresh" size={18} color={colors.mutedForeground} />
                            <Text style={[styles.retryButtonText, { color: colors.mutedForeground }]}>
                                Try Again
                            </Text>
                        </Pressable>
                    )}
                </Animated.View>
            </View>

            {/* Bottom hint */}
            <Animated.View 
                entering={FadeIn.delay(600).duration(500)}
                style={styles.bottomHint}
            >
                <Ionicons name="information-circle-outline" size={16} color={colors.mutedForeground} />
                <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
                    Make sure Wi-Fi or mobile data is turned on
                </Text>
            </Animated.View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    iconContainer: {
        marginBottom: 32,
    },
    iconBackground: {
        width: 160,
        height: 160,
        borderRadius: 80,
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
        height: 100,
        borderRadius: 2,
        transform: [{ rotate: '45deg' }],
    },
    title: {
        fontSize: 26,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 12,
    },
    description: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    buttonsContainer: {
        width: '100%',
        gap: 16,
    },
    settingsButton: {
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 14,
        alignItems: 'center',
    },
    settingsButtonText: {
        fontSize: 17,
        fontWeight: '600',
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 8,
    },
    retryButtonText: {
        fontSize: 15,
        fontWeight: '500',
    },
    buttonPressed: {
        opacity: 0.7,
    },
    bottomHint: {
        position: 'absolute',
        bottom: 40,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    hintText: {
        fontSize: 13,
    },
});
