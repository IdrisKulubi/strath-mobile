import React, { useEffect, useRef, useState, useCallback } from "react";
import {
    View,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    AppState,
    type AppStateStatus,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    cancelAnimation,
} from "react-native-reanimated";
import * as WebBrowser from "expo-web-browser";
import * as Haptics from "expo-haptics";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/hooks/use-theme";
import { useVibeCheck, type VibeCheckSession } from "@/hooks/use-vibe-check";
import { useMatches } from "@/hooks/use-matches";
import { VibeCheckDecision } from "@/components/vibe-check/vibe-check-decision";
import { Microphone, PhoneDisconnect, ArrowSquareOut, Lightbulb } from "phosphor-react-native";

const CALL_DURATION_SECONDS = 180; // 3 minutes

// ─── Timer helpers ─────────────────────────────────────────────────────────

function formatTime(secs: number): string {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
}

// ─── Pulsing mic animation ─────────────────────────────────────────────────

function PulsingMic({ color }: { color: string }) {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(0.6);

    useEffect(() => {
        scale.value = withRepeat(
            withSequence(withTiming(1.18, { duration: 900 }), withTiming(1, { duration: 900 })),
            -1,
            true,
        );
        opacity.value = withRepeat(
            withSequence(withTiming(1, { duration: 900 }), withTiming(0.5, { duration: 900 })),
            -1,
            true,
        );

        return () => {
            cancelAnimation(scale);
            cancelAnimation(opacity);
        };
    }, [scale, opacity]);

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    return (
        <Animated.View style={[styles.micOuter, animStyle, { borderColor: color }]}>
            <View style={[styles.micInner, { backgroundColor: color + "33" }]}>
                <Microphone size={40} weight="fill" color={color} />
            </View>
        </Animated.View>
    );
}

// ─── Screen ────────────────────────────────────────────────────────────────

export default function VibeCheckCallScreen() {
    const { matchId } = useLocalSearchParams<{ matchId: string }>();
    const { colors, isDark } = useTheme();
    const router = useRouter();

    // Fetch/create vibe check session
    const { createVibeCheck, isCreating, createdSession } = useVibeCheck(matchId ?? "");

    // Session state — resolved once created or retrieved
    const [session, setSession] = useState<VibeCheckSession | null>(null);
    const [callStarted, setCallStarted] = useState(false);
    const [showDecision, setShowDecision] = useState(false);

    // Timer
    const [secondsLeft, setSecondsLeft] = useState(CALL_DURATION_SECONDS);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const startTimeRef = useRef<number | null>(null);

    // Get partner name from matches
    const { data: matchesData } = useMatches();
    const currentMatch = matchesData?.matches?.find((m) => m.id === matchId);
    const partnerFirstName = currentMatch?.partner?.name?.split(" ")[0] ?? null;

    const { endCall } = useVibeCheck(matchId ?? "", session?.id);

    // ── On mount: create/retrieve session ────────────────────────────────────
    useEffect(() => {
        if (!matchId) return;
        createVibeCheck(matchId, {
            onSuccess: (s) => setSession(s),
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [matchId]);

    useEffect(() => {
        if (createdSession) setSession(createdSession);
    }, [createdSession]);

    // ── Timer logic ───────────────────────────────────────────────────────────
    const startTimer = useCallback(() => {
        startTimeRef.current = Date.now();
        timerRef.current = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTimeRef.current!) / 1000);
            const remaining = Math.max(0, CALL_DURATION_SECONDS - elapsed);
            setSecondsLeft(remaining);

            if (remaining === 0) {
                if (timerRef.current) clearInterval(timerRef.current);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                handleTimeUp();
            }
        }, 1000);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const stopTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    useEffect(() => {
        return () => stopTimer();
    }, [stopTimer]);

    // ── Handle app going to background (call in progress) ─────────────────────
    useEffect(() => {
        const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
            if (state === "active" && callStarted && startTimeRef.current) {
                // Re-sync timer when returning from background
                const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
                setSecondsLeft(Math.max(0, CALL_DURATION_SECONDS - elapsed));
            }
        });
        return () => sub.remove();
    }, [callStarted]);

    // ── Open Daily.co room in browser ─────────────────────────────────────────
    const handleOpenCall = useCallback(async () => {
        if (!session) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Build room URL with participant token
        const callUrl = `${session.roomUrl}?t=${session.token}`;

        setCallStarted(true);
        startTimer();

        await WebBrowser.openBrowserAsync(callUrl, {
            presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
            toolbarColor: isDark ? "#1a1a2e" : "#f8fafc",
            enableBarCollapsing: true,
        });

        // User closed the browser — stop timer
        stopTimer();
    }, [session, startTimer, stopTimer, isDark]);

    // ── End call manually ─────────────────────────────────────────────────────
    const handleEndCall = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        stopTimer();

        if (session?.id) {
            const elapsed = CALL_DURATION_SECONDS - secondsLeft;
            endCall({ vibeCheckId: session.id, durationSeconds: elapsed });
        }

        setShowDecision(true);
    }, [session, secondsLeft, endCall, stopTimer]);

    function handleTimeUp() {
        stopTimer();
        if (session?.id) {
            endCall({ vibeCheckId: session.id, durationSeconds: CALL_DURATION_SECONDS });
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setShowDecision(true);
    }

    // ── Timer colour: green → yellow → red ────────────────────────────────────
    const timerColor =
        secondsLeft > 60 ? "#10b981" : secondsLeft > 30 ? "#f97316" : "#f43f5e";

    // ── Loading state ─────────────────────────────────────────────────────────
    if (isCreating || !session) {
        return (
            <SafeAreaView
                style={[styles.root, { backgroundColor: isDark ? "#0f0d23" : "#f8fafc" }]}
            >
                <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
                <View style={styles.center}>
                    <PulsingMic color="#8b5cf6" />
                    <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
                        Setting up your vibe check…
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    // ── Decision screen ───────────────────────────────────────────────────────
    if (showDecision) {
        return (
            <SafeAreaView
                style={[styles.root, { backgroundColor: isDark ? "#0f0d23" : "#f8fafc" }]}
            >
                <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
                <VibeCheckDecision
                    vibeCheckId={session.id}
                    matchId={matchId ?? ""}
                    partnerFirstName={partnerFirstName}
                    onClose={() => router.back()}
                />
            </SafeAreaView>
        );
    }

    // ── Main call screen ──────────────────────────────────────────────────────
    return (
        <SafeAreaView
            style={[styles.root, { backgroundColor: isDark ? "#0f0d23" : "#f8fafc" }]}
        >
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            {/* Header */}
            <View style={styles.header}>
                <Text style={[styles.headerLabel, { color: colors.mutedForeground }]}>
                    Vibe Check
                </Text>
                {partnerFirstName && (
                    <Text style={[styles.partnerName, { color: colors.foreground }]}>
                        with {partnerFirstName}
                    </Text>
                )}
            </View>

            {/* Pulsing mic */}
            <View style={styles.center}>
                <PulsingMic color={callStarted ? timerColor : "#8b5cf6"} />

                {/* Timer */}
                {callStarted && (
                    <Text style={[styles.timer, { color: timerColor }]}>
                        {formatTime(secondsLeft)}
                    </Text>
                )}

                {!callStarted && (
                    <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                        Anonymous • Audio only • 3 minutes
                    </Text>
                )}
            </View>

            {/* Topic card */}
            {session.suggestedTopic && (
                <View
                    style={[
                        styles.topicCard,
                        {
                            backgroundColor: isDark
                                ? "rgba(139, 92, 246, 0.12)"
                                : "rgba(139, 92, 246, 0.07)",
                            borderColor: isDark
                                ? "rgba(139, 92, 246, 0.3)"
                                : "rgba(139, 92, 246, 0.2)",
                        },
                    ]}
                >
                    <Lightbulb size={16} weight="fill" color="#8b5cf6" />
                    <Text style={[styles.topicLabel, { color: colors.mutedForeground }]}>
                        Conversation starter
                    </Text>
                    <Text style={[styles.topicText, { color: colors.foreground }]}>
                        {session.suggestedTopic}
                    </Text>
                </View>
            )}

            {/* Actions */}
            <View style={styles.actions}>
                {!callStarted ? (
                    <TouchableOpacity
                        style={styles.startButton}
                        onPress={handleOpenCall}
                        activeOpacity={0.85}
                    >
                        <ArrowSquareOut size={18} weight="fill" color="#ffffff" />
                        <Text style={styles.startButtonText}>Open Call</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={styles.endButton}
                        onPress={handleEndCall}
                        activeOpacity={0.85}
                    >
                        <PhoneDisconnect size={18} weight="fill" color="#ffffff" />
                        <Text style={styles.endButtonText}>End Call</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={[styles.backText, { color: colors.mutedForeground }]}>
                        Cancel
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 16,
        alignItems: "center",
        gap: 4,
    },
    headerLabel: {
        fontSize: 13,
        fontWeight: "600",
        letterSpacing: 0.5,
        textTransform: "uppercase",
    },
    partnerName: {
        fontSize: 20,
        fontWeight: "700",
    },
    center: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
    },
    micOuter: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 2,
        alignItems: "center",
        justifyContent: "center",
    },
    micInner: {
        width: 90,
        height: 90,
        borderRadius: 45,
        alignItems: "center",
        justifyContent: "center",
    },
    timer: {
        fontSize: 52,
        fontWeight: "700",
        letterSpacing: 2,
        fontVariant: ["tabular-nums"],
    },
    subtitle: {
        fontSize: 14,
        textAlign: "center",
    },
    loadingText: {
        fontSize: 15,
        marginTop: 24,
    },
    topicCard: {
        marginHorizontal: 24,
        marginBottom: 16,
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        gap: 6,
    },
    topicLabel: {
        fontSize: 11,
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    topicText: {
        fontSize: 15,
        fontWeight: "600",
        lineHeight: 22,
    },
    actions: {
        paddingHorizontal: 24,
        paddingBottom: 16,
        gap: 12,
    },
    startButton: {
        backgroundColor: "#8b5cf6",
        borderRadius: 18,
        paddingVertical: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
    },
    startButtonText: {
        color: "#ffffff",
        fontSize: 17,
        fontWeight: "700",
    },
    endButton: {
        backgroundColor: "#f43f5e",
        borderRadius: 18,
        paddingVertical: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
    },
    endButtonText: {
        color: "#ffffff",
        fontSize: 17,
        fontWeight: "700",
    },
    backButton: {
        alignItems: "center",
        paddingVertical: 8,
    },
    backText: {
        fontSize: 14,
        fontWeight: "500",
    },
});
