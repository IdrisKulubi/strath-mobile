/**
 * RevealFlow
 *
 * Bottom-sheet shown when a user taps "👀 Reveal" on an anonymous post.
 *
 * States:
 * 1. Pre-request  — Explain the reveal system + confirm button
 * 2. Pending      — Request sent, waiting for author to reciprocate
 * 3. Mutual       — Both sides agreed, show both real profiles
 */
import React from "react";
import {
    View,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";

import { Text } from "@/components/ui/text";
import { useTheme } from "@/hooks/use-theme";
import { useRequestReveal } from "@/hooks/use-pulse";
import type { PulsePost, RevealResponse } from "@/types/pulse";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface RevealFlowProps {
    post: PulsePost;
    onClose: () => void;
    /** If provided (from a previous POST response), skip straight to result state */
    revealResult?: RevealResponse;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RevealFlow({ post, onClose, revealResult }: RevealFlowProps) {
    const { mutate: requestReveal, isPending, data, isSuccess } = useRequestReveal(post.id);

    const result = isSuccess ? data : revealResult;

    const handleRequest = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        requestReveal(undefined, {
            onSuccess: (res) => {
                if (res.mutual) {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
            },
        });
    };

    return (
        <View style={styles.container}>
            {/* Drag handle */}
            <View style={styles.handle} />

            {/* ── Mutual reveal ── */}
            {result?.mutual ? (
                <MutualRevealView result={result} onClose={onClose} />
            ) : result?.requested ? (
                /* ── Pending state ── */
                <PendingRevealView post={post} onClose={onClose} />
            ) : (
                /* ── Pre-request state ── */
                <PreRequestView
                    post={post}
                    alreadyRequested={post.viewerRequestedReveal}
                    isPending={isPending}
                    onRequest={handleRequest}
                    onClose={onClose}
                />
            )}
        </View>
    );
}

// ─── Sub-views ────────────────────────────────────────────────────────────────

function PreRequestView({
    post,
    alreadyRequested,
    isPending,
    onRequest,
    onClose,
}: {
    post: PulsePost;
    alreadyRequested: boolean;
    isPending: boolean;
    onRequest: () => void;
    onClose: () => void;
}) {
    const { colors, isDark } = useTheme();

    return (
        <>
            <Text style={[styles.emoji]}>👀</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>
                Reveal Identity
            </Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>
                Send a reveal request to this person. If they also request to reveal on
                your post, both of you will see each other&apos;s real profiles.
            </Text>

            <View
                style={[
                    styles.infoBox,
                    {
                        backgroundColor: isDark
                            ? "rgba(255,255,255,0.04)"
                            : "rgba(0,0,0,0.03)",
                    },
                ]}
            >
                <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
                    ✅ Both sides must agree{"\n"}
                    ✅ No one is revealed without consent{"\n"}
                    {"✅ You can stay anonymous if they don't respond"}
                </Text>
            </View>

            <TouchableOpacity
                onPress={alreadyRequested ? onClose : onRequest}
                disabled={isPending}
                style={[
                    styles.primaryBtn,
                    {
                        backgroundColor: alreadyRequested
                            ? isDark
                                ? "rgba(255,255,255,0.08)"
                                : "rgba(0,0,0,0.07)"
                            : colors.primary,
                    },
                ]}
                activeOpacity={0.85}
            >
                {isPending ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text
                        style={[
                            styles.primaryBtnText,
                            { color: alreadyRequested ? colors.mutedForeground : "#fff" },
                        ]}
                    >
                        {alreadyRequested ? "Request already sent ✓" : "Send Reveal Request"}
                    </Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity onPress={onClose} style={styles.secondaryBtn}>
                <Text style={[styles.secondaryBtnText, { color: colors.mutedForeground }]}>
                    Not now
                </Text>
            </TouchableOpacity>
        </>
    );
}

function PendingRevealView({
    post,
    onClose,
}: {
    post: PulsePost;
    onClose: () => void;
}) {
    const { colors } = useTheme();
    return (
        <>
            <Text style={styles.emoji}>⏳</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>
                Request Sent!
            </Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>
                {"They've been notified. If they request a reveal on your posts too,"}
                {"you'll both see each other's real profiles."}
            </Text>
            <TouchableOpacity onPress={onClose} style={[styles.primaryBtn, { backgroundColor: colors.primary }]}>
                <Text style={styles.primaryBtnText}>Got it</Text>
            </TouchableOpacity>
        </>
    );
}

function MutualRevealView({
    result,
    onClose,
}: {
    result: RevealResponse;
    onClose: () => void;
}) {
    const { colors, isDark } = useTheme();
    const { authorProfile, requesterProfile } = result;

    return (
        <>
            <Text style={styles.emoji}>🎉</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>
                {"It's a Mutual Reveal!"}
            </Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>
                You both wanted to connect. Here they are!
            </Text>

            {/* Profile reveal cards */}
            <View style={styles.profileRow}>
                {[requesterProfile, authorProfile].map((profile, i) => {
                    if (!profile) return null;
                    const avatarSrc = profile.profilePhoto ?? profile.image ?? null;
                    return (
                        <View
                            key={i}
                            style={[
                                styles.profileCard,
                                {
                                    backgroundColor: isDark
                                        ? "rgba(255,255,255,0.06)"
                                        : "#f8fafc",
                                    borderColor: isDark
                                        ? "rgba(255,255,255,0.1)"
                                        : "rgba(0,0,0,0.08)",
                                },
                            ]}
                        >
                            {avatarSrc ? (
                                <Image
                                    source={{ uri: avatarSrc }}
                                    style={styles.profileAvatar}
                                    contentFit="cover"
                                />
                            ) : (
                                <View style={[styles.profileAvatar, styles.profileAvatarFallback]}>
                                    <Text style={styles.profileAvatarText}>
                                        {profile.name?.[0]?.toUpperCase() ?? "?"}
                                    </Text>
                                </View>
                            )}
                            <Text
                                style={[styles.profileName, { color: colors.foreground }]}
                                numberOfLines={1}
                            >
                                {profile.name ?? "Unknown"}
                            </Text>
                            <Text style={[styles.profileLabel, { color: colors.mutedForeground }]}>
                                {i === 0 ? "You" : "Them"}
                            </Text>
                        </View>
                    );
                })}
            </View>

            <TouchableOpacity
                onPress={onClose}
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.85}
            >
                <Text style={styles.primaryBtnText}>Awesome! 🎉</Text>
            </TouchableOpacity>
        </>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 40,
        alignItems: "center",
        gap: 14,
    },
    handle: {
        width: 38,
        height: 4,
        borderRadius: 2,
        backgroundColor: "rgba(148,163,184,0.4)",
        marginBottom: 4,
    },
    emoji: {
        fontSize: 52,
        marginTop: 4,
    },
    title: {
        fontSize: 22,
        fontWeight: "800",
        textAlign: "center",
    },
    body: {
        fontSize: 14,
        fontWeight: "400",
        textAlign: "center",
        lineHeight: 21,
    },
    infoBox: {
        width: "100%",
        padding: 14,
        borderRadius: 14,
    },
    infoText: {
        fontSize: 13,
        fontWeight: "500",
        lineHeight: 22,
    },
    primaryBtn: {
        width: "100%",
        paddingVertical: 15,
        borderRadius: 16,
        alignItems: "center",
    },
    primaryBtnText: {
        color: "#fff",
        fontSize: 15,
        fontWeight: "700",
    },
    secondaryBtn: {
        paddingVertical: 10,
    },
    secondaryBtnText: {
        fontSize: 14,
        fontWeight: "500",
    },
    profileRow: {
        flexDirection: "row",
        gap: 16,
        marginTop: 4,
    },
    profileCard: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
        alignItems: "center",
        gap: 8,
    },
    profileAvatar: {
        width: 72,
        height: 72,
        borderRadius: 36,
    },
    profileAvatarFallback: {
        backgroundColor: "rgba(139,92,246,0.2)",
        alignItems: "center",
        justifyContent: "center",
    },
    profileAvatarText: {
        fontSize: 28,
        fontWeight: "700",
        color: "#8b5cf6",
    },
    profileName: {
        fontSize: 15,
        fontWeight: "700",
        textAlign: "center",
    },
    profileLabel: {
        fontSize: 11,
        fontWeight: "500",
    },
});
