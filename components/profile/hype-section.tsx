/**
 * HypeSection — Read-only vouch display on a user's profile
 *
 * Shown to matches / discoveries. Only displays approved, non-flagged vouches.
 * Horizontally scrollable when there are many vouches.
 */
import React from "react";
import {
    View,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
} from "react-native";

import { Text } from "@/components/ui/text";
import { useTheme } from "@/hooks/use-theme";
import { useProfileVouches } from "@/hooks/use-hype";
import type { HypeVouch } from "@/types/hype";

// ─── Props ────────────────────────────────────────────────────────────────────

interface HypeSectionProps {
    /** The profile owner's user ID */
    userId: string;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function HypeSection({ userId }: HypeSectionProps) {
    const { colors, isDark } = useTheme();
    const { data, isLoading } = useProfileVouches(userId);

    if (isLoading) {
        return (
            <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={colors.mutedForeground} />
            </View>
        );
    }

    const vouches = data?.vouches ?? [];

    // Don't render the section at all if there are no public vouches
    if (vouches.length === 0) return null;

    return (
        <View style={styles.container}>
            {/* Section header */}
            <View style={styles.headerRow}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                    🔥 Friends say…
                </Text>
                <Text style={[styles.count, { color: colors.mutedForeground }]}>
                    {vouches.length} {vouches.length === 1 ? "vouch" : "vouches"}
                </Text>
            </View>

            {/* Horizontal scroll when 3+ vouches, vertical stack otherwise */}
            {vouches.length >= 3 ? (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    decelerationRate="fast"
                    snapToInterval={CARD_WIDTH + 12}
                >
                    {vouches.map((vouch) => (
                        <VouchBubble
                            key={vouch.id}
                            vouch={vouch}
                            isDark={isDark}
                            colors={colors}
                        />
                    ))}
                </ScrollView>
            ) : (
                <View style={styles.stackContent}>
                    {vouches.map((vouch) => (
                        <VouchBubble
                            key={vouch.id}
                            vouch={vouch}
                            isDark={isDark}
                            colors={colors}
                            fullWidth
                        />
                    ))}
                </View>
            )}
        </View>
    );
}

// ─── VouchBubble ──────────────────────────────────────────────────────────────

const CARD_WIDTH = 220;

interface VouchBubbleProps {
    vouch: HypeVouch;
    isDark: boolean;
    colors: Record<string, string>;
    fullWidth?: boolean;
}

function VouchBubble({ vouch, isDark, colors, fullWidth }: VouchBubbleProps) {
    return (
        <View
            style={[
                styles.bubble,
                fullWidth && styles.bubbleFullWidth,
                {
                    backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#ffffff",
                    borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
                },
            ]}
        >
            {/* Quote mark accent */}
            <Text style={[styles.quoteAccent, { color: colors.primary }]}>{"\u201C"}</Text>

            <Text
                style={[styles.bubbleContent, { color: colors.foreground }]}
                numberOfLines={fullWidth ? undefined : 5}
            >
                {vouch.content}
            </Text>

            <Text style={[styles.bubbleAuthor, { color: colors.mutedForeground }]}>
                — {vouch.authorName}
            </Text>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        gap: 12,
        paddingTop: 4,
    },
    loadingRow: {
        alignItems: "center",
        paddingVertical: 12,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "600",
    },
    count: {
        fontSize: 12,
    },

    // Horizontal scroll
    scrollContent: {
        paddingHorizontal: 20,
        gap: 12,
    },

    // Stacked (< 3 vouches)
    stackContent: {
        paddingHorizontal: 20,
        gap: 10,
    },

    // Vouch bubble
    bubble: {
        width: CARD_WIDTH,
        borderRadius: 20,
        borderWidth: 1,
        padding: 14,
        gap: 6,
    },
    bubbleFullWidth: {
        width: "100%",
    },
    quoteAccent: {
        fontSize: 28,
        fontWeight: "800",
        lineHeight: 28,
        marginBottom: -4,
    },
    bubbleContent: {
        fontSize: 13,
        lineHeight: 19,
        fontStyle: "italic",
    },
    bubbleAuthor: {
        fontSize: 11,
        marginTop: 2,
    },
});
