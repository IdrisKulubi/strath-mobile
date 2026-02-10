import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withDelay,
    withSequence,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Heart, Sparkle, Star } from 'phosphor-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface WelcomeSplashProps {
    onStart: () => void;
    onBackToLogin?: () => void;
}

// Floating hearts animation
const FloatingHeart = ({ delay, startX }: { delay: number; startX: number }) => {
    const translateY = useSharedValue(SCREEN_HEIGHT);
    const translateX = useSharedValue(startX);
    const opacity = useSharedValue(0);
    const scale = useSharedValue(0.5);
    const rotation = useSharedValue(0);

    useEffect(() => {
        translateY.value = withDelay(
            delay,
            withTiming(-100, { duration: 8000 })
        );
        opacity.value = withDelay(delay, withSequence(
            withTiming(0.6, { duration: 500 }),
            withDelay(6000, withTiming(0, { duration: 1500 }))
        ));
        scale.value = withDelay(delay, withSpring(1, { damping: 8 }));
        rotation.value = withDelay(
            delay,
            withTiming(Math.random() > 0.5 ? 30 : -30, { duration: 8000 })
        );
        translateX.value = withDelay(
            delay,
            withTiming(startX + (Math.random() - 0.5) * 100, { duration: 8000 })
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateY: translateY.value },
            { translateX: translateX.value },
            { scale: scale.value },
            { rotate: `${rotation.value}deg` },
        ],
        opacity: opacity.value,
    }));

    const colors = ['#ec4899', '#f43f5e', '#8b5cf6', '#f472b6'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    return (
        <Animated.View style={[styles.floatingHeart, animatedStyle]}>
            <Heart size={24 + Math.random() * 20} color={color} weight="fill" />
        </Animated.View>
    );
};

export function WelcomeSplash({ onStart, onBackToLogin }: WelcomeSplashProps) {
    const titleOpacity = useSharedValue(0);
    const titleTranslateY = useSharedValue(30);
    const subtitleOpacity = useSharedValue(0);
    const buttonScale = useSharedValue(0);
    const buttonOpacity = useSharedValue(0);
    const sparkleRotation = useSharedValue(0);

    useEffect(() => {
        // Staggered entrance animations
        titleOpacity.value = withDelay(300, withTiming(1, { duration: 800 }));
        titleTranslateY.value = withDelay(300, withSpring(0, { damping: 12 }));
        subtitleOpacity.value = withDelay(600, withTiming(1, { duration: 800 }));
        buttonOpacity.value = withDelay(1000, withTiming(1, { duration: 500 }));
        buttonScale.value = withDelay(1000, withSpring(1, { damping: 10, stiffness: 100 }));
        
        // Continuous sparkle rotation
        sparkleRotation.value = withTiming(360, { duration: 20000 });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const titleStyle = useAnimatedStyle(() => ({
        opacity: titleOpacity.value,
        transform: [{ translateY: titleTranslateY.value }],
    }));

    const subtitleStyle = useAnimatedStyle(() => ({
        opacity: subtitleOpacity.value,
    }));

    const buttonStyle = useAnimatedStyle(() => ({
        opacity: buttonOpacity.value,
        transform: [{ scale: buttonScale.value }],
    }));

    const sparkleStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${sparkleRotation.value}deg` }],
    }));

    const handleStart = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        // Button press animation
        buttonScale.value = withSequence(
            withTiming(0.9, { duration: 100 }),
            withTiming(1.1, { duration: 100 }),
            withTiming(0, { duration: 200 })
        );
        setTimeout(() => {
            onStart();
        }, 400);
    };

    // Generate floating hearts
    const hearts = Array.from({ length: 15 }, (_, i) => ({
        id: i,
        delay: i * 400,
        startX: Math.random() * SCREEN_WIDTH,
    }));

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#0f0d23', '#1a0d2e', '#2d1347']}
                style={StyleSheet.absoluteFill}
            />

            {/* Floating hearts background */}
            {hearts.map((heart) => (
                <FloatingHeart key={heart.id} delay={heart.delay} startX={heart.startX} />
            ))}

            {/* Sparkle decoration */}
            <Animated.View style={[styles.sparkleContainer, sparkleStyle]}>
                <Star size={200} color="rgba(236, 72, 153, 0.1)" weight="fill" />
            </Animated.View>

            {/* Main content */}
            <View style={styles.content}>
                {/* Logo/Icon */}
                <Animated.View style={[styles.logoContainer, titleStyle]}>
                    <LinearGradient
                        colors={['#ec4899', '#f43f5e']}
                        style={styles.logoGradient}
                    >
                        <Heart size={48} color="#fff" weight="fill" />
                    </LinearGradient>
                </Animated.View>

                {/* Title */}
                <Animated.Text style={[styles.title, titleStyle]}>
                    Ready to find{'\n'}your person?
                </Animated.Text>

                {/* Subtitle */}
                <Animated.Text style={[styles.subtitle, subtitleStyle]}>
                    {"Let's set up your profile in just a few taps.\n"}
                    {"No boring forms, we promise ✨"}
                </Animated.Text>

                {/* Start Button */}
                <Animated.View style={[styles.buttonContainer, buttonStyle]}>
                    <TouchableOpacity onPress={handleStart} activeOpacity={0.9}>
                        <LinearGradient
                            colors={['#ec4899', '#f43f5e']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.button}
                        >
                            <Text style={styles.buttonText}>{"Let's Go"}</Text>
                            <Sparkle size={20} color="#fff" weight="fill" />
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>

                {/* Time estimate */}
                <Animated.Text style={[styles.timeEstimate, subtitleStyle]}>
                    ⏱️ Takes about 2-3 minutes
                </Animated.Text>

                {/* Back to Login */}
                {onBackToLogin && (
                    <Animated.View style={[{ marginTop: 24 }, subtitleStyle]}>
                        <TouchableOpacity onPress={onBackToLogin} activeOpacity={0.7}>
                            <Text style={styles.backToLoginText}>← Back to Login</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    floatingHeart: {
        position: 'absolute',
    },
    sparkleContainer: {
        position: 'absolute',
        top: '20%',
        right: -50,
        opacity: 0.5,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    logoContainer: {
        marginBottom: 32,
    },
    logoGradient: {
        width: 100,
        height: 100,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#ec4899',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 12,
    },
    title: {
        fontSize: 36,
        fontWeight: '800',
        color: '#fff',
        textAlign: 'center',
        lineHeight: 44,
        marginBottom: 16,
    },
    subtitle: {
        fontSize: 16,
        color: '#94a3b8',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 48,
    },
    buttonContainer: {
        marginBottom: 24,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        paddingHorizontal: 48,
        borderRadius: 30,
        gap: 10,
        shadowColor: '#ec4899',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 8,
    },
    buttonText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
    },
    timeEstimate: {
        fontSize: 14,
        color: '#64748b',
    },
    backToLoginText: {
        fontSize: 15,
        color: '#94a3b8',
        textDecorationLine: 'underline',
    },
});
