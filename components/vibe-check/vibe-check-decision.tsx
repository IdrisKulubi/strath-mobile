import React, { useEffect, useCallback } from "react";
import {
    View,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
} from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withRepeat,
    withSequence,
    withTiming,
} from "react-native-reanimated";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/hooks/use-theme";
import { useVibeCheck } from "@/hooks/use-vibe-check";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import {
    Handshake,
    HandWaving,
    Confetti,
    Heart,
    ArrowRight,
} from "phosphor-react-native";

interface VibeCheckDecisionProps {
    vibeCheckId: string;
    matchId: string;
    partnerFirstName?: string | null;
    onClose?: () => void;
}

/**
 * Post-call decision screen.
 * User picks "Want to Meet" or "Not This Time".
 * Polls for the partner's decision and reveals full profile on mutual agree.
 */
export function VibeCheckDecision({
    vibeCheckId,
    matchId,
    partnerFirstName,
    onClose,
}: VibeCheckDecisionProps) {
    const { colors, isDark } = useTheme();
    const router = useRouter();

    const { submitDecision, isSubmittingDecision, vibeCheckResult } =
        useVibeCheck(matchId, vibeCheckId);

    // Bounce animation for the confetti icon when both agreed
    const bounceY = useSharedValue(0);
    const animatedBounce = useAnimatedStyle(() => ({
        transform: [{ translateY: bounceY.value }],
    }));

    useEffect(() => {
        if (vibeCheckResult?.bothAgreedToMeet) {
            bounceY.value = withRepeat(
                withSequence(
                    withTiming(-10, { duration: 300 }),
                    withSpring(0, { damping: 6 }),
                ),
                4,
            );
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    }, [vibeCheckResult?.bothAgreedToMeet, bounceY]);

    const handleDecision = useCallback(
        (decision: "meet" | "pass") => {
            Haptics.impactAsync(
                decision === "meet"
                    ? Haptics.ImpactFeedbackStyle.Medium
                    : Haptics.ImpactFeedbackStyle.Light,
            );
            submitDecision({ vibeCheckId, decision });
        },
        [vibeCheckId, submitDecision],
    );

    const handleViewProfile = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push(`/chat/${matchId}` as never);
        onClose?.();
    }, [router, matchId, onClose]);

    const name = partnerFirstName ?? "them";
    const userDecision = vibeCheckResult?.userDecision;
    const bothAgreed = vibeCheckResult?.bothAgreedToMeet;
    const bothDecided = vibeCheckResult?.bothDecided;

    // ── Mutual agree state ────────────────────────────────────────────────────
    if (bothAgreed) {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? "#1a1a2e" : "#ffffff" }]}>
                <Animated.View style={[styles.iconWrap, animatedBounce]}>
                    <Confetti size={64} weight="fill" color="#ec4899" />
                </Animated.View>
                <Text style={[styles.heading, { color: colors.foreground }]}>
                    You both vibed! 🎉
                </Text>
                <Text style={[styles.body, { color: colors.mutedForeground }]}>
                    Great news — you and {name} both want to meet. Say hi properly! 👋
                </Text>
                <TouchableOpacity
                    style={[styles.primaryButton, { backgroundColor: "#ec4899" }]}
                    onPress={handleViewProfile}
                    activeOpacity={0.85}
                >
                    <Heart size={16} weight="fill" color="#ffffff" />
                    <Text style={styles.primaryButtonText}>{`See ${name}'s profile`}</Text>
                    <ArrowRight size={16} color="#ffffff" />
                </TouchableOpacity>
            </View>
        );
    }

    // ── Waiting for partner ───────────────────────────────────────────────────
    if (userDecision && !bothDecided) {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? "#1a1a2e" : "#ffffff" }]}>
                <View style={styles.iconWrap}>
                    <ActivityIndicator size="large" color="#8b5cf6" />
                </View>
                <Text style={[styles.heading, { color: colors.foreground }]}>
                    Waiting on {name}…
                </Text>
                <Text style={[styles.body, { color: colors.mutedForeground }]}>
                    You chose{" "}
                    <Text style={{ color: userDecision === "meet" ? "#10b981" : "#f43f5e" }}>
                        {userDecision === "meet" ? "Want to Meet ✅" : "Not This Time ❌"}
                    </Text>
                    {".\ "}{"We'll"} let you know when {name} decides.
                </Text>
            </View>
        );
    }

    // ── Both decided, no mutual agree ─────────────────────────────────────────
    if (bothDecided && !bothAgreed) {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? "#1a1a2e" : "#ffffff" }]}>
                <View style={styles.iconWrap}>
                    <HandWaving size={64} weight="fill" color="#94a3b8" />
                </View>
                <Text style={[styles.heading, { color: colors.foreground }]}>
                    Thanks for the vibe check!
                </Text>
                <Text style={[styles.body, { color: colors.mutedForeground }]}>
                    {"Not every vibe leads to a match — and that's okay. Keep exploring 💫"}
                </Text>
                <TouchableOpacity
                    style={[styles.outlineButton, { borderColor: colors.border }]}
                    onPress={onClose}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.outlineButtonText, { color: colors.mutedForeground }]}>
                        Back to chats
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }

    // ── Decision prompt ───────────────────────────────────────────────────────
    return (
        <View style={[styles.container, { backgroundColor: isDark ? "#1a1a2e" : "#ffffff" }]}>
            <View style={styles.iconWrap}>
                <Handshake size={56} weight="fill" color="#8b5cf6" />
            </View>
            <Text style={[styles.heading, { color: colors.foreground }]}>
                How did it go with {name}?
            </Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>
                Tell us honestly — decisions stay private until both sides choose. ✨
            </Text>

            <View style={styles.row}>
                <TouchableOpacity
                    style={[
                        styles.decisionButton,
                        { backgroundColor: "rgba(16, 185, 129, 0.12)", borderColor: "#10b981" },
                    ]}
                    onPress={() => handleDecision("meet")}
                    disabled={isSubmittingDecision}
                    activeOpacity={0.8}
                >
                    <Text style={{ fontSize: 28 }}>🤝</Text>
                    <Text style={[styles.decisionLabel, { color: "#10b981" }]}>
                        Want to Meet
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.decisionButton,
                        { backgroundColor: "rgba(244, 63, 94, 0.1)", borderColor: "#f43f5e" },
                    ]}
                    onPress={() => handleDecision("pass")}
                    disabled={isSubmittingDecision}
                    activeOpacity={0.8}
                >
                    <Text style={{ fontSize: 28 }}>👋</Text>
                    <Text style={[styles.decisionLabel, { color: "#f43f5e" }]}>
                        Not This Time
                    </Text>
                </TouchableOpacity>
            </View>

            {isSubmittingDecision && (
                <ActivityIndicator style={{ marginTop: 16 }} color="#8b5cf6" />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 32,
        gap: 16,
    },
    iconWrap: {
        marginBottom: 8,
    },
    heading: {
        fontSize: 22,
        fontWeight: "700",
        textAlign: "center",
    },
    body: {
        fontSize: 15,
        lineHeight: 22,
        textAlign: "center",
    },
    row: {
        flexDirection: "row",
        gap: 14,
        marginTop: 8,
    },
    decisionButton: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 20,
        borderRadius: 18,
        borderWidth: 1.5,
    },
    decisionLabel: {
        fontSize: 13,
        fontWeight: "700",
        textAlign: "center",
    },
    primaryButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 16,
        marginTop: 8,
    },
    primaryButtonText: {
        color: "#ffffff",
        fontSize: 15,
        fontWeight: "700",
    },
    outlineButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 14,
        borderWidth: 1,
    },
    outlineButtonText: {
        fontSize: 14,
        fontWeight: "600",
    },
});
