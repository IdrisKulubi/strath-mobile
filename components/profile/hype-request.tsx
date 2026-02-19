/**
 * HypeRequest - "Get Hyped Up!" screen section
 */
import React, { useCallback } from "react";
import {
    View,
    TouchableOpacity,
    Share,
    Alert,
    ActivityIndicator,
    FlatList,
    StyleSheet,
} from "react-native";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";

import { Text } from "@/components/ui/text";
import { useTheme } from "@/hooks/use-theme";
import {
    useMyHype,
    useGenerateLink,
    useModerateVouch,
    useDeleteVouch,
} from "@/hooks/use-hype";
import type { HypeVouch } from "@/types/hype";

export function HypeRequest() {
    const { colors, isDark } = useTheme();
    const { data, isLoading, isError } = useMyHype();
    const { mutate: generateLink, isPending: isGenerating } = useGenerateLink();

    const activeLink = data?.activeLink ?? null;
    const vouches: HypeVouch[] = data?.vouches ?? [];

    const handleGenerateLink = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        generateLink(undefined, {
            onError: (err) => Alert.alert("Error", err.message),
        });
    }, [generateLink]);

    const handleCopyLink = useCallback(async (url: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await Clipboard.setStringAsync(url);
        Alert.alert("Copied!", "Share the link with your friends.");
    }, []);

    const handleShareLink = useCallback(async (url: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await Share.share({ message: `Vouch for me on StrathSpace! ${url}` });
    }, []);

    if (isLoading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color="#ec4899" />
            </View>
        );
    }

    if (isError) {
        return (
            <View style={styles.center}>
                <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
                    Failed to load hype data.
                </Text>
            </View>
        );
    }

    const header = (
        <>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.foreground }]}>Get Hyped Up!</Text>
                <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                    Ask friends to vouch for you. They don&apos;t need the app.
                </Text>
            </View>

            <View
                style={[
                    styles.linkCard,
                    {
                        backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#ffffff",
                        borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
                    },
                ]}
            >
                {activeLink ? (
                    <>
                        <Text style={[styles.linkLabel, { color: colors.mutedForeground }]}>
                            Your invite link ({(activeLink.maxUses ?? 5) - (activeLink.currentUses ?? 0)} uses left)
                        </Text>
                        <Text
                            style={[styles.linkUrl, { color: colors.foreground }]}
                            numberOfLines={1}
                            ellipsizeMode="middle"
                        >
                            {activeLink.url}
                        </Text>
                        <View style={styles.linkButtons}>
                                        <LinkButton label="Copy" emoji="📋" onPress={() => handleCopyLink(activeLink.url)} colors={colors} isDark={isDark} />
                                        <LinkButton label="Share" emoji="📤" onPress={() => handleShareLink(activeLink.url)} colors={colors} isDark={isDark} />
                                        <LinkButton label="Refresh" emoji="🔄" onPress={handleGenerateLink} loading={isGenerating} colors={colors} isDark={isDark} />
                        </View>
                    </>
                ) : (
                    <View style={styles.noLinkContent}>
                        <Text style={[styles.noLinkText, { color: colors.mutedForeground }]}>
                            No active invite link yet.
                        </Text>
                        <TouchableOpacity onPress={handleGenerateLink} disabled={isGenerating} activeOpacity={0.85} style={styles.generateBtn}>
                            {isGenerating ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.generateBtnText}>Generate invite link</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <View style={styles.vouchSectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                    Your vouches ({vouches.length})
                </Text>
            </View>

            {vouches.length === 0 && (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyEmoji}>💬</Text>
                    <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                        No vouches yet. Share your link and let the hype begin!
                    </Text>
                </View>
            )}
        </>
    );

    return (
        <FlatList
            data={vouches}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
                <VouchCard vouch={item} isDark={isDark} colors={colors} />
            )}
            ListHeaderComponent={header}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
            initialNumToRender={6}
            windowSize={7}
            maxToRenderPerBatch={8}
            updateCellsBatchingPeriod={50}
            removeClippedSubviews
        />
    );
}

interface VouchCardProps {
    vouch: HypeVouch;
    isDark: boolean;
    colors: Record<string, string>;
}

function VouchCard({ vouch, isDark, colors }: VouchCardProps) {
    const { mutate: moderate, isPending: isModerating } = useModerateVouch();
    const { mutate: deleteVouch, isPending: isDeleting } = useDeleteVouch();

    const isApproved = vouch.isApproved !== false;

    const handleToggle = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        moderate(
            { vouchId: vouch.id, action: isApproved ? "hide" : "approve" },
            { onError: (e) => Alert.alert("Error", e.message) }
        );
    }, [vouch.id, isApproved, moderate]);

    const handleDelete = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        Alert.alert("Delete vouch?", "This cannot be undone.", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: () => deleteVouch({ vouchId: vouch.id }, { onError: (e) => Alert.alert("Error", e.message) }),
            },
        ]);
    }, [vouch.id, deleteVouch]);

    const isPending = isModerating || isDeleting;

    return (
        <View
            style={[
                styles.vouchCard,
                {
                    backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#ffffff",
                    borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
                    opacity: isApproved ? 1 : 0.5,
                },
            ]}
        >
            <View style={[styles.statusBadge, { backgroundColor: isApproved ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)" }]}>
                <Text style={[styles.statusText, { color: isApproved ? "#10b981" : "#ef4444" }]}>
                    {isApproved ? "Visible" : "Hidden"}
                </Text>
            </View>

            <Text style={[styles.vouchContent, { color: colors.foreground }]}>
                {vouch.content}
            </Text>
            <Text style={[styles.vouchAuthor, { color: colors.mutedForeground }]}>
                 {vouch.authorName}
            </Text>

            <View style={styles.vouchActions}>
                <TouchableOpacity
                    onPress={handleToggle}
                    disabled={isPending}
                    activeOpacity={0.75}
                    style={[styles.vouchActionBtn, { borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)" }]}
                >
                    {isModerating ? (
                        <ActivityIndicator size="small" color={colors.mutedForeground} />
                    ) : (
                        <Text style={[styles.vouchActionText, { color: colors.foreground }]}>
                            {isApproved ? "Hide" : "Show"}
                        </Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={handleDelete}
                    disabled={isPending}
                    activeOpacity={0.75}
                    style={[styles.vouchActionBtn, { borderColor: "rgba(239,68,68,0.3)" }]}
                >
                    {isDeleting ? (
                        <ActivityIndicator size="small" color="#ef4444" />
                    ) : (
                        <Text style={[styles.vouchActionText, { color: "#ef4444" }]}>Delete</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

interface LinkButtonProps {
    label: string;
    emoji: string;
    onPress: () => void;
    loading?: boolean;
    colors: Record<string, string>;
    isDark: boolean;
}

function LinkButton({ label, emoji, onPress, loading, colors, isDark }: LinkButtonProps) {
    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={loading}
            activeOpacity={0.75}
            style={[
                styles.smallBtn,
                {
                    backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
                    borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)",
                },
            ]}
        >
            {loading ? (
                <ActivityIndicator size="small" color={colors.mutedForeground} />
            ) : (
                <Text style={[styles.smallBtnText, { color: colors.foreground }]}>
                    {emoji} {label}
                </Text>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    scroll: { paddingTop: 48, paddingHorizontal: 20, paddingBottom: 40, gap: 20 },
    center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
    errorText: { fontSize: 14, textAlign: "center" },
    header: { gap: 6, marginBottom: 4 },
    title: { fontSize: 24, lineHeight: 30, fontWeight: "700", paddingTop: 2 },
    subtitle: { fontSize: 14, lineHeight: 20 },
    linkCard: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 12 },
    linkLabel: { fontSize: 12, fontWeight: "500" },
    linkUrl: { fontSize: 13, fontWeight: "600" },
    linkButtons: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    noLinkContent: { alignItems: "center", gap: 12 },
    noLinkText: { fontSize: 14, textAlign: "center" },
    generateBtn: {
        paddingHorizontal: 22,
        paddingVertical: 10,
        borderRadius: 50,
        backgroundColor: "#ec4899",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 160,
        minHeight: 40,
    },
    generateBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
    vouchSectionHeader: { marginTop: 4 },
    sectionTitle: { fontSize: 16, fontWeight: "600" },
    emptyState: { alignItems: "center", gap: 10, paddingVertical: 24 },
    emptyEmoji: { fontSize: 36 },
    emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
    vouchCard: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 8 },
    statusBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
    statusText: { fontSize: 11, fontWeight: "600" },
    vouchContent: { fontSize: 14, lineHeight: 20, fontStyle: "italic" },
    vouchAuthor: { fontSize: 12 },
    vouchActions: { flexDirection: "row", gap: 8, marginTop: 4 },
    vouchActionBtn: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
        minWidth: 64,
        minHeight: 32,
    },
    vouchActionText: { fontSize: 12, fontWeight: "500" },
    smallBtn: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
        minHeight: 34,
    },
    smallBtnText: { fontSize: 13, fontWeight: "500" },
});
