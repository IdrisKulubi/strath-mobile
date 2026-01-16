import React, { useEffect } from 'react';
import { View, StyleSheet, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    withDelay,
    Easing,
    interpolate,
} from 'react-native-reanimated';
import { Text } from '@/components/ui/text';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
    onFinish?: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
    const heartScale = useSharedValue(1);
    const heartOpacity = useSharedValue(0);
    const textOpacity = useSharedValue(0);
    const pulseRing1 = useSharedValue(0);
    const pulseRing2 = useSharedValue(0);

    useEffect(() => {
        // Fade in the heart
        heartOpacity.value = withTiming(1, { duration: 600 });

        // Start the heartbeat animation after a small delay
        heartScale.value = withDelay(
            400,
            withRepeat(
                withSequence(
                    // First beat (stronger)
                    withTiming(1.15, { duration: 120, easing: Easing.out(Easing.ease) }),
                    withTiming(1, { duration: 100, easing: Easing.in(Easing.ease) }),
                    // Second beat (lighter)
                    withTiming(1.08, { duration: 100, easing: Easing.out(Easing.ease) }),
                    withTiming(1, { duration: 120, easing: Easing.in(Easing.ease) }),
                    // Pause between heartbeats
                    withTiming(1, { duration: 500 })
                ),
                -1, // infinite repeat
                false
            )
        );

        // Pulse rings animation
        pulseRing1.value = withDelay(
            600,
            withRepeat(
                withSequence(
                    withTiming(1, { duration: 1200, easing: Easing.out(Easing.ease) }),
                    withTiming(0, { duration: 0 })
                ),
                -1,
                false
            )
        );

        pulseRing2.value = withDelay(
            1000,
            withRepeat(
                withSequence(
                    withTiming(1, { duration: 1200, easing: Easing.out(Easing.ease) }),
                    withTiming(0, { duration: 0 })
                ),
                -1,
                false
            )
        );

        // Fade in text
        textOpacity.value = withDelay(800, withTiming(1, { duration: 500 }));

        // Call onFinish after splash duration if provided
        if (onFinish) {
            const timer = setTimeout(onFinish, 3000);
            return () => clearTimeout(timer);
        }
    }, []);

    const heartAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: heartScale.value }],
        opacity: heartOpacity.value,
    }));

    const textAnimatedStyle = useAnimatedStyle(() => ({
        opacity: textOpacity.value,
    }));

    const pulseRing1Style = useAnimatedStyle(() => ({
        transform: [{ scale: interpolate(pulseRing1.value, [0, 1], [0.8, 1.8]) }],
        opacity: interpolate(pulseRing1.value, [0, 0.5, 1], [0.6, 0.3, 0]),
    }));

    const pulseRing2Style = useAnimatedStyle(() => ({
        transform: [{ scale: interpolate(pulseRing2.value, [0, 1], [0.8, 1.6]) }],
        opacity: interpolate(pulseRing2.value, [0, 0.5, 1], [0.4, 0.2, 0]),
    }));

    return (
        <LinearGradient
            colors={['#7B4397', '#9B4DCA', '#E91E8C', '#DC2884']}
            locations={[0, 0.3, 0.7, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.container}
        >
            <View style={styles.content}>
                {/* Pulse Rings */}
                <Animated.View style={[styles.pulseRing, pulseRing1Style]} />
                <Animated.View style={[styles.pulseRing, pulseRing2Style]} />

                {/* Heart Container with Logo */}
                <Animated.View style={[styles.heartContainer, heartAnimatedStyle]}>
                    <View style={styles.heartShape}>
                        <Image
                            source={require('@/assets/images/logos/LOGO.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    </View>
                </Animated.View>

                {/* App Name and Loading Text */}
                <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
                    <Text style={styles.appName}>Strathspace</Text>
                    <Text style={styles.loadingText}>Loading...</Text>
                </Animated.View>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pulseRing: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        borderWidth: 3,
        borderColor: 'rgba(255, 255, 255, 0.4)',
    },
    heartContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    heartShape: {
        width: 160,
        height: 160,
        backgroundColor: '#FFFFFF',
        borderRadius: 80,
        justifyContent: 'center',
        alignItems: 'center',
        // Heart-like shape using transform
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 12,
    },
    logo: {
        width: 90,
        height: 90,
    },
    textContainer: {
        position: 'absolute',
        bottom: height * 0.15,
        alignItems: 'center',
    },
    appName: {
        fontSize: 24,
        fontWeight: '600',
        color: '#FFFFFF',
        letterSpacing: 1,
        marginBottom: 8,
    },
    loadingText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '400',
    },
});
