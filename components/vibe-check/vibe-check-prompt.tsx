import React from "react";
import {
    View,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
} from "react-native";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/hooks/use-theme";
import { useVibeCheck } from "@/hooks/use-vibe-check";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Microphone, PhoneCall } from "phosphor-react-native";

interface VibeCheckPromptProps {
    matchId: string;
    partnerFirstName?: string | null;
    /** Hide when a call is already completed or a decision is pending */
    compact?: boolean;
}

/**
 * Renders a banner/card that invites the current user to start or
 * join a 3-minute anonymous voice date with their match.
 *
 * Place this at the top of a chat screen or on a match card.
 */
export function VibeCheckPrompt({
    matchId,
    partnerFirstName,
    compact = false,
}: VibeCheckPromptProps) {
    const { colors, isDark } = useTheme();
    const router = useRouter();

    const { vibeCheckStatus, isStatusLoading, createVibeCheck, isCreating } =
        useVibeCheck(matchId);

    // Don't show if the status is still loading  
    if (isStatusLoading) return null;

    // Don't show if a completed check already exists
    if (vibeCheckStatus?.status === "completed") return null;

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        if (vibeCheckStatus?.exists && vibeCheckStatus.vibeCheckId) {
            // Already created — navigate to call screen directly
            router.push(`/vibe-check/${matchId}` as never);
        } else {
            // Create a new session then navigate
            createVibeCheck(matchId, {
                onSuccess: () => {
                    router.push(`/vibe-check/${matchId}` as never);
                },
            });
        }
    };

    const name = partnerFirstName ?? "them";

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: isDark
                        ? "rgba(139, 92, 246, 0.12)"
                        : "rgba(139, 92, 246, 0.08)",
                    borderColor: isDark
                        ? "rgba(139, 92, 246, 0.35)"
                        : "rgba(139, 92, 246, 0.25)",
                },
                compact && styles.containerCompact,
            ]}
        >
            <View style={styles.iconRow}>
                <View
                    style={[
                        styles.iconBadge,
                        { backgroundColor: "rgba(139, 92, 246, 0.2)" },
                    ]}
                >
                    <Microphone size={18} weight="fill" color="#8b5cf6" />
                </View>
                <View style={styles.textBlock}>
                    <Text style={[styles.heading, { color: colors.foreground }]}>
                        Vibe Check 🎤
                    </Text>
                    {!compact && (
                        <Text
                            style={[styles.subtext, { color: colors.mutedForeground }]}
                        >
                            3-min anonymous voice date with {name}. No video, just vibes.
                        </Text>
                    )}
                </View>
            </View>

            <TouchableOpacity
                style={[styles.button, { opacity: isCreating ? 0.6 : 1 }]}
                onPress={handlePress}
                disabled={isCreating}
                activeOpacity={0.8}
            >
                {isCreating ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                    <>
                        <PhoneCall size={15} weight="fill" color="#ffffff" />
                        <Text style={styles.buttonText}>
                            {vibeCheckStatus?.exists ? "Rejoin" : "Start"}
                        </Text>
                    </>
                )}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 16,
        borderWidth: 1,
        padding: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
    },
    containerCompact: {
        paddingVertical: 10,
        marginVertical: 4,
    },
    iconRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        flex: 1,
    },
    iconBadge: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    textBlock: {
        flex: 1,
    },
    heading: {
        fontSize: 14,
        fontWeight: "700",
    },
    subtext: {
        fontSize: 12,
        lineHeight: 17,
        marginTop: 2,
    },
    button: {
        backgroundColor: "#8b5cf6",
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 8,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    buttonText: {
        color: "#ffffff",
        fontSize: 13,
        fontWeight: "700",
    },
});
