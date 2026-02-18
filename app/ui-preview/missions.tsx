/**
 * Mission Card UI Preview
 * –––––––––––––––––––––––
 * Simulates every mission state without a backend.
 * Navigate to: /ui-preview/missions
 */

import React, { useState } from "react";
import {
    View,
    ScrollView,
    StyleSheet,
    Pressable,
    StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { Text } from "@/components/ui/text";
import { useTheme } from "@/hooks/use-theme";
import { MissionCardView, type MissionCardViewProps } from "@/components/matches/mission-card";
import type { Mission } from "@/hooks/use-missions";

// ─── Mock data factory ────────────────────────────────────────────────────────

const TWO_DAYS_FROM_NOW = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
const EXPIRED_DATE = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();

const BASE_MISSION: Mission = {
    id: "preview-1",
    matchId: "preview-match",
    missionType: "coffee_meetup",
    title: "Coffee Run",
    description: "Grab a coffee together at your favourite campus spot and chat for at least 20 minutes.",
    emoji: "☕",
    suggestedLocation: "Java House, Strathmore",
    suggestedTime: "Weekday afternoon",
    deadline: TWO_DAYS_FROM_NOW,
    status: "proposed",
    viewerAccepted: false,
    viewerCompleted: false,
    viewerRating: null,
    partnerAccepted: false,
    partnerCompleted: false,
    partnerRating: null,
};

// ─── State definitions ────────────────────────────────────────────────────────

type SimState =
    | "proposed"
    | "viewer_accepted"
    | "both_accepted"
    | "completed"
    | "expired"
    | "rating";

function buildMission(sim: SimState): Mission {
    switch (sim) {
        case "proposed":
            return { ...BASE_MISSION, status: "proposed" };
        case "viewer_accepted":
            return { ...BASE_MISSION, status: "proposed", viewerAccepted: true };
        case "both_accepted":
            return { ...BASE_MISSION, status: "accepted", viewerAccepted: true, partnerAccepted: true };
        case "completed":
            return {
                ...BASE_MISSION,
                status: "completed",
                viewerAccepted: true,
                partnerAccepted: true,
                viewerCompleted: true,
                partnerCompleted: true,
            };
        case "expired":
            return { ...BASE_MISSION, status: "expired", deadline: EXPIRED_DATE };
        case "rating":
            return {
                ...BASE_MISSION,
                status: "accepted",
                viewerAccepted: true,
                partnerAccepted: true,
                deadline: EXPIRED_DATE,
            };
    }
}

const STATE_SEQUENCE: SimState[] = [
    "proposed",
    "viewer_accepted",
    "both_accepted",
    "completed",
];

const STATE_LABELS: Record<SimState, string> = {
    proposed: "① Proposed",
    viewer_accepted: "② You accepted",
    both_accepted: "③ Both accepted",
    completed: "④ Completed",
    expired: "⑤ Expired",
    rating: "⑥ Rating sheet",
};

// ─── Preview Screen ───────────────────────────────────────────────────────────

export default function MissionsPreviewScreen() {
    const { colors, colorScheme } = useTheme();
    const router = useRouter();

    // Live simulator state
    const [simState, setSimState] = useState<SimState>("proposed");
    const [feedbackVisible, setFeedbackVisible] = useState(false);
    const [pendingAction, setPendingAction] = useState<string | null>(null);
    const [lastRating, setLastRating] = useState<string | null>(null);

    const mission = buildMission(simState === "rating" ? "rating" : simState);

    const advanceSim = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const idx = STATE_SEQUENCE.indexOf(simState as any);
        if (idx < STATE_SEQUENCE.length - 1) {
            setSimState(STATE_SEQUENCE[idx + 1]);
        }
    };

    const simulateAction = (action: string, nextState?: SimState) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setPendingAction(action);
        setTimeout(() => {
            setPendingAction(null);
            if (nextState) setSimState(nextState);
        }, 800);
    };

    const liveProps: Partial<MissionCardViewProps> = {
        isAcceptPending: pendingAction === "accept",
        isCompletePending: pendingAction === "complete",
        isSuggestOtherPending: pendingAction === "suggest",
        feedbackVisible,
        onAccept: () => simulateAction("accept", "viewer_accepted"),
        onComplete: () => simulateAction("complete", "completed"),
        onSuggestOther: () => simulateAction("suggest", "proposed"),
        onSelectRating: (r) => {
            setLastRating(r);
            setFeedbackVisible(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
        onCloseFeedback: () => setFeedbackVisible(false),
    };

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={["top"]}>
            <StatusBar barStyle={colorScheme === "dark" ? "light-content" : "dark-content"} />

            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <Text style={{ color: colors.primary, fontSize: 15 }}>← Back</Text>
                </Pressable>
                <Text style={[styles.headerTitle, { color: colors.foreground }]}>Mission Card Preview</Text>
                <View style={{ width: 60 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* ── LIVE SIMULATOR ─────────────────────────────────────────── */}
                <SectionLabel label="🎮 Interactive Simulator" colors={colors} />
                <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                    Tap the action buttons inside the card to simulate real state transitions.
                </Text>

                {/* State picker pills */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow}>
                    {(Object.keys(STATE_LABELS) as SimState[]).map((s) => (
                        <Pressable
                            key={s}
                            onPress={() => {
                                setSimState(s);
                                setFeedbackVisible(s === "rating");
                                setLastRating(null);
                            }}
                            style={[
                                styles.pill,
                                {
                                    backgroundColor: simState === s ? colors.primary : colors.card,
                                    borderColor: simState === s ? colors.primary : colors.border,
                                },
                            ]}
                        >
                            <Text style={[styles.pillText, { color: simState === s ? "#fff" : colors.foreground }]}>
                                {STATE_LABELS[s]}
                            </Text>
                        </Pressable>
                    ))}
                </ScrollView>

                {/* Live card — full (non-compact) */}
                <View style={[styles.chatFrame, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.frameLabel, { color: colors.mutedForeground }]}>Chat view (full)</Text>
                    <MissionCardView mission={mission} {...liveProps} />
                </View>

                {/* Live card — compact (banner mode) */}
                <View style={[styles.chatFrame, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.frameLabel, { color: colors.mutedForeground }]}>Sticky banner (compact)</Text>
                    <MissionCardView mission={mission} compact {...liveProps} />
                </View>

                {/* Advance button */}
                {STATE_SEQUENCE.includes(simState as any) &&
                    STATE_SEQUENCE.indexOf(simState as any) < STATE_SEQUENCE.length - 1 && (
                        <Pressable
                            onPress={advanceSim}
                            style={[styles.advanceBtn, { backgroundColor: colors.primary }]}
                        >
                            <Text style={styles.advanceBtnText}>
                                Skip → {STATE_LABELS[STATE_SEQUENCE[STATE_SEQUENCE.indexOf(simState as any) + 1]]}
                            </Text>
                        </Pressable>
                    )}

                {lastRating && (
                    <View style={[styles.ratingResult, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={{ color: colors.foreground, fontWeight: "600" }}>
                            Rating submitted: <Text style={{ color: colors.primary }}>{lastRating}</Text>
                        </Text>
                    </View>
                )}

                {/* ── ALL STATES SNAPSHOT ─────────────────────────────────────── */}
                <SectionLabel label="📸 All States at a Glance" colors={colors} />
                <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                    Static snapshots — buttons are non-functional here.
                </Text>

                {(Object.keys(STATE_LABELS) as SimState[]).map((s) => (
                    <View key={s} style={[styles.snapshotFrame, { borderColor: colors.border }]}>
                        <Text style={[styles.snapshotLabel, { color: colors.primary }]}>{STATE_LABELS[s]}</Text>
                        <MissionCardView
                            mission={buildMission(s)}
                            feedbackVisible={s === "rating"}
                            onAccept={() => {}}
                            onComplete={() => {}}
                            onSuggestOther={() => {}}
                            onSelectRating={() => {}}
                            onCloseFeedback={() => {}}
                        />
                    </View>
                ))}

                <View style={{ height: 60 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

// ─── Tiny helper ─────────────────────────────────────────────────────────────

function SectionLabel({ label, colors }: { label: string; colors: any }) {
    return (
        <Text style={[styles.sectionLabel, { color: colors.foreground, borderBottomColor: colors.border }]}>
            {label}
        </Text>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    safe: { flex: 1 },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    backBtn: { width: 60 },
    headerTitle: { fontSize: 16, fontWeight: "700" },
    scroll: { padding: 16, gap: 8 },
    sectionLabel: {
        fontSize: 15,
        fontWeight: "700",
        marginTop: 24,
        marginBottom: 6,
        paddingBottom: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    hint: { fontSize: 12, marginBottom: 10, lineHeight: 18 },
    pillRow: { marginBottom: 8, marginHorizontal: -4 },
    pill: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1,
        marginHorizontal: 4,
    },
    pillText: { fontSize: 12, fontWeight: "600" },
    chatFrame: {
        borderRadius: 16,
        borderWidth: StyleSheet.hairlineWidth,
        marginBottom: 10,
        paddingTop: 8,
        paddingBottom: 12,
        overflow: "hidden",
    },
    frameLabel: {
        fontSize: 11,
        fontWeight: "600",
        textAlign: "center",
        letterSpacing: 0.4,
        marginBottom: 4,
    },
    advanceBtn: {
        padding: 14,
        borderRadius: 14,
        alignItems: "center",
        marginTop: 4,
        marginBottom: 8,
    },
    advanceBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
    ratingResult: {
        padding: 12,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: "center",
        marginBottom: 8,
    },
    snapshotFrame: {
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: 16,
        marginBottom: 12,
        paddingTop: 10,
        paddingBottom: 10,
        overflow: "hidden",
    },
    snapshotLabel: {
        fontSize: 11,
        fontWeight: "700",
        textAlign: "center",
        marginBottom: 4,
        letterSpacing: 0.3,
    },
});
