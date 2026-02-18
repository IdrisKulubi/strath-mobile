/**
 * PostComposer
 *
 * Bottom-sheet composer for creating a new Pulse post.
 * Features:
 * - 280-char counter
 * - Category selector (horizontal scroll)
 * - Anonymous toggle
 * - Submit with loading state + haptic feedback
 */
import React, { useCallback, useRef, useState } from "react";
import {
    View,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
} from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { Text } from "@/components/ui/text";
import { useTheme } from "@/hooks/use-theme";
import { useCreatePost } from "@/hooks/use-pulse";
import type { PulseCategory } from "@/types/pulse";
import { CATEGORY_EMOJIS, CATEGORY_LABELS } from "@/types/pulse";

const MAX_CHARS = 280;
const CATEGORIES = Object.keys(CATEGORY_LABELS) as PulseCategory[];

// ─── Props ────────────────────────────────────────────────────────────────────

export interface PostComposerProps {
    onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PostComposer({ onClose }: PostComposerProps) {
    const { colors, isDark } = useTheme();
    const { mutate: createPost, isPending } = useCreatePost();

    const [content, setContent] = useState("");
    const [category, setCategory] = useState<PulseCategory>("general");
    const [isAnonymous, setIsAnonymous] = useState(true);

    const inputRef = useRef<TextInput>(null);
    const charsLeft = MAX_CHARS - content.length;
    const canSubmit = content.trim().length > 0 && !isPending;

    // Animated submit button
    const submitScale = useSharedValue(1);
    const submitStyle = useAnimatedStyle(() => ({
        transform: [{ scale: submitScale.value }],
    }));

    const handleSubmit = useCallback(() => {
        if (!canSubmit) return;

        submitScale.value = withSpring(0.93, { damping: 8, stiffness: 300 }, () => {
            submitScale.value = withSpring(1);
        });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        createPost(
            { content: content.trim(), category, isAnonymous },
            {
                onSuccess: () => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    onClose();
                },
                onError: (err) => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                    Alert.alert("Couldn't post", err.message ?? "Something went wrong");
                },
            }
        );
    }, [canSubmit, content, category, isAnonymous, createPost, onClose, submitScale]);

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.container}
        >
            {/* Drag handle */}
            <View style={styles.handle} />

            {/* Header */}
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
                    <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>
                        Cancel
                    </Text>
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.foreground }]}>
                    New Pulse
                </Text>
                <Animated.View style={submitStyle}>
                    <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={!canSubmit}
                        style={[
                            styles.submitBtn,
                            {
                                backgroundColor: canSubmit
                                    ? colors.primary
                                    : isDark
                                      ? "rgba(255,255,255,0.1)"
                                      : "rgba(0,0,0,0.07)",
                            },
                        ]}
                        activeOpacity={0.85}
                    >
                        {isPending ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.submitText}>Post</Text>
                        )}
                    </TouchableOpacity>
                </Animated.View>
            </View>

            {/* Content input */}
            <TextInput
                ref={inputRef}
                value={content}
                onChangeText={setContent}
                placeholder="What's on your mind about campus dating? 👀"
                placeholderTextColor={colors.mutedForeground}
                multiline
                autoFocus
                maxLength={MAX_CHARS + 10} // over-allow; validate in service
                style={[
                    styles.input,
                    { color: colors.foreground },
                ]}
            />

            {/* Char counter */}
            <Text
                style={[
                    styles.charCounter,
                    {
                        color:
                            charsLeft < 20
                                ? charsLeft < 0
                                    ? "#ef4444"
                                    : "#f97316"
                                : colors.mutedForeground,
                    },
                ]}
            >
                {charsLeft}
            </Text>

            {/* Category selector */}
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                Category
            </Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryRow}
            >
                {CATEGORIES.map((cat) => {
                    const active = category === cat;
                    return (
                        <TouchableOpacity
                            key={cat}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setCategory(cat);
                            }}
                            style={[
                                styles.catChip,
                                {
                                    backgroundColor: active
                                        ? colors.primary
                                        : isDark
                                          ? "rgba(255,255,255,0.07)"
                                          : "rgba(0,0,0,0.05)",
                                    borderColor: active
                                        ? colors.primary
                                        : isDark
                                          ? "rgba(255,255,255,0.1)"
                                          : "rgba(0,0,0,0.08)",
                                },
                            ]}
                            activeOpacity={0.8}
                        >
                            <Text
                                style={[
                                    styles.catChipText,
                                    { color: active ? "#fff" : colors.foreground },
                                ]}
                            >
                                {CATEGORY_EMOJIS[cat]} {CATEGORY_LABELS[cat]}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* Anonymous toggle */}
            <TouchableOpacity
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setIsAnonymous((v) => !v);
                }}
                style={[
                    styles.anonRow,
                    {
                        backgroundColor: isDark
                            ? "rgba(255,255,255,0.04)"
                            : "rgba(0,0,0,0.03)",
                        borderColor: isDark
                            ? "rgba(255,255,255,0.08)"
                            : "rgba(0,0,0,0.06)",
                    },
                ]}
                activeOpacity={0.85}
            >
                <View>
                    <Text style={[styles.anonLabel, { color: colors.foreground }]}>
                        🎭 Post anonymously
                    </Text>
                    <Text style={[styles.anonSub, { color: colors.mutedForeground }]}>
                        {isAnonymous
                            ? "Your identity is hidden"
                            : "Your name will be shown"}
                    </Text>
                </View>
                <View
                    style={[
                        styles.toggle,
                        {
                            backgroundColor: isAnonymous
                                ? colors.primary
                                : isDark
                                  ? "rgba(255,255,255,0.15)"
                                  : "rgba(0,0,0,0.12)",
                        },
                    ]}
                >
                    <View
                        style={[
                            styles.toggleThumb,
                            isAnonymous && styles.toggleThumbActive,
                        ]}
                    />
                </View>
            </TouchableOpacity>
        </KeyboardAvoidingView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 32,
        gap: 14,
    },
    handle: {
        width: 38,
        height: 4,
        borderRadius: 2,
        backgroundColor: "rgba(148,163,184,0.4)",
        alignSelf: "center",
        marginBottom: 4,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    cancelBtn: {
        paddingVertical: 4,
        paddingHorizontal: 2,
        minWidth: 60,
    },
    cancelText: {
        fontSize: 15,
        fontWeight: "500",
    },
    title: {
        fontSize: 16,
        fontWeight: "700",
    },
    submitBtn: {
        paddingHorizontal: 18,
        paddingVertical: 8,
        borderRadius: 20,
        minWidth: 60,
        alignItems: "center",
    },
    submitText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "700",
    },
    input: {
        fontSize: 16,
        fontWeight: "400",
        lineHeight: 24,
        minHeight: 120,
        textAlignVertical: "top",
    },
    charCounter: {
        fontSize: 12,
        fontWeight: "600",
        textAlign: "right",
        marginTop: -8,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    categoryRow: {
        gap: 8,
        paddingRight: 4,
    },
    catChip: {
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 1,
    },
    catChipText: {
        fontSize: 13,
        fontWeight: "600",
    },
    anonRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
    },
    anonLabel: {
        fontSize: 14,
        fontWeight: "600",
    },
    anonSub: {
        fontSize: 12,
        fontWeight: "400",
        marginTop: 2,
    },
    toggle: {
        width: 44,
        height: 26,
        borderRadius: 13,
        padding: 3,
        justifyContent: "center",
    },
    toggleThumb: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: "#fff",
        alignSelf: "flex-start",
    },
    toggleThumbActive: {
        alignSelf: "flex-end",
    },
});
