import React, { useCallback, useEffect, useRef, useState } from "react";
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
import { Microphone, PhoneDisconnect, ArrowSquareOut, Lightbulb } from "phosphor-react-native";

import { Text } from "@/components/ui/text";
import { useToast } from "@/components/ui/toast";
import { useTheme } from "@/hooks/use-theme";
import { useVibeCheck, type VibeCheckSession } from "@/hooks/use-vibe-check";
import { useMatches } from "@/hooks/use-matches";
import { VibeCheckDecision } from "@/components/vibe-check/vibe-check-decision";
import { useWaitingRoomHaptics } from "@/components/vibe-check/use-waiting-room-haptics";

const CALL_DURATION_SECONDS = 180;
const INVITE_WINDOW_SECONDS = 90;

function formatTime(secs: number): string {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
}

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
    }, [opacity, scale]);

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

export default function VibeCheckCallScreen() {
    const { matchId, mode } = useLocalSearchParams<{ matchId: string; mode?: string }>();
    const router = useRouter();
    const toast = useToast();
    const { colors, isDark } = useTheme();

    const callerMode = mode === "caller";

    const {
        vibeCheckStatus,
        isStatusLoading,
        isStatusFetching,
        refetchStatus,
        joinVibeCheckAsync,
        isJoining,
        endCall,
    } = useVibeCheck(matchId ?? "");

    const [session, setSession] = useState<VibeCheckSession | null>(null);
    const [callStarted, setCallStarted] = useState(false);
    const [showDecision, setShowDecision] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(CALL_DURATION_SECONDS);
    const [inviteSecondsLeft, setInviteSecondsLeft] = useState<number | null>(null);

    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const inviteTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const inviteExpiryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const autoJoinTriggeredRef = useRef(false);
    const inviteExpiryHandledRef = useRef(false);
    const callEndedRef = useRef(false);
    const sessionRef = useRef<VibeCheckSession | null>(null);

    const { data: matchesData } = useMatches();
    const currentMatch = matchesData?.matches?.find((m) => m.id === matchId);
    const partnerFirstName = currentMatch?.partner?.name?.split(" ")[0] ?? null;
    const partnerPhoto = currentMatch?.partner?.image ?? null;

    const startTimer = useCallback(() => {
        startTimeRef.current = Date.now();
        timerRef.current = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTimeRef.current!) / 1000);
            const remaining = Math.max(0, CALL_DURATION_SECONDS - elapsed);
            setSecondsLeft(remaining);

            if (remaining === 0) {
                if (timerRef.current) clearInterval(timerRef.current);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                // Try to close the in-app browser so the user is dropped back into the
                // app for the meet/pass decision instead of staring at Daily's
                // "you have been removed" screen. iOS-only API; safe no-op on Android.
                try {
                    WebBrowser.dismissBrowser();
                } catch {
                    // ignore; AppState fallback will handle Android dismissal
                }
                finishCallRef.current?.("timer");
            }
        }, 1000);
    }, []);

    const stopTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const stopInviteTimer = useCallback(() => {
        if (inviteTimerRef.current) {
            clearInterval(inviteTimerRef.current);
            inviteTimerRef.current = null;
        }
    }, []);

    const stopInviteExpiryTimeout = useCallback(() => {
        if (inviteExpiryTimeoutRef.current) {
            clearTimeout(inviteExpiryTimeoutRef.current);
            inviteExpiryTimeoutRef.current = null;
        }
    }, []);

    const handleInviteExpiry = useCallback(() => {
        if (inviteExpiryHandledRef.current) {
            return;
        }

        inviteExpiryHandledRef.current = true;
        stopInviteTimer();
        setInviteSecondsLeft(0);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        toast.show({ message: "They did not join within 90 seconds.", variant: "warning" });
        router.replace("/(tabs)/dates");
    }, [router, stopInviteTimer, toast]);

    /**
     * Single source of truth for "the call is over, show the meet/pass UI".
     * Guarded so we never double-fire endCall when, for example, the timer expires AND
     * the user closes the browser AND AppState fires `active` all in quick succession.
     */
    const finishCall = useCallback(
        (reason: "timer" | "browser_dismiss" | "foreground" | "manual" | "server_completed") => {
            if (callEndedRef.current) return;
            const sessionId = sessionRef.current?.id;
            if (!sessionId && reason !== "server_completed") return;
            callEndedRef.current = true;
            stopTimer();
            const elapsed = startTimeRef.current
                ? Math.min(
                      CALL_DURATION_SECONDS,
                      Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000)),
                  )
                : CALL_DURATION_SECONDS;
            if (sessionId) {
                endCall({ vibeCheckId: sessionId, durationSeconds: elapsed });
            }
            console.log("[vibe-check] finishCall", { reason, sessionId, elapsed });
            setShowDecision(true);
        },
        [endCall, stopTimer],
    );

    const finishCallRef = useRef(finishCall);
    useEffect(() => {
        finishCallRef.current = finishCall;
    }, [finishCall]);

    useEffect(() => {
        sessionRef.current = session;
    }, [session]);

    useEffect(() => {
        return () => {
            stopTimer();
            stopInviteTimer();
            stopInviteExpiryTimeout();
        };
    }, [stopInviteExpiryTimeout, stopInviteTimer, stopTimer]);

    useEffect(() => {
        stopInviteTimer();
        stopInviteExpiryTimeout();

        if (vibeCheckStatus?.status !== "pending") {
            setInviteSecondsLeft(null);
            inviteExpiryHandledRef.current = false;
            return;
        }

        const deadlineMs = Date.now() + INVITE_WINDOW_SECONDS * 1000;

        const syncInviteSeconds = () => {
            const remainingSeconds = Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));
            setInviteSecondsLeft(remainingSeconds);
        };

        syncInviteSeconds();
        inviteTimerRef.current = setInterval(syncInviteSeconds, 1000);
        inviteExpiryTimeoutRef.current = setTimeout(handleInviteExpiry, INVITE_WINDOW_SECONDS * 1000);

        return () => {
            stopInviteTimer();
            stopInviteExpiryTimeout();
        };
    }, [handleInviteExpiry, stopInviteExpiryTimeout, stopInviteTimer, vibeCheckStatus?.status]);

    useEffect(() => {
        const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
            if (state !== "active" || !callStarted || !startTimeRef.current) return;
            const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
            const remaining = Math.max(0, CALL_DURATION_SECONDS - elapsed);
            setSecondsLeft(remaining);

            // Android safety net: if the user backgrounded the app while Daily ejected
            // them at 3:00, on return we force-dismiss the in-app browser (no-op if
            // already closed) and surface the decision UI.
            if (remaining === 0 && !callEndedRef.current) {
                try {
                    WebBrowser.dismissBrowser();
                } catch {
                    // ignore — we just want to flip to decision UI either way
                }
                finishCallRef.current("foreground");
            }
        });
        return () => sub.remove();
    }, [callStarted]);

    const openCall = useCallback(async (joinedSession: VibeCheckSession) => {
        const callUrl = `${joinedSession.roomUrl}?t=${joinedSession.token}`;
        setSession(joinedSession);
        sessionRef.current = joinedSession;
        callEndedRef.current = false;
        setCallStarted(true);
        setSecondsLeft(CALL_DURATION_SECONDS);
        startTimer();

        try {
            await WebBrowser.openBrowserAsync(callUrl, {
                presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
                toolbarColor: isDark ? "#1a1a2e" : "#f8fafc",
                enableBarCollapsing: true,
            });
        } catch (err) {
            console.warn("[vibe-check] openBrowserAsync threw:", err);
        }

        // Resolves when the user closes the browser (manual or programmatic dismiss).
        // Always transition to the decision UI here so a partner-initiated 3-min eject
        // doesn't leave the user stranded on Daily's "you have been removed" page.
        finishCallRef.current("browser_dismiss");
    }, [isDark, startTimer]);

    const handleJoinCall = useCallback(async () => {
        if (!vibeCheckStatus?.vibeCheckId) {
            toast.show({ message: "Call is not ready yet.", variant: "danger" });
            return;
        }

        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const joined = await joinVibeCheckAsync(vibeCheckStatus.vibeCheckId);
            await openCall(joined);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unable to join the call";
            toast.show({ message, variant: "danger" });
            if (message.toLowerCase().includes("expired")) {
                router.replace("/(tabs)/dates");
            }
        }
    }, [joinVibeCheckAsync, openCall, router, toast, vibeCheckStatus?.vibeCheckId]);

    useEffect(() => {
        if (!callerMode) {
            return;
        }

        if (vibeCheckStatus?.status === "active" && vibeCheckStatus.vibeCheckId && !autoJoinTriggeredRef.current && !callStarted) {
            autoJoinTriggeredRef.current = true;
            handleJoinCall();
        }
    }, [callStarted, callerMode, handleJoinCall, vibeCheckStatus?.status, vibeCheckStatus?.vibeCheckId]);

    useEffect(() => {
        if (!isStatusFetching && vibeCheckStatus?.status === "expired") {
            toast.show({ message: "They did not join within 90 seconds.", variant: "warning" });
            router.replace("/(tabs)/dates");
        }
    }, [isStatusFetching, router, toast, vibeCheckStatus?.status]);

    const handleEndCall = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        try {
            WebBrowser.dismissBrowser();
        } catch {
            // ignore
        }
        finishCall("manual");
    }, [finishCall]);

    const handleLeaveWaitingRoom = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.replace("/(tabs)/dates");
    }, [router]);

    const isInWaitingRoom =
        !(showDecision && session) &&
        Boolean(matchId) &&
        !isStatusLoading &&
        Boolean(vibeCheckStatus?.exists && vibeCheckStatus?.vibeCheckId) &&
        vibeCheckStatus?.status === "pending";

    useWaitingRoomHaptics(isInWaitingRoom);

    // Force-quit recovery: the user may have closed the app mid-call (or before deciding),
    // come back, and the server now reports the call as completed/expired. Skip the join
    // step entirely and drop them straight into the decision UI so they can finalize.
    const serverCallFinished = vibeCheckStatus?.status === "completed";
    const userHasNotDecided = !vibeCheckStatus?.userDecision;
    const showDecisionFromServer =
        !showDecision &&
        !session &&
        Boolean(vibeCheckStatus?.exists && vibeCheckStatus?.vibeCheckId) &&
        serverCallFinished &&
        userHasNotDecided;

    if (showDecision && session) {
        return (
            <SafeAreaView style={[styles.root, { backgroundColor: isDark ? "#0f0d23" : "#f8fafc" }]}>
                <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
                <VibeCheckDecision
                    vibeCheckId={session.id}
                    matchId={matchId ?? ""}
                    partnerFirstName={partnerFirstName}
                    partnerPhoto={partnerPhoto}
                    onClose={() => router.push("/(tabs)/dates")}
                />
            </SafeAreaView>
        );
    }

    if (showDecisionFromServer && vibeCheckStatus?.vibeCheckId) {
        return (
            <SafeAreaView style={[styles.root, { backgroundColor: isDark ? "#0f0d23" : "#f8fafc" }]}>
                <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
                <VibeCheckDecision
                    vibeCheckId={vibeCheckStatus.vibeCheckId}
                    matchId={matchId ?? ""}
                    partnerFirstName={partnerFirstName}
                    partnerPhoto={partnerPhoto}
                    onClose={() => router.push("/(tabs)/dates")}
                />
            </SafeAreaView>
        );
    }

    if (isStatusLoading || (!session && isStatusFetching) || !matchId) {
        return (
            <SafeAreaView style={[styles.root, { backgroundColor: isDark ? "#0f0d23" : "#f8fafc" }]}>
                <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
                <View style={styles.center}>
                    <PulsingMic color="#8b5cf6" />
                    <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
                        Checking call status…
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!vibeCheckStatus?.exists || !vibeCheckStatus?.vibeCheckId) {
        return (
            <SafeAreaView style={[styles.root, { backgroundColor: isDark ? "#0f0d23" : "#f8fafc" }]}>
                <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
                <View style={styles.center}>
                    <PulsingMic color="#8b5cf6" />
                    <Text style={[styles.preCallTitle, { color: colors.foreground }]}>
                        No active call invite
                    </Text>
                    <Text style={[styles.preCallSub, { color: colors.mutedForeground }]}>
                        Start from the Dates screen when both of you are online.
                    </Text>
                </View>
                <View style={styles.actions}>
                    <TouchableOpacity onPress={() => router.replace("/(tabs)/dates")} style={styles.backButton}>
                        <Text style={[styles.backText, { color: colors.mutedForeground }]}>Back to Dates</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const timerColor =
        secondsLeft > 60 ? "#10b981" : secondsLeft > 30 ? "#f97316" : "#f43f5e";

    const waitingForPartner = vibeCheckStatus.status === "pending" && callerMode;
    const incomingInvite = vibeCheckStatus.status === "pending" && !callerMode;

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: isDark ? "#0f0d23" : "#f8fafc" }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            <View style={styles.header}>
                <Text style={[styles.headerLabel, { color: colors.mutedForeground }]}>Vibe Check</Text>
                {partnerFirstName && (
                    <Text style={[styles.partnerName, { color: colors.foreground }]}>with {partnerFirstName}</Text>
                )}
            </View>

            <View style={styles.center}>
                <PulsingMic color={callStarted ? timerColor : "#8b5cf6"} />

                {callStarted ? (
                    <Text style={[styles.timer, { color: timerColor }]}>{formatTime(secondsLeft)}</Text>
                ) : waitingForPartner ? (
                    <>
                        <Text style={[styles.preCallTitle, { color: colors.foreground }]}>
                            Waiting for {partnerFirstName ?? "them"} to join
                        </Text>
                        <Text style={[styles.preCallSub, { color: colors.mutedForeground }]}>
                            They have {INVITE_WINDOW_SECONDS} seconds to join the call.{'\n'}Invite expires in {inviteSecondsLeft ?? INVITE_WINDOW_SECONDS}s.
                        </Text>
                    </>
                ) : incomingInvite ? (
                    <>
                        <Text style={[styles.preCallTitle, { color: colors.foreground }]}>
                            {partnerFirstName ?? "Someone"} wants to start your 3-minute call
                        </Text>
                        <Text style={[styles.preCallSub, { color: colors.mutedForeground }]}>
                            Join within {INVITE_WINDOW_SECONDS} seconds to confirm the vibe before the date.
                        </Text>
                    </>
                ) : (
                    <>
                        <Text style={[styles.preCallTitle, { color: colors.foreground }]}>
                            Your call is ready
                        </Text>
                        <Text style={[styles.preCallSub, { color: colors.mutedForeground }]}>
                            Join now to start the 3-minute vibe check.
                        </Text>
                    </>
                )}
            </View>

            {session?.suggestedTopic && (
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

            <View style={styles.actions}>
                {!callStarted && incomingInvite && (
                    <TouchableOpacity
                        style={[styles.startButton, isJoining && styles.disabledButton]}
                        onPress={handleJoinCall}
                        activeOpacity={0.85}
                        disabled={isJoining}
                    >
                        <ArrowSquareOut size={18} weight="fill" color="#ffffff" />
                        <Text style={styles.startButtonText}>Join 3-Minute Call</Text>
                    </TouchableOpacity>
                )}

                {!callStarted && vibeCheckStatus.status === "active" && (
                    <TouchableOpacity
                        style={[styles.startButton, isJoining && styles.disabledButton]}
                        onPress={handleJoinCall}
                        activeOpacity={0.85}
                        disabled={isJoining}
                    >
                        <ArrowSquareOut size={18} weight="fill" color="#ffffff" />
                        <Text style={styles.startButtonText}>Enter Call</Text>
                    </TouchableOpacity>
                )}

                {callStarted && (
                    <TouchableOpacity style={styles.endButton} onPress={handleEndCall} activeOpacity={0.85}>
                        <PhoneDisconnect size={18} weight="fill" color="#ffffff" />
                        <Text style={styles.endButtonText}>End Call</Text>
                    </TouchableOpacity>
                )}

                    <TouchableOpacity onPress={handleLeaveWaitingRoom} style={styles.backButton}>
                        <Text style={[styles.backText, { color: colors.mutedForeground }]}>
                            {waitingForPartner ? "Leave waiting room" : "Back to Dates"}
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
    preCallTitle: {
        fontSize: 18,
        fontWeight: "700",
        textAlign: "center",
        paddingHorizontal: 24,
    },
    preCallSub: {
        fontSize: 14,
        textAlign: "center",
        lineHeight: 22,
        paddingHorizontal: 32,
        marginTop: 8,
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
    disabledButton: {
        opacity: 0.65,
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
