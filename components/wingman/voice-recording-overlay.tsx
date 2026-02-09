import React, { useEffect } from 'react';
import {
    View,
    StyleSheet,
    Pressable,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSpring,
    Easing,
    FadeIn,
    FadeOut,
    cancelAnimation,
} from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { Stop, X } from 'phosphor-react-native';
import { BlurView } from 'expo-blur';

// Screen dimensions available if needed

interface VoiceRecordingOverlayProps {
    isRecording: boolean;
    isTranscribing: boolean;
    onStop: () => void;
    onCancel: () => void;
}

export function VoiceRecordingOverlay({
    isRecording,
    isTranscribing,
    onStop,
    onCancel,
}: VoiceRecordingOverlayProps) {
    const { colors, colorScheme } = useTheme();
    const isDark = colorScheme === 'dark';

    // Pulsing ring animation
    const ring1Scale = useSharedValue(1);
    const ring2Scale = useSharedValue(1);
    const ring3Scale = useSharedValue(1);
    const ring1Opacity = useSharedValue(0.4);
    const ring2Opacity = useSharedValue(0.3);
    const ring3Opacity = useSharedValue(0.2);

    useEffect(() => {
        if (isRecording) {
            ring1Scale.value = withRepeat(
                withTiming(1.8, { duration: 1500, easing: Easing.out(Easing.ease) }),
                -1, true
            );
            ring1Opacity.value = withRepeat(
                withTiming(0, { duration: 1500 }),
                -1, true
            );

            setTimeout(() => {
                ring2Scale.value = withRepeat(
                    withTiming(2.2, { duration: 1800, easing: Easing.out(Easing.ease) }),
                    -1, true
                );
                ring2Opacity.value = withRepeat(
                    withTiming(0, { duration: 1800 }),
                    -1, true
                );
            }, 300);

            setTimeout(() => {
                ring3Scale.value = withRepeat(
                    withTiming(2.6, { duration: 2100, easing: Easing.out(Easing.ease) }),
                    -1, true
                );
                ring3Opacity.value = withRepeat(
                    withTiming(0, { duration: 2100 }),
                    -1, true
                );
            }, 600);
        } else {
            cancelAnimation(ring1Scale);
            cancelAnimation(ring2Scale);
            cancelAnimation(ring3Scale);
            ring1Scale.value = withSpring(1);
            ring2Scale.value = withSpring(1);
            ring3Scale.value = withSpring(1);
            ring1Opacity.value = withTiming(0);
            ring2Opacity.value = withTiming(0);
            ring3Opacity.value = withTiming(0);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isRecording]);

    const ring1Style = useAnimatedStyle(() => ({
        transform: [{ scale: ring1Scale.value }],
        opacity: ring1Opacity.value,
    }));

    const ring2Style = useAnimatedStyle(() => ({
        transform: [{ scale: ring2Scale.value }],
        opacity: ring2Opacity.value,
    }));

    const ring3Style = useAnimatedStyle(() => ({
        transform: [{ scale: ring3Scale.value }],
        opacity: ring3Opacity.value,
    }));

    if (!isRecording && !isTranscribing) return null;

    return (
        <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            style={styles.overlay}
        >
            <BlurView
                intensity={isDark ? 40 : 60}
                tint={isDark ? 'dark' : 'light'}
                style={StyleSheet.absoluteFill}
            />

            <View style={styles.content}>
                {/* Animated rings */}
                <View style={styles.ringContainer}>
                    <Animated.View style={[styles.ring, { borderColor: colors.primary }, ring3Style]} />
                    <Animated.View style={[styles.ring, { borderColor: colors.primary }, ring2Style]} />
                    <Animated.View style={[styles.ring, { borderColor: colors.primary }, ring1Style]} />

                    {/* Center mic button */}
                    <Pressable
                        onPress={onStop}
                        style={[styles.micButton, {
                            backgroundColor: isTranscribing ? colors.muted : '#ef4444',
                        }]}
                    >
                        {isTranscribing ? (
                            <Animated.View
                                entering={FadeIn}
                                style={styles.transcribingDots}
                            >
                                <Text style={[styles.transcribingText, { color: colors.foreground }]}>
                                    ✨ Listening...
                                </Text>
                            </Animated.View>
                        ) : (
                            <Stop size={32} color="#fff" weight="fill" />
                        )}
                    </Pressable>
                </View>

                {/* Status text */}
                <Text style={[styles.statusText, { color: colors.foreground }]}>
                    {isTranscribing
                        ? "Processing your voice..."
                        : "Speak now — describe who you're looking for"
                    }
                </Text>

                <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                    {isTranscribing
                        ? "Converting speech to text"
                        : "Tap the stop button or wait 10 seconds"
                    }
                </Text>

                {/* Cancel button */}
                {!isTranscribing && (
                    <Pressable
                        onPress={onCancel}
                        style={[styles.cancelButton, {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                        }]}
                    >
                        <X size={18} color={colors.mutedForeground} />
                        <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>
                            Cancel
                        </Text>
                    </Pressable>
                )}
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1000,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
    },
    ringContainer: {
        width: 200,
        height: 200,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ring: {
        position: 'absolute',
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 2,
    },
    micButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    transcribingDots: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    transcribingText: {
        fontSize: 13,
        fontWeight: '600',
    },
    statusText: {
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
        paddingHorizontal: 32,
    },
    hint: {
        fontSize: 13,
        fontWeight: '500',
        textAlign: 'center',
    },
    cancelButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        marginTop: 8,
    },
    cancelText: {
        fontSize: 14,
        fontWeight: '600',
    },
});
