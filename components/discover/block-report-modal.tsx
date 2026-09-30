/* Reanimated shared values are intentionally mutated by gesture worklets. */
/* eslint-disable react-hooks/immutability */
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
import { RADIUS } from "@/lib/design-tokens";

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
    /** The dating shell supplies its safety endpoints while reusing this UI. */
    onBlockUser?: () => Promise<void>;
    onReportUser?: (reason: ReportReason, details?: string) => Promise<void>;
}

export function BlockReportModal({
    visible,
    mode,
    userId,
    userName,
    onClose,
    onSuccess,
    onSwitchMode,
    onBlockUser,
    onReportUser,
}: BlockReportModalProps) {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const { mutate: blockUser, isPending: legacyBlocking } = useBlockUser();
    const { mutate: reportUser, isPending: legacyReporting } = useReportUser();
    const [customPending, setCustomPending] = useState(false);
    const isBlocking = legacyBlocking || (mode === "block" && customPending);
    const isReporting = legacyReporting || (mode === "report" && customPending);

    const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
    const [details, setDetails] = useState("");
    const [reportStep, setReportStep] = useState<"reason" | "details">("reason");
    const [successState, setSuccessState] = useState<"blocked" | "reported" | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
        setSuccessState(null);
        setErrorMessage(null);
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
        setErrorMessage(null);
        if (onBlockUser) {
            setCustomPending(true);
            void onBlockUser().then(() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setSuccessState("blocked");
            }).catch((error) => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                setErrorMessage(error instanceof Error ? error.message : "Failed to block user");
            }).finally(() => setCustomPending(false));
            return;
        }
        blockUser(userId, {
            onSuccess: () => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setSuccessState("blocked");
            },
            onError: (error) => {
                console.error("Block error:", error);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                const message = error instanceof Error ? error.message : "Failed to block user";
                setErrorMessage(message);
            },
        });
    };

    const handleSubmitReport = () => {
        if (!selectedReason) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setErrorMessage(null);
        if (onReportUser) {
            setCustomPending(true);
            void onReportUser(selectedReason, details.trim() || undefined).then(() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setSuccessState("reported");
            }).catch((error) => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                setErrorMessage(error instanceof Error ? error.message : "Failed to submit report");
            }).finally(() => setCustomPending(false));
            return;
        }
        reportUser(
            {
                reportedUserId: userId,
                reason: selectedReason,
                details: details.trim() || undefined,
            },
            {
                onSuccess: () => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    setSuccessState("reported");
                },
                onError: (error) => {
                    console.error("Report error:", error);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                    const message = error instanceof Error ? error.message : "Failed to submit report";
                    setErrorMessage(message);
                },
            }
        );
    };

    const handleDone = () => {
        closeSheet();
        setTimeout(() => {
            onSuccess();
        }, 400);
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
        { icon: "shield-checkmark", text: "You can report the account if you also want us to review it" },
    ];

    const renderSuccessContent = () => (
        <View style={styles.content}>
            {/* Success Icon */}
            <View style={styles.successIconContainer}>
                <LinearGradient
                    colors={["#10b981", "#059669"]}
                    style={styles.successIconGradient}
                >
                    <Ionicons name="checkmark" size={48} color="#fff" />
                </LinearGradient>
            </View>

            {/* Success Title */}
            <Text style={[styles.successTitle, { color: colors.foreground }]}>
                {successState === "blocked" ? `You've blocked ${userName}` : `You've reported ${userName}`}
            </Text>

            {/* Success Message */}
            <Text style={[styles.successMessage, { color: colors.mutedForeground }]}>
                Thank you for helping keep the Strathspace community safe.
                {successState === "reported" 
                    ? " We'll review your report and take appropriate action within 24 hours."
                    : " You won't see each other anymore."}
            </Text>

            {/* What happens next */}
            <View style={[styles.infoBox, { backgroundColor: colors.control, borderColor: colors.controlBorder }]}>
                <Ionicons name="information-circle" size={20} color={colors.success} />
                <Text style={[styles.infoBoxText, { color: colors.foreground }]}>
                    {successState === "blocked" 
                        ? "This action can be undone from your settings."
                        : "You'll receive an update once we've reviewed this report."}
                </Text>
            </View>

            {/* Done Button */}
            <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleDone}
                activeOpacity={0.8}
            >
                <LinearGradient
                    colors={["#10b981", "#059669"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryButtonGradient}
                >
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.primaryButtonText}>Done</Text>
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );

    const renderBlockContent = () => (
        <View style={styles.content}>
            <Text style={[styles.title, { color: colors.foreground }]}>
                Block {userName}?
            </Text>

            <View style={styles.effectsContainer}>
                {blockEffects.map((effect, index) => (
                    <View
                        key={index}
                        style={[
                            styles.effectRow,
                            {
                                backgroundColor: colors.control,
                                borderColor: colors.controlBorder,
                            },
                        ]}
                    >
                        <View
                            style={[
                                styles.iconCircle,
                                {
                                    backgroundColor: colors.controlActive,
                                },
                            ]}
                        >
                            <Ionicons
                                name={effect.icon as any}
                                size={20}
                                color={colors.primaryText}
                            />
                        </View>
                        <Text style={[styles.effectText, { color: colors.foreground }]}>
                            {effect.text}
                        </Text>
                    </View>
                ))}
            </View>

            {errorMessage && (
                <View style={[styles.errorBanner, { backgroundColor: isDark ? "rgba(239, 68, 68, 0.15)" : "rgba(239, 68, 68, 0.1)" }]}>
                    <Ionicons name="alert-circle" size={20} color="#ef4444" />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                    <TouchableOpacity onPress={() => setErrorMessage(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="close" size={18} color={isDark ? "#94a3b8" : "#6b7280"} />
                    </TouchableOpacity>
                </View>
            )}

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
                <Text style={[styles.secondaryLinkText, { color: colors.primaryText }]}>
                    Report instead
                </Text>
            </TouchableOpacity>
        </View>
    );

    const renderReportReasonStep = () => (
        <View style={styles.content}>
            <View style={styles.stepHeader}>
                <View style={[styles.stepBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.stepBadgeText}>1</Text>
                </View>
                <Text style={[styles.stepLabel, { color: colors.mutedForeground }]}>of 2</Text>
            </View>

            <Text style={[styles.title, { color: colors.foreground }]}>
                Report {userName}
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                Why are you reporting this person?
            </Text>

            <ScrollView style={styles.reasonsScroll} showsVerticalScrollIndicator={false}>
                {REPORT_REASONS.map((reason) => (
                    <TouchableOpacity
                        key={reason.id}
                        style={[
                            styles.reasonRow,
                            {
                                backgroundColor: selectedReason === reason.id ? colors.controlActive : colors.control,
                                borderColor: selectedReason === reason.id ? colors.primary : colors.controlBorder,
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
                                    color: colors.foreground,
                                    fontWeight: selectedReason === reason.id ? "600" : "500",
                                },
                            ]}
                        >
                            {reason.label}
                        </Text>
                        {selectedReason === reason.id && (
                            <Ionicons name="checkmark-circle" size={24} color={colors.primaryText} />
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
                <Text style={[styles.secondaryLinkText, { color: colors.primaryText }]}>
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
                    <Ionicons name="arrow-back" size={24} color={colors.foreground} />
                </TouchableOpacity>
                <View style={[styles.stepBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.stepBadgeText}>2</Text>
                </View>
                <Text style={[styles.stepLabel, { color: colors.mutedForeground }]}>of 2</Text>
            </View>

            <Text style={[styles.title, { color: colors.foreground }]}>
                Add details
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                Help us understand what happened (optional)
            </Text>

            <View
                style={[
                    styles.selectedReasonBadge,
                    {
                        backgroundColor: colors.controlActive,
                        borderColor: colors.primary,
                    },
                ]}
            >
                <Text style={styles.selectedReasonIcon}>
                    {REPORT_REASONS.find((r) => r.id === selectedReason)?.icon}
                </Text>
                <Text style={[styles.selectedReasonText, { color: colors.primaryText }]}>
                    {REPORT_REASONS.find((r) => r.id === selectedReason)?.label}
                </Text>
            </View>

            <TextInput
                style={[
                    styles.detailsInput,
                    {
                        backgroundColor: colors.control,
                        borderColor: colors.controlBorder,
                        color: colors.foreground,
                    },
                ]}
                placeholder="Describe what happened..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                value={details}
                onChangeText={setDetails}
                maxLength={500}
            />
            <Text style={[styles.charCount, { color: colors.mutedForeground }]}>
                {details.length}/500
            </Text>

            {errorMessage && (
                <View style={[styles.errorBanner, { backgroundColor: isDark ? "rgba(239, 68, 68, 0.15)" : "rgba(239, 68, 68, 0.1)" }]}>
                    <Ionicons name="alert-circle" size={20} color="#ef4444" />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                    <TouchableOpacity onPress={() => setErrorMessage(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="close" size={18} color={isDark ? "#94a3b8" : "#6b7280"} />
                    </TouchableOpacity>
                </View>
            )}

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

            <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
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
                                        backgroundColor: colors.sheet,
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
                                            { backgroundColor: colors.controlBorder },
                                        ]}
                                    />
                                </View>

                                {/* Close button */}
                                <TouchableOpacity
                                    style={styles.closeButton}
                                    onPress={successState ? handleDone : handleClose}
                                >
                                    <Ionicons name="close" size={24} color={colors.mutedForeground} />
                                </TouchableOpacity>

                                {/* Content */}
                                <ScrollView
                                    showsVerticalScrollIndicator={false}
                                    bounces={false}
                                    keyboardShouldPersistTaps="handled"
                                >
                                    {successState ? renderSuccessContent() : (
                                        <>
                                            {mode === "block" && renderBlockContent()}
                                            {mode === "report" && reportStep === "reason" && renderReportReasonStep()}
                                            {mode === "report" && reportStep === "details" && renderReportDetailsStep()}
                                        </>
                                    )}
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
        ...StyleSheet.absoluteFill,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    keyboardView: {
        flex: 1,
        justifyContent: "flex-end",
    },
    sheet: {
        borderTopLeftRadius: RADIUS.sheet,
        borderTopRightRadius: RADIUS.sheet,
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
    // Success state styles
    successIconContainer: {
        alignItems: "center",
        marginBottom: 24,
        marginTop: 16,
    },
    successIconGradient: {
        width: 88,
        height: 88,
        borderRadius: 44,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#10b981",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 12,
    },
    successTitle: {
        fontSize: 22,
        fontWeight: "700",
        textAlign: "center",
        marginBottom: 12,
    },
    successMessage: {
        fontSize: 15,
        textAlign: "center",
        lineHeight: 22,
        marginBottom: 24,
        paddingHorizontal: 8,
    },
    infoBox: {
        flexDirection: "row",
        alignItems: "flex-start",
        padding: 16,
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 28,
        gap: 12,
    },
    infoBoxText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 20,
        fontWeight: "500",
    },
    errorBanner: {
        flexDirection: "row",
        alignItems: "center",
        padding: 14,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "rgba(239, 68, 68, 0.3)",
        gap: 10,
    },
    errorText: {
        flex: 1,
        fontSize: 14,
        fontWeight: "500",
        color: "#ef4444",
        lineHeight: 20,
    },
});
