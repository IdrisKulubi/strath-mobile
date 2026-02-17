import React, { useEffect, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/hooks/use-theme";
import { WeeklyDropCurrent, WeeklyDropHistoryItem, WeeklyDropMatch } from "@/hooks/use-weekly-drop";
import { ArrowClockwise, Sparkle } from "phosphor-react-native";

interface WeeklyDropProps {
    currentDrop: WeeklyDropCurrent | null;
    history: WeeklyDropHistoryItem[];
    isLoading?: boolean;
    showCurrent?: boolean;
    onRefresh?: () => void;
    onTalkToAgent?: () => void;
    onMatchPress?: (match: WeeklyDropMatch) => void;
    onViewHistory?: () => void;
}

function formatCountdown(totalSeconds: number) {
    if (totalSeconds <= 0) return "Expired";
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
}

function getProfileImage(match: WeeklyDropMatch) {
    return match.profile?.profilePhoto || match.profile?.photos?.[0] || null;
}

export function WeeklyDrop({
    currentDrop,
    history,
    isLoading = false,
    showCurrent = true,
    onRefresh,
    onTalkToAgent,
    onMatchPress,
    onViewHistory,
}: WeeklyDropProps) {
    const { colors, isDark } = useTheme();
    const [secondsLeft, setSecondsLeft] = useState<number>(currentDrop?.remainingSeconds || 0);

    useEffect(() => {
        setSecondsLeft(currentDrop?.remainingSeconds || 0);
    }, [currentDrop?.remainingSeconds]);

    useEffect(() => {
        if (!currentDrop) return;
        const interval = setInterval(() => {
            setSecondsLeft((prev) => Math.max(0, prev - 1));
        }, 1000);

        return () => clearInterval(interval);
    }, [currentDrop]);

    const topThree = useMemo(() => currentDrop?.matches.slice(0, 3) || [], [currentDrop]);

    if (isLoading && !currentDrop) {
        return (
            <View style={[styles.skeleton, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)", borderColor: colors.border }]}>
                <Text style={[styles.skeletonText, { color: colors.mutedForeground }]}>Loading weekly drop...</Text>
            </View>
        );
    }

    if (!currentDrop && history.length === 0) {
        return null;
    }

    return (
        <View style={styles.container}>
            {showCurrent && currentDrop && (
                <View
                    style={[
                        styles.card,
                        {
                            backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#fff",
                            borderColor: colors.border,
                        },
                    ]}
                >
                    <View style={styles.headerRow}>
                        <View style={styles.headerLeft}>
                            <Sparkle size={16} color={colors.primary} weight="fill" />
                            <Text style={[styles.title, { color: colors.foreground }]}>Your Weekly Drop 🎯</Text>
                        </View>
                        {onRefresh && (
                            <Pressable onPress={onRefresh}>
                                <ArrowClockwise size={16} color={colors.mutedForeground} />
                            </Pressable>
                        )}
                    </View>

                    <Text style={[styles.expiry, { color: colors.mutedForeground }]}>Expires in {formatCountdown(secondsLeft)}</Text>

                    <View style={styles.matchesRow}>
                        {topThree.map((match) => {
                            const image = getProfileImage(match);
                            return (
                                <Pressable
                                    key={match.userId}
                                    onPress={() => onMatchPress?.(match)}
                                    style={[styles.matchCard, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)", borderColor: colors.border }]}
                                >
                                    <View style={styles.avatarWrap}>
                                        {image ? (
                                            <Image source={{ uri: image }} style={styles.avatar} />
                                        ) : (
                                            <View style={[styles.avatarFallback, { backgroundColor: colors.primary + "22" }]}>
                                                <Text style={[styles.avatarEmoji, { color: colors.primary }]}>😊</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
                                        {match.profile?.firstName || "Match"}
                                    </Text>
                                    <Text style={[styles.score, { color: colors.primary }]}>{match.score}%</Text>
                                </Pressable>
                            );
                        })}
                    </View>

                    {currentDrop.matchCount > 3 && (
                        <Text style={[styles.more, { color: colors.mutedForeground }]}>+ {currentDrop.matchCount - 3} more matches</Text>
                    )}

                    <View style={styles.footerRow}>
                        <Text style={[styles.footerText, { color: colors.mutedForeground }]}>Don&apos;t like these?</Text>
                        <Pressable
                            onPress={onTalkToAgent}
                            style={[styles.talkButton, { backgroundColor: colors.primary }]}
                        >
                            <Text style={[styles.talkText, { color: colors.primaryForeground }]}>Talk to StrathSpace</Text>
                        </Pressable>
                    </View>
                </View>
            )}

            {history.length > 0 && (
                <View style={[styles.historyCard, { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", borderColor: colors.border }]}>
                    <View style={styles.historyHeader}>
                        <Text style={[styles.historyTitle, { color: colors.foreground }]}>Drop history</Text>
                        {onViewHistory && (
                            <Pressable onPress={onViewHistory}>
                                <Text style={[styles.viewAllText, { color: colors.primary }]}>View full history</Text>
                            </Pressable>
                        )}
                    </View>
                    {history.slice(0, 3).map((item) => (
                        <View key={item.id} style={styles.historyRow}>
                            <Text style={[styles.historyText, { color: colors.mutedForeground }]}>Week {item.dropNumber}</Text>
                            <Text style={[styles.historyText, { color: colors.mutedForeground }]}>{item.matchCount} matches</Text>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16,
        marginBottom: 10,
        gap: 10,
    },
    skeleton: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 14,
    },
    skeletonText: {
        fontSize: 13,
        fontWeight: "600",
    },
    card: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 14,
        gap: 10,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    title: {
        fontSize: 16,
        fontWeight: "800",
    },
    expiry: {
        fontSize: 12,
        fontWeight: "600",
    },
    matchesRow: {
        flexDirection: "row",
        gap: 8,
    },
    matchCard: {
        flex: 1,
        borderRadius: 12,
        borderWidth: 1,
        padding: 8,
        alignItems: "center",
        gap: 4,
    },
    avatarWrap: {
        width: 48,
        height: 48,
        borderRadius: 24,
        overflow: "hidden",
    },
    avatar: {
        width: "100%",
        height: "100%",
    },
    avatarFallback: {
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
    },
    avatarEmoji: {
        fontSize: 20,
        fontWeight: "700",
    },
    name: {
        fontSize: 12,
        fontWeight: "700",
    },
    score: {
        fontSize: 12,
        fontWeight: "800",
    },
    more: {
        fontSize: 12,
        fontWeight: "600",
    },
    footerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
    },
    footerText: {
        fontSize: 12,
        fontWeight: "600",
    },
    talkButton: {
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    talkText: {
        fontSize: 12,
        fontWeight: "700",
    },
    historyCard: {
        borderRadius: 14,
        borderWidth: 1,
        padding: 12,
        gap: 8,
    },
    historyHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    historyTitle: {
        fontSize: 13,
        fontWeight: "700",
    },
    viewAllText: {
        fontSize: 12,
        fontWeight: "700",
    },
    historyRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    historyText: {
        fontSize: 12,
        fontWeight: "600",
    },
});
