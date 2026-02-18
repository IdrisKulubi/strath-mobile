import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { Text } from "@/components/ui/text";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/hooks/use-theme";
import { useMission, useMissionActions } from "@/hooks/use-missions";
import { MissionFeedbackSheet, type MissionRating } from "@/components/matches/mission-feedback-sheet";

function formatTimeLeft(deadlineIso: string | null | undefined) {
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

export function MissionCard({ matchId }: { matchId: string }) {
    const { colors } = useTheme();
    const { data: mission, isLoading, isError } = useMission(matchId);
    const actions = useMissionActions(matchId);

    const [feedbackVisible, setFeedbackVisible] = useState(false);
    const [feedbackShownOnce, setFeedbackShownOnce] = useState(false);

    const timeLeft = useMemo(() => formatTimeLeft(mission?.deadline ?? null), [mission?.deadline]);
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

    const onAccept = async () => {
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await actions.accept.mutateAsync();
        } catch (e: any) {
            Alert.alert("Mission", e?.message || "Failed to accept mission");
        }
    };

    const onComplete = async () => {
        try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await actions.complete.mutateAsync();
        } catch (e: any) {
            Alert.alert("Mission", e?.message || "Failed to mark mission complete");
        }
    };

    const onSuggestOther = async () => {
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            await actions.suggestOther.mutateAsync();
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

    if (isLoading) {
        return (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Skeleton width={180} height={18} borderRadius={6} style={{ marginBottom: 10 }} />
                <Skeleton width={260} height={14} borderRadius={6} style={{ marginBottom: 6 }} />
                <Skeleton width={220} height={14} borderRadius={6} />
            </View>
        );
    }

    if (isError) {
        return (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={{ color: colors.mutedForeground, textAlign: "center" }}>
                    Mission unavailable
                </Text>
            </View>
        );
    }

    if (!mission) return null;

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
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.headerRow}>
                    <Text style={[styles.title, { color: colors.foreground }]}>
                        {mission.emoji} {mission.title}
                    </Text>
                    {timeLeft && (
                        <Text style={[styles.timeLeft, { color: colors.mutedForeground }]}>{timeLeft}</Text>
                    )}
                </View>

                <Text style={[styles.description, { color: colors.mutedForeground }]}> {mission.description} </Text>

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
                        <Pressable
                            disabled={actions.accept.isPending}
                            onPress={onAccept}
                            style={{ flex: 1 }}
                        >
                            <LinearGradient
                                colors={[colors.primary, colors.accent]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.primaryButton}
                            >
                                <Text style={styles.primaryButtonText}>Accept mission</Text>
                            </LinearGradient>
                        </Pressable>
                    )}

                    {showComplete && (
                        <Pressable
                            disabled={actions.complete.isPending}
                            onPress={onComplete}
                            style={{ flex: 1 }}
                        >
                            <LinearGradient
                                colors={[colors.primary, colors.accent]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.primaryButton}
                            >
                                <Text style={styles.primaryButtonText}>Mark complete</Text>
                            </LinearGradient>
                        </Pressable>
                    )}

                    {showSuggestOther && (
                        <Pressable
                            disabled={actions.suggestOther.isPending}
                            onPress={onSuggestOther}
                            style={[styles.secondaryButton, { borderColor: colors.border }]}
                        >
                            <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>Suggest other</Text>
                        </Pressable>
                    )}
                </View>
            </View>

            <MissionFeedbackSheet
                visible={feedbackVisible}
                onClose={() => setFeedbackVisible(false)}
                onSelectRating={onSelectRating}
            />
        </>
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
