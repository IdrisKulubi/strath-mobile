/**
 * NearbyStudents
 *
 * Shows a list of active study sessions at the same university.
 * Each card shows the person's mini profile + location + vibe,
 * with a "Join" button that sends a friendly connection request.
 */
import React, { useState } from "react";
import {
    View,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
} from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";

import { Text } from "@/components/ui/text";
import { useTheme } from "@/hooks/use-theme";
import { useJoinSession } from "@/hooks/use-study-date";
import type { NearbyStudySession } from "@/types/study-date";
import { VIBE_EMOJIS, VIBE_LABELS } from "@/types/study-date";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function untilLabel(isoDate: string): string {
    const remaining = new Date(isoDate).getTime() - Date.now();
    if (remaining <= 0) return "ending";
    const mins = Math.floor(remaining / 60000);
    if (mins < 60) return `${mins}m left`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h left`;
}

// ─── Session card ─────────────────────────────────────────────────────────────

interface SessionCardProps {
    session: NearbyStudySession;
}

function SessionCard({ session }: SessionCardProps) {
    const { colors, isDark } = useTheme();
    const { mutate: join, isPending, isSuccess } = useJoinSession(session.id);
    const [hasSent, setHasSent] = useState(false);

    const handleJoin = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        join(undefined, {
            onSuccess: () => {
                setHasSent(true);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            },
            onError: (error) => {
                Alert.alert("Couldn't send request", error.message);
            },
        });
    };

    const sent = hasSent || isSuccess;

    return (
        <View
            style={[
                styles.card,
                {
                    backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#fff",
                    borderColor: isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.07)",
                },
            ]}
        >
            {/* Avatar */}
            <View
                style={[
                    styles.avatar,
                    {
                        backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
                    },
                ]}
            >
                {session.user?.image ? (
                    <Image
                        source={{ uri: session.user.image }}
                        style={styles.avatarImage}
                        contentFit="cover"
                    />
                ) : (
                    <Text style={styles.avatarFallback}>
                        {session.user?.name?.charAt(0)?.toUpperCase() ?? "?"}
                    </Text>
                )}
            </View>

            {/* Info */}
            <View style={styles.info}>
                <Text style={[styles.name, { color: colors.foreground }]}>
                    {session.user?.name ?? "Student"}
                </Text>
                <Text style={[styles.locationText, { color: colors.mutedForeground }]}>
                    📍 {session.locationName}
                </Text>
                <View style={styles.badges}>
                    {session.vibe && (
                        <View
                            style={[
                                styles.badge,
                                {
                                    backgroundColor: isDark
                                        ? "rgba(139,92,246,0.15)"
                                        : "rgba(139,92,246,0.08)",
                                },
                            ]}
                        >
                            <Text style={styles.badgeText}>
                                {VIBE_EMOJIS[session.vibe]} {VIBE_LABELS[session.vibe]}
                            </Text>
                        </View>
                    )}
                    <View
                        style={[
                            styles.badge,
                            {
                                backgroundColor: isDark
                                    ? "rgba(255,255,255,0.06)"
                                    : "rgba(0,0,0,0.04)",
                            },
                        ]}
                    >
                        <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>
                            ⏳ {untilLabel(session.availableUntil)}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Join button */}
            <TouchableOpacity
                onPress={handleJoin}
                disabled={isPending || sent}
                style={[
                    styles.joinBtn,
                    {
                        backgroundColor: sent
                            ? isDark
                                ? "rgba(16,185,129,0.15)"
                                : "rgba(16,185,129,0.1)"
                            : colors.primary,
                        borderWidth: sent ? 1 : 0,
                        borderColor: sent ? "rgba(16,185,129,0.4)" : undefined,
                    },
                ]}
                activeOpacity={0.8}
            >
                {isPending ? (
                    <ActivityIndicator size="small" color={sent ? "#10b981" : "#fff"} />
                ) : (
                    <Text style={[styles.joinText, { color: sent ? "#10b981" : "#fff" }]}>
                        {sent ? "Sent ✓" : "Join"}
                    </Text>
                )}
            </TouchableOpacity>
        </View>
    );
}

// ─── List ─────────────────────────────────────────────────────────────────────

interface NearbyStudentsProps {
    sessions: NearbyStudySession[];
    isLoading?: boolean;
}

export function NearbyStudents({ sessions, isLoading }: NearbyStudentsProps) {
    const { colors } = useTheme();

    if (isLoading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (sessions.length === 0) {
        return (
            <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>😴</Text>
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                    No one nearby yet
                </Text>
                <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                    {"Be the first to go live and others will see you here."}
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.list}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
                {sessions.length} {sessions.length === 1 ? "person" : "people"} studying nearby
            </Text>
            {sessions.map((s) => (
                <SessionCard key={s.id} session={s} />
            ))}
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    list: { gap: 12 },
    sectionTitle: {
        fontSize: 12,
        fontWeight: "600",
        letterSpacing: 0.5,
        textTransform: "uppercase",
        marginBottom: 4,
        lineHeight: 18,
    },
    card: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
    },
    avatarImage: { width: 48, height: 48, borderRadius: 24 },
    avatarFallback: { fontSize: 20, fontWeight: "700", lineHeight: 28 },
    info: { flex: 1, gap: 4 },
    name: { fontSize: 15, fontWeight: "600", lineHeight: 20 },
    locationText: { fontSize: 12, lineHeight: 16 },
    badges: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    badgeText: { fontSize: 11, fontWeight: "600", color: "#8b5cf6", lineHeight: 16 },
    joinBtn: {
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: 20,
        minWidth: 60,
        alignItems: "center",
    },
    joinText: { fontSize: 13, fontWeight: "700", lineHeight: 18 },
    centered: { paddingVertical: 40, alignItems: "center" },
    empty: { alignItems: "center", paddingVertical: 48, gap: 8 },
    emptyEmoji: { fontSize: 40, lineHeight: 48 },
    emptyTitle: { fontSize: 16, fontWeight: "700", lineHeight: 22 },
    emptySub: { fontSize: 13, textAlign: "center", lineHeight: 18, paddingHorizontal: 32 },
});
