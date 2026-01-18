import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    BackHandler,
    Modal,
} from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    runOnJS,
    interpolate,
    Extrapolation,
} from "react-native-reanimated";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/use-theme";
import { useBlockUser } from "@/hooks/use-block";
import { useReportUser, REPORT_REASONS, ReportReason } from "@/hooks/use-report";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const DISMISS_THRESHOLD = 100;

interface BlockReportModalProps {
    visible: boolean;
    mode: "block" | "report";
    userId: string;
    userName: string;
    onClose: () => void;
    onSuccess: () => void;
    onSwitchMode: () => void;
}

export function BlockReportModal({
    visible,
    mode,
    userId,
    userName,
    onClose,
    onSuccess,
    onSwitchMode,
}: BlockReportModalProps) {
    const { isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const { mutate: blockUser, isPending: isBlocking } = useBlockUser();
    const { mutate: reportUser, isPending: isReporting } = useReportUser();

    const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
    const [details, setDetails] = useState("");
    const [reportStep, setReportStep] = useState<"reason" | "details">("reason");

    // Animation values
    const translateY = useSharedValue(SCREEN_HEIGHT);
    const backdropOpacity = useSharedValue(0);
    const context = useSharedValue({ y: 0 });

    // Spring config for smooth animations
    const springConfig = {
        damping: 25,
        stiffness: 300,
        mass: 0.8,
    };

    const resetReportState = useCallback(() => {
        setSelectedReason(null);
        setDetails("");
        setReportStep("reason");
    }, []);

    const handleCloseCallback = useCallback(() => {
        resetReportState();
        onClose();
    }, [resetReportState, onClose]);

    const closeSheet = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        translateY.value = withTiming(SCREEN_HEIGHT, { duration: 300 }, () => {
            runOnJS(handleCloseCallback)();
        });
        backdropOpacity.value = withTiming(0, { duration: 200 });
    }, [handleCloseCallback, translateY, backdropOpacity]);

    // Open/close animations
    useEffect(() => {
        if (visible) {
            translateY.value = withSpring(0, springConfig);
            backdropOpacity.value = withTiming(1, { duration: 300 });
        } else {
            translateY.value = withSpring(SCREEN_HEIGHT, springConfig);
            backdropOpacity.value = withTiming(0, { duration: 200 });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    // Handle Android back button
    useEffect(() => {
        const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
            if (visible) {
                closeSheet();
                return true;
            }
            return false;
        });
        return () => backHandler.remove();
    }, [visible, closeSheet]);

    // Pan gesture for drag to dismiss
    const panGesture = Gesture.Pan()
        .onStart(() => {
            context.value = { y: translateY.value };
        })
        .onUpdate((event) => {
            // Only allow dragging down
            translateY.value = Math.max(0, context.value.y + event.translationY);
        })
        .onEnd((event) => {
            if (event.translationY > DISMISS_THRESHOLD || event.velocityY > 500) {
                // Dismiss
                runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
                translateY.value = withTiming(SCREEN_HEIGHT, { duration: 300 }, () => {
                    runOnJS(handleCloseCallback)();
                });
                backdropOpacity.value = withTiming(0, { duration: 200 });
            } else {
                // Spring back
                translateY.value = withSpring(0, springConfig);
            }
        });

    // Animated styles
    const sheetStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: backdropOpacity.value,
    }));

    const handleIndicatorStyle = useAnimatedStyle(() => {
        const scale = interpolate(
            translateY.value,
            [0, 50],
            [1, 1.2],
            Extrapolation.CLAMP
        );
        return {
            transform: [{ scaleX: scale }],
        };
    });

    const handleBlock = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        blockUser(userId, {
            onSuccess: () => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                closeSheet();
                setTimeout(() => {
                    onSuccess();
                }, 400);
            },
            onError: (error) => {
                console.error("Block error:", error);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                closeSheet();
            },
        });
    };

    const handleSubmitReport = () => {
        if (!selectedReason) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        reportUser(
            {
                reportedUserId: userId,
                reason: selectedReason,
                details: details.trim() || undefined,
            },
            {
                onSuccess: () => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    resetReportState();
                    closeSheet();
                    setTimeout(() => {
                        onSuccess();
                    }, 400);
                },
                onError: (error) => {
                    console.error("Report error:", error);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                    closeSheet();
                },
            }
        );
    };

    const handleClose = () => {
        closeSheet();
    };

    const handleSwitchMode = () => {
        resetReportState();
        onSwitchMode();
    };

    const blockEffects = [
        { icon: "eye-off", text: "You won't see each other again" },
        { icon: "chatbubble-ellipses", text: "They won't be able to message you" },
        { icon: "shield-checkmark", text: "We'll block any other accounts they create" },
    ];

    const renderBlockContent = () => (
        <View style={styles.content}>
            <Text style={[styles.title, { color: isDark ? "#fff" : "#1a1a2e" }]}>
                Block {userName}?
            </Text>

            <View style={styles.effectsContainer}>
                {blockEffects.map((effect, index) => (
                    <View
                        key={index}
                        style={[
                            styles.effectRow,
                            {
                                backgroundColor: isDark
                                    ? "rgba(255, 255, 255, 0.08)"
                                    : "rgba(0, 0, 0, 0.04)",
                                borderColor: isDark
                                    ? "rgba(255, 255, 255, 0.1)"
                                    : "rgba(0, 0, 0, 0.08)",
                            },
                        ]}
                    >
                        <View
                            style={[
                                styles.iconCircle,
                                {
                                    backgroundColor: isDark
                                        ? "rgba(236, 72, 153, 0.2)"
                                        : "rgba(236, 72, 153, 0.1)",
                                },
                            ]}
                        >
                            <Ionicons
                                name={effect.icon as any}
                                size={20}
                                color={isDark ? "#f472b6" : "#ec4899"}
                            />
                        </View>
                        <Text style={[styles.effectText, { color: isDark ? "#e2e8f0" : "#374151" }]}>
                            {effect.text}
                        </Text>
                    </View>
                ))}
            </View>

            <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleBlock}
                disabled={isBlocking}
                activeOpacity={0.8}
            >
                <LinearGradient
                    colors={["#ec4899", "#f43f5e"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryButtonGradient}
                >
                    <Ionicons name="ban" size={20} color="#fff" />
                    <Text style={styles.primaryButtonText}>
                        {isBlocking ? "Blocking..." : "Block"}
                    </Text>
                </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryLink} onPress={handleSwitchMode}>
                <Text style={[styles.secondaryLinkText, { color: isDark ? "#94a3b8" : "#6b7280" }]}>
                    Report instead
                </Text>
            </TouchableOpacity>
        </View>
    );

    const renderReportReasonStep = () => (
        <View style={styles.content}>
            <View style={styles.stepHeader}>
                <View style={[styles.stepBadge, { backgroundColor: isDark ? "#ec4899" : "#f43f5e" }]}>
                    <Text style={styles.stepBadgeText}>1</Text>
                </View>
                <Text style={[styles.stepLabel, { color: isDark ? "#94a3b8" : "#6b7280" }]}>of 2</Text>
            </View>

            <Text style={[styles.title, { color: isDark ? "#fff" : "#1a1a2e" }]}>
                Report {userName}
            </Text>
            <Text style={[styles.subtitle, { color: isDark ? "#94a3b8" : "#6b7280" }]}>
                Why are you reporting this person?
            </Text>

            <ScrollView style={styles.reasonsScroll} showsVerticalScrollIndicator={false}>
                {REPORT_REASONS.map((reason) => (
                    <TouchableOpacity
                        key={reason.id}
                        style={[
                            styles.reasonRow,
                            {
                                backgroundColor: isDark
                                    ? selectedReason === reason.id
                                        ? "rgba(236, 72, 153, 0.15)"
                                        : "rgba(255, 255, 255, 0.06)"
                                    : selectedReason === reason.id
                                    ? "rgba(236, 72, 153, 0.1)"
                                    : "rgba(0, 0, 0, 0.03)",
                                borderColor:
                                    selectedReason === reason.id
                                        ? isDark ? "#ec4899" : "#f43f5e"
                                        : isDark
                                        ? "rgba(255, 255, 255, 0.1)"
                                        : "rgba(0, 0, 0, 0.08)",
                                borderWidth: selectedReason === reason.id ? 2 : 1,
                            },
                        ]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setSelectedReason(reason.id);
                        }}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.reasonIcon}>{reason.icon}</Text>
                        <Text
                            style={[
                                styles.reasonText,
                                {
                                    color: isDark ? "#e2e8f0" : "#374151",
                                    fontWeight: selectedReason === reason.id ? "600" : "500",
                                },
                            ]}
                        >
                            {reason.label}
                        </Text>
                        {selectedReason === reason.id && (
                            <Ionicons name="checkmark-circle" size={24} color={isDark ? "#ec4899" : "#f43f5e"} />
                        )}
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <TouchableOpacity
                style={[styles.primaryButton, { opacity: selectedReason ? 1 : 0.5 }]}
                onPress={() => {
                    if (selectedReason) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        setReportStep("details");
                    }
                }}
                disabled={!selectedReason}
                activeOpacity={0.8}
            >
                <LinearGradient
                    colors={["#ec4899", "#f43f5e"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryButtonGradient}
                >
                    <Text style={styles.primaryButtonText}>Continue</Text>
                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryLink} onPress={handleSwitchMode}>
                <Text style={[styles.secondaryLinkText, { color: isDark ? "#94a3b8" : "#6b7280" }]}>
                    Block instead
                </Text>
            </TouchableOpacity>
        </View>
    );

    const renderReportDetailsStep = () => (
        <View style={styles.content}>
            <View style={styles.stepHeader}>
                <TouchableOpacity
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setReportStep("reason");
                    }}
                    style={styles.backButton}
                >
                    <Ionicons name="arrow-back" size={24} color={isDark ? "#fff" : "#1a1a2e"} />
                </TouchableOpacity>
                <View style={[styles.stepBadge, { backgroundColor: isDark ? "#ec4899" : "#f43f5e" }]}>
                    <Text style={styles.stepBadgeText}>2</Text>
                </View>
                <Text style={[styles.stepLabel, { color: isDark ? "#94a3b8" : "#6b7280" }]}>of 2</Text>
            </View>

            <Text style={[styles.title, { color: isDark ? "#fff" : "#1a1a2e" }]}>
                Add details
            </Text>
            <Text style={[styles.subtitle, { color: isDark ? "#94a3b8" : "#6b7280" }]}>
                Help us understand what happened (optional)
            </Text>

            <View
                style={[
                    styles.selectedReasonBadge,
                    {
                        backgroundColor: isDark ? "rgba(236, 72, 153, 0.15)" : "rgba(236, 72, 153, 0.1)",
                        borderColor: isDark ? "rgba(236, 72, 153, 0.3)" : "rgba(236, 72, 153, 0.2)",
                    },
                ]}
            >
                <Text style={styles.selectedReasonIcon}>
                    {REPORT_REASONS.find((r) => r.id === selectedReason)?.icon}
                </Text>
                <Text style={[styles.selectedReasonText, { color: isDark ? "#f472b6" : "#ec4899" }]}>
                    {REPORT_REASONS.find((r) => r.id === selectedReason)?.label}
                </Text>
            </View>

            <TextInput
                style={[
                    styles.detailsInput,
                    {
                        backgroundColor: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.03)",
                        borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)",
                        color: isDark ? "#fff" : "#1a1a2e",
                    },
                ]}
                placeholder="Describe what happened..."
                placeholderTextColor={isDark ? "#64748b" : "#9ca3af"}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                value={details}
                onChangeText={setDetails}
                maxLength={500}
            />
            <Text style={[styles.charCount, { color: isDark ? "#64748b" : "#9ca3af" }]}>
                {details.length}/500
            </Text>

            <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleSubmitReport}
                disabled={isReporting}
                activeOpacity={0.8}
            >
                <LinearGradient
                    colors={["#ec4899", "#f43f5e"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryButtonGradient}
                >
                    <Ionicons name="flag" size={20} color="#fff" />
                    <Text style={styles.primaryButtonText}>
                        {isReporting ? "Submitting..." : "Submit Report"}
                    </Text>
                </LinearGradient>
            </TouchableOpacity>

            <Text style={[styles.disclaimer, { color: isDark ? "#64748b" : "#9ca3af" }]}>
                We take reports seriously and will review this within 24 hours.
            </Text>
        </View>
    );

    return (
        <Modal 
            visible={visible} 
            transparent 
            animationType="none"
            statusBarTranslucent
            onRequestClose={handleClose}
        >
            <GestureHandlerRootView style={{ flex: 1 }}>
                <View style={StyleSheet.absoluteFill}>
                    {/* Backdrop */}
                    <Animated.View style={[styles.backdrop, backdropStyle]}>
                        <TouchableOpacity
                            style={StyleSheet.absoluteFill}
                            activeOpacity={1}
                            onPress={handleClose}
                        >
                            {isDark && (
                                <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
                            )}
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Sheet */}
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        style={styles.keyboardView}
                        pointerEvents="box-none"
                    >
                        <GestureDetector gesture={panGesture}>
                            <Animated.View
                                style={[
                                    styles.sheet,
                                    sheetStyle,
                                    {
                                        backgroundColor: isDark ? "rgba(15, 23, 42, 0.98)" : "#ffffff",
                                        paddingBottom: insets.bottom + 20,
                                    },
                                ]}
                            >
                                {/* Drag Handle */}
                                <View style={styles.handleContainer}>
                                    <Animated.View
                                        style={[
                                            styles.handle,
                                            handleIndicatorStyle,
                                            { backgroundColor: isDark ? "#64748b" : "#cbd5e1" },
                                        ]}
                                    />
                                </View>

                                {/* Close button */}
                                <TouchableOpacity
                                    style={styles.closeButton}
                                    onPress={handleClose}
                                >
                                    <Ionicons name="close" size={24} color={isDark ? "#94a3b8" : "#6b7280"} />
                                </TouchableOpacity>

                                {/* Content */}
                                <ScrollView
                                    showsVerticalScrollIndicator={false}
                                    bounces={false}
                                    keyboardShouldPersistTaps="handled"
                                >
                                    {mode === "block" && renderBlockContent()}
                                    {mode === "report" && reportStep === "reason" && renderReportReasonStep()}
                                    {mode === "report" && reportStep === "details" && renderReportDetailsStep()}
                                </ScrollView>
                            </Animated.View>
                        </GestureDetector>
                    </KeyboardAvoidingView>
                </View>
            </GestureHandlerRootView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    keyboardView: {
        flex: 1,
        justifyContent: "flex-end",
    },
    sheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: SCREEN_HEIGHT * 0.85,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 16,
    },
    handleContainer: {
        alignItems: "center",
        paddingTop: 12,
        paddingBottom: 8,
    },
    handle: {
        width: 40,
        height: 5,
        borderRadius: 3,
    },
    closeButton: {
        position: "absolute",
        top: 16,
        right: 16,
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10,
    },
    content: {
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 20,
    },
    stepHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
        gap: 6,
    },
    stepBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    stepBadgeText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "700",
    },
    stepLabel: {
        fontSize: 14,
        fontWeight: "500",
    },
    backButton: {
        position: "absolute",
        left: 0,
        padding: 4,
    },
    title: {
        fontSize: 24,
        fontWeight: "700",
        textAlign: "center",
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        textAlign: "center",
        lineHeight: 20,
        marginBottom: 20,
    },
    effectsContainer: {
        gap: 12,
        marginBottom: 24,
    },
    effectRow: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 14,
    },
    effectText: {
        flex: 1,
        fontSize: 15,
        fontWeight: "500",
        lineHeight: 20,
    },
    reasonsScroll: {
        maxHeight: 280,
        marginBottom: 16,
    },
    reasonRow: {
        flexDirection: "row",
        alignItems: "center",
        padding: 14,
        borderRadius: 14,
        marginBottom: 10,
    },
    reasonIcon: {
        fontSize: 20,
        marginRight: 12,
    },
    reasonText: {
        flex: 1,
        fontSize: 15,
        lineHeight: 20,
    },
    selectedReasonBadge: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 20,
    },
    selectedReasonIcon: {
        fontSize: 16,
        marginRight: 8,
    },
    selectedReasonText: {
        fontSize: 14,
        fontWeight: "600",
    },
    detailsInput: {
        minHeight: 120,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        fontSize: 15,
        lineHeight: 22,
    },
    charCount: {
        textAlign: "right",
        fontSize: 12,
        marginTop: 8,
        marginBottom: 20,
    },
    primaryButton: {
        borderRadius: 16,
        overflow: "hidden",
        shadowColor: "#ec4899",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    primaryButtonGradient: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 16,
        paddingHorizontal: 24,
        gap: 10,
    },
    primaryButtonText: {
        color: "#fff",
        fontSize: 17,
        fontWeight: "700",
    },
    secondaryLink: {
        alignItems: "center",
        marginTop: 20,
        padding: 12,
    },
    secondaryLinkText: {
        fontSize: 15,
        fontWeight: "600",
        textDecorationLine: "underline",
    },
    disclaimer: {
        textAlign: "center",
        fontSize: 13,
        lineHeight: 18,
        marginTop: 16,
    },
});
