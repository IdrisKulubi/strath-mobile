/**
 * PulsePostCard
 *
 * Renders a single pulse post with:
 * - Masked identity (emoji avatar for anonymous posts)
 * - Category chip
 * - Content text
 * - Reaction buttons (fire / skull / heart) with optimistic counts
 * - Reveal button for anonymous posts
 * - Owner delete option (long-press)
 * - Relative time stamp + expiry countdown < 3h
 */
import React, { useCallback, useMemo } from "react";
import {
    View,
    TouchableOpacity,
    StyleSheet,
    Alert,
    Pressable,
} from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withSequence,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";

import { Text } from "@/components/ui/text";
import { useTheme } from "@/hooks/use-theme";
import { useToggleReaction, useDeletePost } from "@/hooks/use-pulse";
import type { PulsePost, ReactionType } from "@/types/pulse";
import { CATEGORY_EMOJIS, CATEGORY_LABELS, REACTION_EMOJIS } from "@/types/pulse";

// ─── Constants ────────────────────────────────────────────────────────────────

const ANON_AVATARS = ["🎭", "🦋", "🌙", "⚡", "🎪", "🌈", "🔮", "🦄"];

function getAnonAvatar(postId: string): string {
    let hash = 0;
    for (let i = 0; i < postId.length; i++) {
        hash = (hash * 31 + postId.charCodeAt(i)) & 0xffffffff;
    }
    return ANON_AVATARS[Math.abs(hash) % ANON_AVATARS.length];
}

/** Format relative time: "just now", "3m", "2h", "1d" */
function relativeTime(isoDate: string): string {
    const diff = Date.now() - new Date(isoDate).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
}

/** Returns "Xh left" if the post expires within 3 hours */
function expiryLabel(expiresAt: string | null): string | null {
    if (!expiresAt) return null;
    const remaining = new Date(expiresAt).getTime() - Date.now();
    const hours = remaining / 3600000;
    if (hours <= 0) return null;
    if (hours < 1) return `${Math.ceil(remaining / 60000)}m left`;
    if (hours < 3) return `${Math.ceil(hours)}h left`;
    return null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface ReactionButtonProps {
    emoji: string;
    count: number;
    active: boolean;
    onPress: () => void;
    disabled?: boolean;
}

function ReactionButton({ emoji, count, active, onPress, disabled }: ReactionButtonProps) {
    const { colors, isDark } = useTheme();
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePress = () => {
        scale.value = withSequence(
            withSpring(1.35, { damping: 6, stiffness: 400 }),
            withSpring(1, { damping: 10, stiffness: 300 })
        );
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
    };

    return (
        <Animated.View style={animatedStyle}>
            <TouchableOpacity
                onPress={handlePress}
                disabled={disabled}
                style={[
                    styles.reactionBtn,
                    active && {
                        backgroundColor: isDark
                            ? "rgba(255,255,255,0.12)"
                            : "rgba(0,0,0,0.07)",
                    },
                ]}
                activeOpacity={0.75}
            >
                <Text style={styles.reactionEmoji}>{emoji}</Text>
                <Text style={[styles.reactionCount, { color: colors.mutedForeground }]}>
                    {count > 0 ? count : ""}
                </Text>
            </TouchableOpacity>
        </Animated.View>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export interface PulsePostCardProps {
    post: PulsePost;
    /** Called when the user taps the 👀 reveal button */
    onRevealPress?: (post: PulsePost) => void;
}

export function PulsePostCard({ post, onRevealPress }: PulsePostCardProps) {
    const { colors, isDark } = useTheme();
    const { mutate: toggleReaction, isPending: isReacting } = useToggleReaction(post.id);
    const { mutate: deletePost } = useDeletePost();

    const anonAvatar = useMemo(() => getAnonAvatar(post.id), [post.id]);
    const timeAgo = useMemo(() => relativeTime(post.createdAt), [post.createdAt]);
    const expiry = useMemo(() => expiryLabel(post.expiresAt), [post.expiresAt]);

    const handleReaction = useCallback(
        (reaction: ReactionType) => {
            if (isReacting) return;
            toggleReaction(reaction);
        },
        [isReacting, toggleReaction]
    );

    const handleLongPress = useCallback(() => {
        if (!post.isOwner) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        Alert.alert("Delete post?", "This will hide your post from the feed.", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: () => deletePost(post.id),
            },
        ]);
    }, [post.isOwner, post.id, deletePost]);

    const handleReveal = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onRevealPress?.(post);
    }, [post, onRevealPress]);

    return (
        <Pressable onLongPress={handleLongPress} delayLongPress={500}>
            <View
                style={[
                    styles.card,
                    {
                        backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#fff",
                        borderColor: isDark
                            ? "rgba(255,255,255,0.09)"
                            : "rgba(0,0,0,0.07)",
                    },
                ]}
            >
                {/* Header row */}
                <View style={styles.header}>
                    {/* Avatar */}
                    <View
                        style={[
                            styles.avatar,
                            {
                                backgroundColor: isDark
                                    ? "rgba(255,255,255,0.08)"
                                    : "rgba(0,0,0,0.04)",
                            },
                        ]}
                    >
                        {post.isAnonymous || !post.author ? (
                            <Text style={styles.avatarEmoji}>{anonAvatar}</Text>
                        ) : (
                            <Image
                                source={{
                                    uri: post.author.image ?? post.author.name ?? undefined,
                                }}
                                style={styles.avatarImage}
                                contentFit="cover"
                            />
                        )}
                    </View>

                    {/* Meta */}
                    <View style={styles.meta}>
                        <Text style={[styles.authorLabel, { color: colors.mutedForeground }]}>
                            {post.isAnonymous && !post.isOwner
                                ? "Anonymous"
                                : post.author?.name ?? "You"}
                            {post.isOwner && (
                                <Text style={{ color: colors.primary }}> · You</Text>
                            )}
                        </Text>
                        <View style={styles.metaRow}>
                            <Text style={[styles.timestamp, { color: colors.mutedForeground }]}>
                                {timeAgo}
                            </Text>
                            {expiry && (
                                <View
                                    style={[
                                        styles.expiryBadge,
                                        { backgroundColor: "rgba(239,68,68,0.12)" },
                                    ]}
                                >
                                    <Text style={styles.expiryText}>{expiry}</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Category chip */}
                    <View
                        style={[
                            styles.categoryChip,
                            {
                                backgroundColor: isDark
                                    ? "rgba(139,92,246,0.15)"
                                    : "rgba(139,92,246,0.08)",
                            },
                        ]}
                    >
                        <Text style={styles.categoryText}>
                            {CATEGORY_EMOJIS[post.category]}{" "}
                            {CATEGORY_LABELS[post.category]}
                        </Text>
                    </View>
                </View>

                {/* Content */}
                <Text
                    style={[styles.content, { color: colors.foreground }]}
                    numberOfLines={6}
                >
                    {post.content}
                </Text>

                {/* Footer row */}
                <View style={styles.footer}>
                    {/* Reactions */}
                    <View style={styles.reactions}>
                        {(["fire", "skull", "heart"] as ReactionType[]).map((r) => (
                            <ReactionButton
                                key={r}
                                emoji={REACTION_EMOJIS[r]}
                                count={post.reactions[r]}
                                active={post.userReaction === r}
                                onPress={() => handleReaction(r)}
                                disabled={isReacting}
                            />
                        ))}
                    </View>

                    {/* Reveal button — only for anonymous posts by others */}
                    {post.isAnonymous && !post.isOwner && (
                        <TouchableOpacity
                            onPress={handleReveal}
                            style={[
                                styles.revealBtn,
                                post.viewerRequestedReveal && {
                                    borderColor: colors.primary,
                                },
                            ]}
                            activeOpacity={0.8}
                        >
                            <Text
                                style={[
                                    styles.revealBtnText,
                                    {
                                        color: post.viewerRequestedReveal
                                            ? colors.primary
                                            : colors.mutedForeground,
                                    },
                                ]}
                            >
                                {post.viewerRequestedReveal ? "👀 Sent" : "👀 Reveal"}
                            </Text>
                            {post.revealCount > 0 && (
                                <Text
                                    style={[
                                        styles.revealCount,
                                        { color: colors.mutedForeground },
                                    ]}
                                >
                                    {" "}
                                    · {post.revealCount}
                                </Text>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </Pressable>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    card: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 16,
        gap: 12,
        marginBottom: 12,
    },
    header: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    avatarEmoji: {
        fontSize: 20,
    },
    avatarImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    meta: {
        flex: 1,
        gap: 2,
    },
    authorLabel: {
        fontSize: 13,
        fontWeight: "600",
    },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    timestamp: {
        fontSize: 11,
        fontWeight: "400",
    },
    expiryBadge: {
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 20,
    },
    expiryText: {
        fontSize: 10,
        fontWeight: "700",
        color: "#ef4444",
    },
    categoryChip: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 20,
        flexShrink: 0,
    },
    categoryText: {
        fontSize: 11,
        fontWeight: "600",
        color: "#8b5cf6",
    },
    content: {
        fontSize: 15,
        fontWeight: "400",
        lineHeight: 22,
    },
    footer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    reactions: {
        flexDirection: "row",
        gap: 4,
    },
    reactionBtn: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 3,
    },
    reactionEmoji: {
        fontSize: 17,
    },
    reactionCount: {
        fontSize: 12,
        fontWeight: "600",
        minWidth: 10,
    },
    revealBtn: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "rgba(148,163,184,0.3)",
    },
    revealBtnText: {
        fontSize: 12,
        fontWeight: "600",
    },
    revealCount: {
        fontSize: 12,
    },
});
