import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    Image,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withDelay,
    withSequence,
    withRepeat,
    Easing,
    FadeInUp,
    ZoomIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Heart, Star, Sparkle, Rocket, CheckCircle } from 'phosphor-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Custom Confetti Piece Component
const ConfettiPiece = ({ delay, startX, color }: { delay: number; startX: number; color: string }) => {
    const translateY = useSharedValue(-50);
    const translateX = useSharedValue(startX);
    const rotation = useSharedValue(0);
    const opacity = useSharedValue(1);
    const scale = useSharedValue(0);

    useEffect(() => {
        // Start animation with delay
        scale.value = withDelay(delay, withSpring(1, { damping: 8 }));
        translateY.value = withDelay(delay, withTiming(SCREEN_HEIGHT + 100, { 
            duration: 3000 + Math.random() * 2000, 
            easing: Easing.out(Easing.quad) 
        }));
        translateX.value = withDelay(delay, withSequence(
            withTiming(startX + (Math.random() - 0.5) * 100, { duration: 1000 }),
            withTiming(startX + (Math.random() - 0.5) * 150, { duration: 1000 }),
            withTiming(startX + (Math.random() - 0.5) * 100, { duration: 1000 })
        ));
        rotation.value = withDelay(delay, withRepeat(
            withTiming(360, { duration: 1000 + Math.random() * 1000 }),
            -1,
            false
        ));
        opacity.value = withDelay(delay + 2500, withTiming(0, { duration: 500 }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { rotate: `${rotation.value}deg` },
            { scale: scale.value },
        ],
        opacity: opacity.value,
    }));

    const size = 8 + Math.random() * 8;
    const isCircle = Math.random() > 0.5;

    return (
        <Animated.View
            style={[
                styles.confettiPiece,
                animatedStyle,
                {
                    width: size,
                    height: isCircle ? size : size * 2,
                    backgroundColor: color,
                    borderRadius: isCircle ? size / 2 : 2,
                },
            ]}
        />
    );
};

// Custom Confetti Component
const CustomConfetti = () => {
    const colors = ['#ec4899', '#f43f5e', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#f472b6'];
    const pieces = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        delay: Math.random() * 500,
        startX: Math.random() * SCREEN_WIDTH,
        color: colors[Math.floor(Math.random() * colors.length)],
    }));

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {pieces.map((piece) => (
                <ConfettiPiece key={piece.id} {...piece} />
            ))}
        </View>
    );
};

interface LaunchCelebrationProps {
    userName: string;
    mainPhoto?: string;
    onComplete: () => void;
    isLoading?: boolean;
}

// Animated floating element
const FloatingIcon = ({
    Icon,
    color,
    delay,
    x,
    size,
}: {
    Icon: any;
    color: string;
    delay: number;
    x: number;
    size: number;
}) => {
    const translateY = useSharedValue(SCREEN_HEIGHT);
    const scale = useSharedValue(0);
    const rotation = useSharedValue(0);
    const opacity = useSharedValue(0);

    useEffect(() => {
        translateY.value = withDelay(delay, withTiming(-100, { duration: 4000, easing: Easing.out(Easing.cubic) }));
        scale.value = withDelay(delay, withSpring(1, { damping: 8 }));
        opacity.value = withDelay(delay, withSequence(
            withTiming(1, { duration: 300 }),
            withDelay(3000, withTiming(0, { duration: 700 }))
        ));
        rotation.value = withDelay(delay, withRepeat(
            withTiming(360, { duration: 3000, easing: Easing.linear }),
            -1,
            false
        ));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: x },
            { translateY: translateY.value },
            { scale: scale.value },
            { rotate: `${rotation.value}deg` },
        ],
        opacity: opacity.value,
    }));

    return (
        <Animated.View style={[styles.floatingIcon, animatedStyle]}>
            <Icon size={size} color={color} weight="fill" />
        </Animated.View>
    );
};

export function LaunchCelebration({ userName, mainPhoto, onComplete, isLoading }: LaunchCelebrationProps) {
    const mainScale = useSharedValue(0);
    const mainOpacity = useSharedValue(0);
    const textScale = useSharedValue(0.8);
    const buttonOpacity = useSharedValue(0);
    const pulseScale = useSharedValue(1);

    useEffect(() => {
        // Haptic burst
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 200);
        setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 400);

        // Animations
        mainScale.value = withDelay(300, withSpring(1, { damping: 12, stiffness: 100 }));
        mainOpacity.value = withDelay(300, withTiming(1, { duration: 500 }));
        textScale.value = withDelay(600, withSpring(1, { damping: 10 }));
        buttonOpacity.value = withDelay(2500, withTiming(1, { duration: 500 }));

        // Pulse animation
        pulseScale.value = withDelay(1000, withRepeat(
            withSequence(
                withTiming(1.05, { duration: 1000 }),
                withTiming(1, { duration: 1000 })
            ),
            -1,
            true
        ));

        // Auto-navigate after celebration
        const timer = setTimeout(() => {
            onComplete();
        }, 5000);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const mainStyle = useAnimatedStyle(() => ({
        transform: [{ scale: mainScale.value }],
        opacity: mainOpacity.value,
    }));

    const textStyle = useAnimatedStyle(() => ({
        transform: [{ scale: textScale.value }],
    }));

    const buttonStyle = useAnimatedStyle(() => ({
        opacity: buttonOpacity.value,
    }));

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseScale.value }],
    }));

    // Generate floating icons
    const floatingIcons = [
        { Icon: Heart, color: '#ec4899', delay: 0, x: SCREEN_WIDTH * 0.1, size: 24 },
        { Icon: Star, color: '#f59e0b', delay: 200, x: SCREEN_WIDTH * 0.3, size: 20 },
        { Icon: Sparkle, color: '#8b5cf6', delay: 400, x: SCREEN_WIDTH * 0.5, size: 28 },
        { Icon: Heart, color: '#f43f5e', delay: 600, x: SCREEN_WIDTH * 0.7, size: 22 },
        { Icon: Star, color: '#10b981', delay: 800, x: SCREEN_WIDTH * 0.9, size: 26 },
        { Icon: Heart, color: '#ec4899', delay: 1000, x: SCREEN_WIDTH * 0.2, size: 20 },
        { Icon: Sparkle, color: '#3b82f6', delay: 1200, x: SCREEN_WIDTH * 0.6, size: 24 },
        { Icon: Star, color: '#f472b6', delay: 1400, x: SCREEN_WIDTH * 0.8, size: 22 },
    ];

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#0f0d23', '#1a0d2e', '#2d1347']}
                style={StyleSheet.absoluteFill}
            />

            {/* Confetti */}
            <CustomConfetti />

            {/* Floating icons */}
            {floatingIcons.map((icon, index) => (
                <FloatingIcon key={index} {...icon} />
            ))}

            {/* Main content */}
            <View style={styles.content}>
                {/* Success badge */}
                <Animated.View style={mainStyle}>
                    <Animated.View style={[styles.avatarContainer, pulseStyle]}>
                        {mainPhoto ? (
                            <Image source={{ uri: mainPhoto }} style={styles.avatar} />
                        ) : (
                            <LinearGradient
                                colors={['#ec4899', '#f43f5e']}
                                style={styles.avatarPlaceholder}
                            >
                                <Text style={styles.avatarInitial}>
                                    {userName.charAt(0).toUpperCase()}
                                </Text>
                            </LinearGradient>
                        )}
                        
                        {/* Success checkmark */}
                        <View style={styles.checkBadge}>
                            <CheckCircle size={32} color="#10b981" weight="fill" />
                        </View>
                    </Animated.View>
                </Animated.View>

                {/* Text */}
                <Animated.View style={[styles.textContainer, textStyle]}>
                    <Animated.Text entering={FadeInUp.delay(800)} style={styles.title}>
                        You&apos;re all set, {userName}! 🎉
                    </Animated.Text>
                    <Animated.Text entering={FadeInUp.delay(1000)} style={styles.subtitle}>
                        Your profile is live and ready to make connections
                    </Animated.Text>
                </Animated.View>

                {/* Stats preview */}
                <Animated.View entering={ZoomIn.delay(1500)} style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <Rocket size={24} color="#ec4899" weight="fill" />
                        <Text style={styles.statText}>Profile is live!</Text>
                    </View>
                </Animated.View>

                {/* CTA hint */}
                <Animated.Text style={[styles.ctaHint, buttonStyle]}>
                    {isLoading ? 'Setting up your profile... 🚀' : 'Taking you to discover... ✨'}
                </Animated.Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    confettiPiece: {
        position: 'absolute',
        top: -20,
    },
    floatingIcon: {
        position: 'absolute',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 32,
    },
    avatar: {
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 4,
        borderColor: '#ec4899',
    },
    avatarPlaceholder: {
        width: 140,
        height: 140,
        borderRadius: 70,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitial: {
        fontSize: 56,
        fontWeight: '800',
        color: '#fff',
    },
    checkBadge: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        backgroundColor: '#0f0d23',
        borderRadius: 20,
        padding: 4,
    },
    textContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        color: '#94a3b8',
        textAlign: 'center',
        lineHeight: 24,
    },
    statsContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        marginBottom: 40,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    statText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    ctaHint: {
        fontSize: 16,
        color: '#64748b',
        fontStyle: 'italic',
    },
});
