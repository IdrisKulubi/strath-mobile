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

interface VoiceRecordingOverlayProps {
    isRecording: boolean;
    isTranscribing: boolean;
    /** Live partial transcript while user is speaking */
    liveTranscript?: string;
    /** Volume level from speech recognition (-2 to 10) */
    volume?: number;
    onStop: () => void;
    onCancel: () => void;
}

export function VoiceRecordingOverlay({
    isRecording,
    isTranscribing,
    liveTranscript = '',
    volume = 0,
    onStop,
    onCancel,
}: VoiceRecordingOverlayProps) {
    const { colors, colorScheme } = useTheme();
    const isDark = colorScheme === 'dark';

    // Pulsing ring animation — scales react to volume
    const ring1Scale = useSharedValue(1);
    const ring2Scale = useSharedValue(1);
    const ring3Scale = useSharedValue(1);
    const ring1Opacity = useSharedValue(0.4);
    const ring2Opacity = useSharedValue(0.3);
    const ring3Opacity = useSharedValue(0.2);

    // Volume-driven ring scaling
    useEffect(() => {
        if (isRecording && volume > 0) {
            // Map volume (0–10) to extra scale (0–0.6)
            const extra = Math.min(volume / 10, 1) * 0.6;
            ring1Scale.value = withSpring(1.4 + extra, { damping: 12, stiffness: 180 });
            ring2Scale.value = withSpring(1.7 + extra, { damping: 12, stiffness: 160 });
            ring3Scale.value = withSpring(2.0 + extra, { damping: 12, stiffness: 140 });
        }
    }, [volume, isRecording, ring1Scale, ring2Scale, ring3Scale]);

    useEffect(() => {
        if (isRecording) {
            // Base pulsing animation
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
                        style={[styles.micButton, { backgroundColor: '#ef4444' }]}
                    >
                        <Stop size={32} color="#fff" weight="fill" />
                    </Pressable>
                </View>

                {/* Live transcript — shows what the user is saying in real-time */}
                {liveTranscript.length > 0 && (
                    <Animated.View entering={FadeIn.duration(150)} style={styles.liveTranscriptBox}>
                        <Text style={[styles.liveTranscriptText, { color: colors.foreground }]}>
                            &ldquo;{liveTranscript}&rdquo;
                        </Text>
                    </Animated.View>
                )}

                {/* Status text */}
                <Text style={[styles.statusText, { color: colors.foreground }]}>
                    {liveTranscript.length > 0
                        ? "Listening..."
                        : "Speak now — describe who you're looking for"
                    }
                </Text>

                <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                    Stops automatically when you pause speaking
                </Text>

                {/* Cancel button */}
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
    liveTranscriptBox: {
        maxWidth: '85%',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    liveTranscriptText: {
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
        fontStyle: 'italic',
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
