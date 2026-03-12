import React, { useEffect } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSpring,
    withSequence,
    withDelay,
    Easing,
    FadeIn,
    FadeOut,
    cancelAnimation,
} from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { Microphone, X } from 'phosphor-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

interface VoiceRecordingOverlayProps {
    isRecording: boolean;
    isTranscribing: boolean;
    liveTranscript?: string;
    volume?: number;
    onStop: () => void;
    onCancel: () => void;
}

// ── Waveform bar ─────────────────────────────────────────────────────────────
const BAR_COUNT = 7;
const BAR_MAX_H = 46;
// Staggered idle peak heights (0–1) — no Math.random, fully deterministic
const IDLE_PEAKS = [0.18, 0.38, 0.26, 0.54, 0.30, 0.44, 0.22];

function WaveBar({
    index, volume, isRecording, color,
}: { index: number; volume: number; isRecording: boolean; color: string }) {
    const h = useSharedValue(0.06);

    useEffect(() => {
        if (isRecording) {
            h.value = withDelay(
                index * 55,
                withRepeat(
                    withSequence(
                        withTiming(IDLE_PEAKS[index], {
                            duration: 370 + index * 40,
                            easing: Easing.out(Easing.sin),
                        }),
                        withTiming(0.06, {
                            duration: 370 + index * 40,
                            easing: Easing.in(Easing.sin),
                        }),
                    ),
                    -1,
                    false,
                ),
            );
        } else {
            cancelAnimation(h);
            h.value = withTiming(0.06, { duration: 250 });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isRecording]);

    useEffect(() => {
        if (isRecording && volume > 1) {
            const target = Math.min(0.22 + (volume / 10) * (0.52 + index * 0.04), 1);
            h.value = withSpring(target, { damping: 5, stiffness: 270 });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [volume, isRecording]);

    const style = useAnimatedStyle(() => ({
        height: h.value * BAR_MAX_H,
        opacity: 0.45 + h.value * 0.55,
    }));

    return (
        <Animated.View
            style={[
                styles.bar,
                { backgroundColor: color },
                style,
            ]}
        />
    );
}

// ── Overlay ──────────────────────────────────────────────────────────────────
export function VoiceRecordingOverlay({
    isRecording,
    isTranscribing,
    volume = 0,
    onStop,
    onCancel,
}: VoiceRecordingOverlayProps) {
    const { colors, colorScheme } = useTheme();
    const isDark = colorScheme === 'dark';

    // Mic orb: gentle breathing scale
    const orbScale = useSharedValue(1);
    // Glow halo: expands with volume
    const glowScale = useSharedValue(1);
    // Recording dot: blinks
    const dotOpacity = useSharedValue(1);

    useEffect(() => {
        if (isRecording) {
            orbScale.value = withRepeat(
                withSequence(
                    withTiming(1.09, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
                    withTiming(1.0, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
                ),
                -1,
                false,
            );
            dotOpacity.value = withRepeat(
                withSequence(
                    withTiming(0.2, { duration: 650 }),
                    withTiming(1, { duration: 650 }),
                ),
                -1,
                false,
            );
        } else {
            cancelAnimation(orbScale);
            cancelAnimation(dotOpacity);
            orbScale.value = withTiming(1, { duration: 300 });
            dotOpacity.value = withTiming(0, { duration: 200 });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isRecording]);

    useEffect(() => {
        if (isRecording) {
            const target = 1 + (Math.min(volume, 10) / 10) * 0.65;
            glowScale.value = withSpring(target, { damping: 6, stiffness: 160 });
        } else {
            glowScale.value = withTiming(1, { duration: 350 });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [volume, isRecording]);

    const orbStyle = useAnimatedStyle(() => ({
        transform: [{ scale: orbScale.value }],
    }));

    const glowStyle = useAnimatedStyle(() => ({
        transform: [{ scale: glowScale.value }],
        opacity: 0.18 + (glowScale.value - 1) * 0.5,
    }));

    const glowMidStyle = useAnimatedStyle(() => ({
        transform: [{ scale: glowScale.value * 0.78 }],
        opacity: 0.22 + (glowScale.value - 1) * 0.45,
    }));

    const dotStyle = useAnimatedStyle(() => ({
        opacity: dotOpacity.value,
    }));

    if (!isRecording && !isTranscribing) return null;

    const primary = colors.primary as string;
    // Derived transparent variants for glow layers
    const glow1 = `${primary}18`; // ~10%
    const glow2 = `${primary}28`; // ~16%
    const gradEnd = `${primary}BB`; // ~73%

    return (
        <Animated.View
            entering={FadeIn.duration(280)}
            exiting={FadeOut.duration(280)}
            style={styles.overlay}
        >
            <BlurView
                intensity={isDark ? 58 : 72}
                tint={isDark ? 'dark' : 'light'}
                style={StyleSheet.absoluteFill}
            />

            {/* ── Recording state ── */}
            {isRecording && (
                <Animated.View
                    entering={FadeIn.duration(220)}
                    exiting={FadeOut.duration(180)}
                    style={styles.content}
                >
                    {/* Status pill */}
                    <View style={[
                        styles.statusPill,
                        {
                            backgroundColor: isDark
                                ? 'rgba(255,255,255,0.07)'
                                : 'rgba(0,0,0,0.05)',
                        },
                    ]}>
                        <Animated.View style={[styles.recDot, dotStyle]} />
                        <Text style={[styles.statusLabel, { color: colors.foreground }]}>
                            Listening
                        </Text>
                    </View>

                    {/* Orb + glow */}
                    <View style={styles.orbWrapper}>
                        <Animated.View style={[styles.glowOuter, { backgroundColor: glow1 }, glowStyle]} />
                        <Animated.View style={[styles.glowMid, { backgroundColor: glow2 }, glowMidStyle]} />
                        <Animated.View style={orbStyle}>
                            <LinearGradient
                                colors={[primary, gradEnd]}
                                start={{ x: 0.15, y: 0 }}
                                end={{ x: 0.85, y: 1 }}
                                style={styles.orb}
                            >
                                <Microphone size={38} color="#fff" weight="fill" />
                            </LinearGradient>
                        </Animated.View>
                    </View>

                    {/* Waveform bars */}
                    <View style={styles.waveRow}>
                        {Array.from({ length: BAR_COUNT }).map((_, i) => (
                            <WaveBar
                                key={i}
                                index={i}
                                volume={volume}
                                isRecording={isRecording}
                                color={primary}
                            />
                        ))}
                    </View>

                    {/* Prompt */}
                    <Text style={[styles.prompt, { color: colors.mutedForeground }]}>
                        Describe who you're looking for
                    </Text>

                    {/* Stop CTA */}
                    <Pressable
                        onPress={onStop}
                        style={[styles.stopButton, { backgroundColor: colors.foreground }]}
                    >
                        <Text style={[styles.stopText, { color: colors.background }]}>
                            Tap to finish
                        </Text>
                    </Pressable>

                    {/* Cancel */}
                    <Pressable onPress={onCancel} style={styles.cancelRow} hitSlop={12}>
                        <X size={13} color={colors.mutedForeground} />
                        <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>
                            Cancel
                        </Text>
                    </Pressable>
                </Animated.View>
            )}

            {/* ── Transcribing state (keep existing feel, small polish) ── */}
            {isTranscribing && (
                <Animated.View
                    entering={FadeIn.duration(200)}
                    style={styles.content}
                >
                    <ActivityIndicator size="large" color={primary} />
                    <Text style={[styles.transcribingTitle, { color: colors.foreground }]}>
                        Processing your voice
                    </Text>
                    <Text style={[styles.prompt, { color: colors.mutedForeground }]}>
                        Just a moment…
                    </Text>
                </Animated.View>
            )}
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
        gap: 28,
        paddingHorizontal: 32,
    },

    // Status pill
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    recDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#ef4444',
    },
    statusLabel: {
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: 0.2,
    },

    // Orb + glow
    orbWrapper: {
        width: 200,
        height: 200,
        alignItems: 'center',
        justifyContent: 'center',
    },
    glowOuter: {
        position: 'absolute',
        width: 192,
        height: 192,
        borderRadius: 96,
    },
    glowMid: {
        position: 'absolute',
        width: 148,
        height: 148,
        borderRadius: 74,
    },
    orb: {
        width: 92,
        height: 92,
        borderRadius: 46,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Waveform
    waveRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        height: BAR_MAX_H + 4,
        gap: 7,
    },
    bar: {
        width: 5,
        borderRadius: 3,
        // height is driven by animation
    },

    // Text
    prompt: {
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
        letterSpacing: 0.1,
    },
    transcribingTitle: {
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'center',
    },

    // Stop button
    stopButton: {
        paddingHorizontal: 44,
        paddingVertical: 15,
        borderRadius: 30,
        marginTop: 4,
    },
    stopText: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.2,
    },

    // Cancel
    cancelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: -8,
    },
    cancelText: {
        fontSize: 13,
        fontWeight: '500',
    },
});
