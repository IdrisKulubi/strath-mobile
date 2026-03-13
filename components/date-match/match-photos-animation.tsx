import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withRepeat,
    withSequence,
    withTiming,
    withDelay,
    Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { CachedImage } from '@/components/ui/cached-image';
import { useTheme } from '@/hooks/use-theme';

interface MatchPhotosAnimationProps {
    myPhoto?: string | null;
    theirPhoto?: string | null;
    theirName: string;
}

export function MatchPhotosAnimation({ myPhoto, theirPhoto, theirName }: MatchPhotosAnimationProps) {
    const { colors } = useTheme();

    // Photos slide in from opposite sides
    const leftX = useSharedValue(-80);
    const rightX = useSharedValue(80);
    const photosOpacity = useSharedValue(0);

    // Heart pops in after photos arrive, then pulses
    const heartScale = useSharedValue(0);
    const heartOpacity = useSharedValue(0);

    // Rings around the heart
    const ring1Scale = useSharedValue(1);
    const ring1Opacity = useSharedValue(0.6);

    useEffect(() => {
        // Photos slide in
        leftX.value = withSpring(0, { damping: 16, stiffness: 180 });
        rightX.value = withSpring(0, { damping: 16, stiffness: 180 });
        photosOpacity.value = withTiming(1, { duration: 320 });

        // Heart pops in after 380ms
        heartScale.value = withDelay(
            380,
            withSpring(1, { damping: 10, stiffness: 280 }),
        );
        heartOpacity.value = withDelay(380, withTiming(1, { duration: 180 }));

        // Heart pulses continuously
        heartScale.value = withDelay(
            700,
            withRepeat(
                withSequence(
                    withTiming(1.15, { duration: 600, easing: Easing.inOut(Easing.ease) }),
                    withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
                ),
                -1,
                false,
            ),
        );

        // Ring pulses outward
        ring1Scale.value = withDelay(
            700,
            withRepeat(
                withSequence(
                    withTiming(1.8, { duration: 900, easing: Easing.out(Easing.ease) }),
                    withTiming(1, { duration: 0 }),
                ),
                -1,
                false,
            ),
        );
        ring1Opacity.value = withDelay(
            700,
            withRepeat(
                withSequence(
                    withTiming(0, { duration: 900, easing: Easing.out(Easing.ease) }),
                    withTiming(0.5, { duration: 0 }),
                ),
                -1,
                false,
            ),
        );
    }, [heartOpacity, heartScale, leftX, photosOpacity, ring1Opacity, ring1Scale, rightX]);

    const leftStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: leftX.value }],
        opacity: photosOpacity.value,
    }));
    const rightStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: rightX.value }],
        opacity: photosOpacity.value,
    }));
    const heartStyle = useAnimatedStyle(() => ({
        transform: [{ scale: heartScale.value }],
        opacity: heartOpacity.value,
    }));
    const ringStyle = useAnimatedStyle(() => ({
        transform: [{ scale: ring1Scale.value }],
        opacity: ring1Opacity.value,
    }));

    return (
        <View style={styles.container}>
            {/* Left photo — current user */}
            <Animated.View style={[styles.photoWrap, leftStyle]}>
                <View style={[styles.photoRing, { borderColor: colors.primary }]}>
                    {myPhoto ? (
                        <CachedImage uri={myPhoto} style={styles.photo} fallbackType="avatar" />
                    ) : (
                        <View style={[styles.photo, styles.photoFallback, { backgroundColor: colors.muted }]}>
                            <Ionicons name="person" size={36} color={colors.mutedForeground} />
                        </View>
                    )}
                </View>
            </Animated.View>

            {/* Heart in the middle */}
            <View style={styles.heartWrap}>
                {/* Pulsing ring behind heart */}
                <Animated.View
                    style={[
                        styles.heartRing,
                        ringStyle,
                        { borderColor: colors.primary },
                    ]}
                />
                <Animated.View style={heartStyle}>
                    <Ionicons name="heart" size={34} color={colors.primary} />
                </Animated.View>
            </View>

            {/* Right photo — their profile */}
            <Animated.View style={[styles.photoWrap, rightStyle]}>
                <View style={[styles.photoRing, { borderColor: colors.primary }]}>
                    {theirPhoto ? (
                        <CachedImage uri={theirPhoto} style={styles.photo} fallbackType="avatar" />
                    ) : (
                        <View style={[styles.photo, styles.photoFallback, { backgroundColor: colors.muted }]}>
                            <Ionicons name="person" size={36} color={colors.mutedForeground} />
                        </View>
                    )}
                </View>
            </Animated.View>
        </View>
    );
}

const PHOTO_SIZE = 96;

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0,
    },
    photoWrap: {
        zIndex: 1,
    },
    photoRing: {
        width: PHOTO_SIZE + 6,
        height: PHOTO_SIZE + 6,
        borderRadius: (PHOTO_SIZE + 6) / 2,
        borderWidth: 3,
        padding: 2,
        overflow: 'hidden',
    },
    photo: {
        width: PHOTO_SIZE,
        height: PHOTO_SIZE,
        borderRadius: PHOTO_SIZE / 2,
    },
    photoFallback: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    heartWrap: {
        width: 56,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    },
    heartRing: {
        position: 'absolute',
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2,
    },
});
