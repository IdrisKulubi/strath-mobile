import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Dimensions, Image, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/hooks/use-theme";
import { WeeklyDropCurrent, WeeklyDropHistoryItem, WeeklyDropMatch } from "@/hooks/use-weekly-drop";
import { ArrowClockwise, Sparkle } from "phosphor-react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.55;

function WeeklyDropMatchSheet({
    match,
    onClose,
    onConnect,
    onConnected,
    connectDisabled,
}: {
    match: WeeklyDropMatch | null;
    onClose: () => void;
    onConnect?: (match: WeeklyDropMatch) => Promise<{ matched: boolean; matchId: string | null }>;
    onConnected?: (result: { matched: boolean; matchId: string | null }, match: WeeklyDropMatch) => void;
    connectDisabled?: boolean;
}) {
    const { colors } = useTheme();
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [connectState, setConnectState] = useState<"idle" | "connecting" | "sent">("idle");
    const translateY = useSharedValue(SCREEN_HEIGHT);
    const dragStartY = useSharedValue(0);
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isClosingRef = useRef(false);

    useEffect(() => {
        if (!match) return;
        isClosingRef.current = false;
        if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
        setConnectState("idle");
        setActiveImageIndex(0);
        translateY.value = SCREEN_HEIGHT;
        translateY.value = withSpring(0, { damping: 26, stiffness: 320, mass: 0.8 });
    }, [match?.userId, match, translateY]);

    useEffect(() => {
        return () => {
            if (closeTimerRef.current) {
                clearTimeout(closeTimerRef.current);
                closeTimerRef.current = null;
            }
        };
    }, []);

    const closeSheet = () => {
        if (isClosingRef.current) return;
        isClosingRef.current = true;

        // Always schedule a JS-side fallback close so the transparent backdrop
        // never gets stuck intercepting touches if the animation is interrupted.
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        closeTimerRef.current = setTimeout(() => {
            onClose();
        }, 240);

        translateY.value = withTiming(SCREEN_HEIGHT, { duration: 180 }, () => {
            runOnJS(onClose)();
        });
    };

    const panGesture = Gesture.Pan()
        .onBegin(() => {
            dragStartY.value = translateY.value;
        })
        .onUpdate((event) => {
            const next = dragStartY.value + event.translationY;
            translateY.value = Math.max(0, next);
        })
        .onEnd((event) => {
            const shouldClose = translateY.value > 140 || event.velocityY > 1200;
            if (shouldClose) {
                runOnJS(closeSheet)();
                return;
            }
            translateY.value = withSpring(0, { damping: 26, stiffness: 320, mass: 0.8 });
        });

    const sheetStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateY: translateY.value }],
        };
    });

    if (!match) return null;

    const images = [match.profile?.profilePhoto, ...(match.profile?.photos || [])]
        .filter((uri): uri is string => Boolean(uri && uri.trim().length > 0));

    const uniqueImages = Array.from(new Set(images));

    const photo = uniqueImages[0] || null;
    const name = match.profile?.firstName || "Match";
    const metaParts = [
        match.profile?.age ? String(match.profile.age) : null,
        match.profile?.course || null,
        match.profile?.yearOfStudy ? `Year ${match.profile.yearOfStudy}` : null,
    ].filter(Boolean);

    const canConnect = Boolean(onConnect);
    const isAlreadySent = Boolean(connectDisabled);

    const handleConnect = async () => {
        if (!onConnect || connectState !== "idle" || isAlreadySent) return;

        try {
            setConnectState("connecting");
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const result = await onConnect(match);
            onConnected?.(result, match);

            if (result.matched) {
                closeSheet();
                return;
            }

            // Not an instant match: briefly show "Sent" then dismiss
            setConnectState("sent");
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setTimeout(() => {
                closeSheet();
            }, 450);
        } catch (err) {
            setConnectState("idle");
            throw err;
        }
    };

    return (
        <Modal transparent visible onRequestClose={closeSheet} animationType="fade">
            <GestureHandlerRootView style={styles.sheetRoot}>
                <Pressable style={styles.sheetBackdrop} onPress={closeSheet} />

                <GestureDetector gesture={panGesture}>
                    <Animated.View
                        style={[
                            styles.sheet,
                            sheetStyle,
                            {
                                backgroundColor: colors.card,
                                borderColor: colors.border,
                            },
                        ]}
                    >
                        <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.sheetScrollContent}
                        >
                            {photo && (
                                <View style={styles.carouselWrap}>
                                    <ScrollView
                                        horizontal
                                        pagingEnabled
                                        showsHorizontalScrollIndicator={false}
                                        onScroll={(e) => {
                                            const x = e.nativeEvent.contentOffset.x;
                                            const w = e.nativeEvent.layoutMeasurement.width;
                                            if (w <= 0) return;
                                            const idx = Math.round(x / w);
                                            if (idx !== activeImageIndex) setActiveImageIndex(idx);
                                        }}
                                        scrollEventThrottle={16}
                                    >
                                        {uniqueImages.slice(0, 6).map((uri) => (
                                            <View key={uri} style={styles.carouselPage}>
                                                <Image source={{ uri }} style={styles.carouselImage} />
                                            </View>
                                        ))}
                                    </ScrollView>

                                    {uniqueImages.length > 1 && (
                                        <View style={styles.dotsRow}>
                                            {uniqueImages.slice(0, 6).map((_, idx) => (
                                                <View
                                                    key={`dot-${idx}`}
                                                    style={[
                                                        styles.dot,
                                                        {
                                                            backgroundColor: idx === activeImageIndex ? colors.primary : colors.border,
                                                        },
                                                    ]}
                                                />
                                            ))}
                                        </View>
                                    )}
                                </View>
                            )}

                            <View style={styles.sheetHeader}>
                                <View style={styles.sheetHeaderLeft}>
                                    <View style={styles.sheetHeaderText}>
                                        <Text style={[styles.sheetName, { color: colors.foreground }]} numberOfLines={1}>
                                            {name}
                                        </Text>
                                        {metaParts.length > 0 && (
                                            <Text style={[styles.sheetMeta, { color: colors.mutedForeground }]} numberOfLines={2}>
                                                {metaParts.join(" · ")}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                                <View style={[styles.sheetScorePill, { backgroundColor: colors.primary + "22" }]}>
                                    <Text style={[styles.sheetScoreText, { color: colors.primary }]}>{match.score}%</Text>
                                </View>
                            </View>

                            {match.reasons?.length > 0 && (
                                <View style={styles.sheetSection}>
                                    <Text style={[styles.sheetSectionTitle, { color: colors.foreground }]}>Why this match</Text>
                                    {match.reasons.slice(0, 3).map((reason, idx) => (
                                        <Text key={`${match.userId}-reason-${idx}`} style={[styles.sheetBullet, { color: colors.mutedForeground }]} numberOfLines={3}>
                                            • {reason}
                                        </Text>
                                    ))}
                                </View>
                            )}

                            {match.starters?.length > 0 && (
                                <View style={styles.sheetSection}>
                                    <Text style={[styles.sheetSectionTitle, { color: colors.foreground }]}>Conversation starters</Text>
                                    {match.starters.slice(0, 3).map((starter, idx) => (
                                        <Text key={`${match.userId}-starter-${idx}`} style={[styles.sheetBullet, { color: colors.mutedForeground }]} numberOfLines={4}>
                                            • {starter}
                                        </Text>
                                    ))}
                                </View>
                            )}
                        </ScrollView>

                        {canConnect && (
                            <Pressable
                                onPress={handleConnect}
                                disabled={connectState !== "idle" || isAlreadySent}
                                style={[
                                    styles.connectButton,
                                    {
                                        backgroundColor: colors.primary,
                                        opacity: connectState === "connecting" || isAlreadySent ? 0.75 : 1,
                                    },
                                ]}
                            >
                                {isAlreadySent ? (
                                    <Text style={[styles.connectText, { color: colors.primaryForeground }]}>Connection sent</Text>
                                ) : connectState === "connecting" ? (
                                    <ActivityIndicator color={colors.primaryForeground} />
                                ) : connectState === "sent" ? (
                                    <Text style={[styles.connectText, { color: colors.primaryForeground }]}>Sent</Text>
                                ) : (
                                    <Text style={[styles.connectText, { color: colors.primaryForeground }]}>Connect</Text>
                                )}
                            </Pressable>
                        )}

                        {canConnect && isAlreadySent && (
                            <Text style={[styles.sentHint, { color: colors.mutedForeground }]}>You already sent a connection to this person.</Text>
                        )}
                    </Animated.View>
                </GestureDetector>
            </GestureHandlerRootView>
        </Modal>
    );
}

interface WeeklyDropProps {
    currentDrop: WeeklyDropCurrent | null;
    history: WeeklyDropHistoryItem[];
    isLoading?: boolean;
    showCurrent?: boolean;
    onRefresh?: () => void;
    onTalkToAgent?: () => void;
    onMatchPress?: (match: WeeklyDropMatch) => void;
    onConnect?: (match: WeeklyDropMatch) => Promise<{ matched: boolean; matchId: string | null }>;
    onConnected?: (result: { matched: boolean; matchId: string | null }, match: WeeklyDropMatch) => void;
    disabledConnectUserIds?: string[];
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
    onConnect,
    onConnected,
    disabledConnectUserIds,
    onViewHistory,
}: WeeklyDropProps) {
    const { colors, isDark } = useTheme();
    const [secondsLeft, setSecondsLeft] = useState<number>(currentDrop?.remainingSeconds || 0);
    const [showAllMatches, setShowAllMatches] = useState(false);
    const [sheetMatch, setSheetMatch] = useState<WeeklyDropMatch | null>(null);

    useEffect(() => {
        setSecondsLeft(currentDrop?.remainingSeconds || 0);
    }, [currentDrop?.remainingSeconds]);

    useEffect(() => {
        // Reset expanded state when the drop changes
        setShowAllMatches(false);
        setSheetMatch(null);
    }, [currentDrop?.id]);

    useEffect(() => {
        if (!currentDrop) return;
        const interval = setInterval(() => {
            setSecondsLeft((prev) => Math.max(0, prev - 1));
        }, 1000);

        return () => clearInterval(interval);
    }, [currentDrop]);

    const topThree = useMemo(() => currentDrop?.matches.slice(0, 3) || [], [currentDrop]);
    const remainingMatches = useMemo(() => currentDrop?.matches.slice(3) || [], [currentDrop]);

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
                                    onPress={() => {
                                        if (onMatchPress) {
                                            onMatchPress(match);
                                            return;
                                        }
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setSheetMatch(match);
                                    }}
                                    style={[
                                        styles.matchCard,
                                        {
                                            backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                                            borderColor: colors.border,
                                        },
                                    ]}
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

                                    {!onMatchPress && (
                                        <Text style={[styles.tapHint, { color: colors.mutedForeground }]}>Tap for details</Text>
                                    )}
                                </Pressable>
                            );
                        })}
                    </View>

                    {currentDrop.matchCount > 3 && (
                        <Pressable
                            onPress={() => setShowAllMatches((prev) => !prev)}
                            hitSlop={6}
                            style={styles.morePressable}
                        >
                            <Text style={[styles.more, { color: showAllMatches ? colors.primary : colors.mutedForeground }]}>
                                {showAllMatches ? "Hide extra matches" : `+ ${currentDrop.matchCount - 3} more matches`}
                            </Text>
                        </Pressable>
                    )}

                    {showAllMatches && remainingMatches.length > 0 && (
                        <View style={styles.extraMatchesWrap}>
                            <Text style={[styles.extraLabel, { color: colors.mutedForeground }]}>More in this drop</Text>
                            <View style={styles.extraMatchesRow}>
                                {remainingMatches.map((match) => {
                                    const image = getProfileImage(match);

                                    return (
                                        <Pressable
                                            key={match.userId}
                                            onPress={() => {
                                                if (onMatchPress) {
                                                    onMatchPress(match);
                                                    return;
                                                }
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                setSheetMatch(match);
                                            }}
                                            style={[
                                                styles.matchCard,
                                                styles.extraMatchCard,
                                                {
                                                    backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                                                    borderColor: colors.border,
                                                },
                                            ]}
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

                                            {!onMatchPress && (
                                                <Text style={[styles.tapHint, { color: colors.mutedForeground }]}>Tap for details</Text>
                                            )}
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>
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

            {!onMatchPress && (
                <WeeklyDropMatchSheet
                    match={sheetMatch}
                    onClose={() => setSheetMatch(null)}
                    onConnect={onConnect}
                    onConnected={onConnected}
                    connectDisabled={Boolean(sheetMatch?.userId && disabledConnectUserIds?.includes(sheetMatch.userId))}
                />
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
    sheetRoot: {
        flex: 1,
        justifyContent: "flex-end",
    },
    sheetBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.55)",
    },
    sheet: {
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingTop: 10,
        paddingBottom: 18,
        gap: 12,
        height: SHEET_HEIGHT,
    },
    sheetScrollContent: {
        paddingBottom: 78,
        gap: 12,
    },
    sheetHandle: {
        width: 44,
        height: 5,
        borderRadius: 999,
        alignSelf: "center",
        marginBottom: 2,
        opacity: 0.9,
    },
    sheetHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
    },
    sheetHeaderLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        flex: 1,
    },
    sheetHeaderText: {
        flex: 1,
        gap: 2,
    },
    sheetName: {
        fontSize: 16,
        fontWeight: "900",
        lineHeight: 20,
        paddingTop: 1,
    },
    sheetMeta: {
        fontSize: 12,
        fontWeight: "600",
        lineHeight: 16,
    },
    sheetScorePill: {
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 7,
        alignItems: "center",
        justifyContent: "center",
    },
    sheetScoreText: {
        fontSize: 12,
        fontWeight: "900",
    },
    sheetSection: {
        gap: 5,
    },
    sheetSectionTitle: {
        fontSize: 12,
        fontWeight: "900",
    },
    sheetBullet: {
        fontSize: 12,
        fontWeight: "600",
        lineHeight: 16,
    },
    carouselWrap: {
        borderRadius: 16,
        overflow: "hidden",
        borderWidth: 1,
    },
    carouselPage: {
        width: Dimensions.get("window").width - 28,
        height: 190,
        backgroundColor: "transparent",
    },
    carouselImage: {
        width: "100%",
        height: "100%",
        resizeMode: "cover",
    },
    dotsRow: {
        position: "absolute",
        bottom: 10,
        left: 0,
        right: 0,
        flexDirection: "row",
        justifyContent: "center",
        gap: 6,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        opacity: 0.95,
    },
    connectButton: {
        borderRadius: 14,
        paddingVertical: 13,
        alignItems: "center",
        justifyContent: "center",
    },
    connectText: {
        fontSize: 14,
        fontWeight: "900",
    },
    sentHint: {
        marginTop: -6,
        fontSize: 12,
        fontWeight: "600",
        textAlign: "center",
    },
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
        lineHeight: 20,
        paddingTop: 1,
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
    tapHint: {
        marginTop: 2,
        fontSize: 10,
        fontWeight: "700",
    },
    more: {
        fontSize: 12,
        fontWeight: "600",
    },
    morePressable: {
        alignSelf: "flex-start",
    },
    extraMatchesWrap: {
        gap: 8,
    },
    extraLabel: {
        fontSize: 12,
        fontWeight: "700",
    },
    extraMatchesRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    extraMatchCard: {
        flexGrow: 0,
        flexShrink: 0,
        flexBasis: 110,
        width: 110,
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
