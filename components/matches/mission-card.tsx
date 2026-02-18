import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { Text } from "@/components/ui/text";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/hooks/use-theme";
import { useMission, useMissionActions, type Mission, type MissionRating } from "@/hooks/use-missions";
import { MissionFeedbackSheet } from "@/components/matches/mission-feedback-sheet";

export { type MissionRating } from "@/hooks/use-missions";

// ─── helpers ────────────────────────────────────────────────────────────────

export function formatTimeLeft(deadlineIso: string | null | undefined) {
    if (!deadlineIso) return null;
    const deadline = new Date(deadlineIso);
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();
    const diffHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
    const diffDays = Math.floor(diffHours / 24);
    const hoursRemainder = diffHours % 24;
    if (diffMs <= 0) return "Expired";
    if (diffDays >= 1) return `${diffDays}d ${hoursRemainder}h left`;
    return `${diffHours}h left`;
}

// ─── Presentational view (no hooks, fully mockable) ──────────────────────────

export interface MissionCardViewProps {
    mission: Mission;
    compact?: boolean;
    isAcceptPending?: boolean;
    isCompletePending?: boolean;
    isSuggestOtherPending?: boolean;
    feedbackVisible?: boolean;
    onAccept?: () => void;
    onComplete?: () => void;
    onSuggestOther?: () => void;
    onSelectRating?: (rating: MissionRating) => void;
    onCloseFeedback?: () => void;
}

export function MissionCardView({
    mission,
    compact,
    isAcceptPending,
    isCompletePending,
    isSuggestOtherPending,
    feedbackVisible = false,
    onAccept,
    onComplete,
    onSuggestOther,
    onSelectRating,
    onCloseFeedback,
}: MissionCardViewProps) {
    const { colors } = useTheme();

    const timeLeft = useMemo(() => formatTimeLeft(mission.deadline ?? null), [mission.deadline]);

    const cardStyle = compact
        ? [styles.cardCompact]
        : [styles.card, { backgroundColor: colors.card, borderColor: colors.border }];

    const showAccept = mission.status === "proposed" && !mission.viewerAccepted;
    const showComplete = mission.status === "accepted" && mission.viewerAccepted && !mission.viewerCompleted;
    const showSuggestOther = mission.status === "proposed";

    const statusLine =
        mission.status === "completed"
            ? "Completed ✅"
            : mission.status === "expired"
                ? "Expired"
                : mission.partnerAccepted
                    ? "Both accepted"
                    : mission.viewerAccepted
                        ? "Waiting for them to accept"
                        : "";

    return (
        <>
            <View style={cardStyle}>
                <View style={styles.headerRow}>
                    <Text style={[styles.title, { color: colors.foreground }]}>
                        {mission.emoji} {mission.title}
                    </Text>
                    {timeLeft && (
                        <Text style={[styles.timeLeft, { color: colors.mutedForeground }]}>{timeLeft}</Text>
                    )}
                </View>

                <Text style={[styles.description, { color: colors.mutedForeground }]}>{mission.description}</Text>

                {(mission.suggestedLocation || mission.suggestedTime) && (
                    <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                        {mission.suggestedLocation ? `📍 ${mission.suggestedLocation}` : ""}
                        {mission.suggestedLocation && mission.suggestedTime ? " • " : ""}
                        {mission.suggestedTime ? `⏰ ${mission.suggestedTime}` : ""}
                    </Text>
                )}

                {!!statusLine && (
                    <Text style={[styles.status, { color: colors.mutedForeground }]}>{statusLine}</Text>
                )}

                <View style={styles.actionsRow}>
                    {showAccept && (
                        <Pressable disabled={isAcceptPending} onPress={onAccept} style={{ flex: 1 }}>
                            <LinearGradient
                                colors={[colors.primary, colors.accent]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.primaryButton}
                            >
                                <Text style={styles.primaryButtonText}>
                                    {isAcceptPending ? "Accepting…" : "Accept mission"}
                                </Text>
                            </LinearGradient>
                        </Pressable>
                    )}

                    {showComplete && (
                        <Pressable disabled={isCompletePending} onPress={onComplete} style={{ flex: 1 }}>
                            <LinearGradient
                                colors={[colors.primary, colors.accent]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.primaryButton}
                            >
                                <Text style={styles.primaryButtonText}>
                                    {isCompletePending ? "Saving…" : "Mark complete"}
                                </Text>
                            </LinearGradient>
                        </Pressable>
                    )}

                    {showSuggestOther && (
                        <Pressable
                            disabled={isSuggestOtherPending}
                            onPress={onSuggestOther}
                            style={[styles.secondaryButton, { borderColor: colors.border }]}
                        >
                            <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>
                                {isSuggestOtherPending ? "…" : "Suggest other"}
                            </Text>
                        </Pressable>
                    )}
                </View>
            </View>

            {feedbackVisible && (
                <MissionFeedbackSheet
                    visible={feedbackVisible}
                    onClose={onCloseFeedback ?? (() => {})}
                    onSelectRating={onSelectRating ?? (() => {})}
                />
            )}
        </>
    );
}

// ─── Connected component (uses real hooks) ───────────────────────────────────

export function MissionCard({ matchId, compact }: { matchId: string; compact?: boolean }) {
    const { data: mission, isLoading, isError } = useMission(matchId);
    const actions = useMissionActions(matchId);
    const { colors } = useTheme();

    const [feedbackVisible, setFeedbackVisible] = useState(false);
    const [feedbackShownOnce, setFeedbackShownOnce] = useState(false);

    const deadlinePassed = useMemo(() => {
        if (!mission?.deadline) return false;
        return new Date(mission.deadline).getTime() <= Date.now();
    }, [mission?.deadline]);

    const shouldPromptFeedback = useMemo(() => {
        if (!mission) return false;
        if (!deadlinePassed) return false;
        if (mission.viewerRating) return false;
        if (!mission.viewerAccepted && !mission.viewerCompleted) return false;
        return true;
    }, [mission, deadlinePassed]);

    useEffect(() => {
        if (!shouldPromptFeedback) return;
        if (feedbackShownOnce) return;
        setFeedbackVisible(true);
        setFeedbackShownOnce(true);
    }, [shouldPromptFeedback, feedbackShownOnce]);

    const cardStyle = compact
        ? [styles.cardCompact]
        : [styles.card, { backgroundColor: colors.card, borderColor: colors.border }];

    if (isLoading) {
        return (
            <View style={cardStyle}>
                <Skeleton width={180} height={18} borderRadius={6} style={{ marginBottom: 10 }} />
                <Skeleton width={260} height={14} borderRadius={6} style={{ marginBottom: 6 }} />
                <Skeleton width={220} height={14} borderRadius={6} />
            </View>
        );
    }

    if (isError) {
        return (
            <View style={cardStyle}>
                <Text style={{ color: colors.mutedForeground, textAlign: "center" }}>
                    Mission unavailable
                </Text>
            </View>
        );
    }

    if (!mission) return null;

    const onAccept = async () => {
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await actions.accept.mutateAsync(undefined);
        } catch (e: any) {
            Alert.alert("Mission", e?.message || "Failed to accept mission");
        }
    };

    const onComplete = async () => {
        try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await actions.complete.mutateAsync(undefined);
        } catch (e: any) {
            Alert.alert("Mission", e?.message || "Failed to mark mission complete");
        }
    };

    const onSuggestOther = async () => {
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            await actions.suggestOther.mutateAsync(undefined);
        } catch (e: any) {
            Alert.alert("Mission", e?.message || "Failed to suggest another mission");
        }
    };

    const onSelectRating = async (rating: MissionRating) => {
        try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await actions.rate.mutateAsync(rating);
            setFeedbackVisible(false);
        } catch (e: any) {
            Alert.alert("Mission", e?.message || "Failed to submit rating");
        }
    };

    return (
        <MissionCardView
            mission={mission}
            compact={compact}
            isAcceptPending={actions.accept.isPending}
            isCompletePending={actions.complete.isPending}
            isSuggestOtherPending={actions.suggestOther.isPending}
            feedbackVisible={feedbackVisible}
            onAccept={onAccept}
            onComplete={onComplete}
            onSuggestOther={onSuggestOther}
            onSelectRating={onSelectRating}
            onCloseFeedback={() => setFeedbackVisible(false)}
        />
    );
}

const styles = StyleSheet.create({
    card: {
        marginTop: 14,
        marginHorizontal: 20,
        padding: 16,
        borderRadius: 18,
        borderWidth: StyleSheet.hairlineWidth,
    },
    cardCompact: {
        padding: 14,
        paddingTop: 2,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },
    title: {
        fontSize: 16,
        fontWeight: "700",
        flex: 1,
    },
    timeLeft: {
        fontSize: 12,
        fontWeight: "600",
    },
    description: {
        marginTop: 8,
        fontSize: 13,
        lineHeight: 18,
    },
    meta: {
        marginTop: 10,
        fontSize: 12,
        lineHeight: 16,
    },
    status: {
        marginTop: 10,
        fontSize: 12,
        fontWeight: "600",
    },
    actionsRow: {
        flexDirection: "row",
        gap: 10,
        marginTop: 14,
    },
    primaryButton: {
        paddingVertical: 12,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
    },
    primaryButtonText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "700",
    },
    secondaryButton: {
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: "center",
        justifyContent: "center",
    },
    secondaryButtonText: {
        fontSize: 13,
        fontWeight: "600",
    },
});
