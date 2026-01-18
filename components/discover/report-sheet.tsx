import React, { useCallback, useMemo, forwardRef, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    TextInput,
} from "react-native";
import BottomSheet, {
    BottomSheetBackdrop,
    BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/use-theme";
import { useReportUser, REPORT_REASONS, ReportReason } from "@/hooks/use-report";
import * as Haptics from "expo-haptics";

interface ReportSheetProps {
    userId: string;
    userName: string;
    onReport?: () => void;
    onBlockInstead?: () => void;
    onClose?: () => void;
}

const ReportSheet = forwardRef<BottomSheet, ReportSheetProps>(
    ({ userId, userName, onReport, onBlockInstead, onClose }, ref) => {
        const { isDark } = useTheme();
        const { mutate: reportUser, isPending } = useReportUser();

        const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
        const [details, setDetails] = useState("");
        const [step, setStep] = useState<"reason" | "details">("reason");

        const snapPoints = useMemo(() => ["75%", "90%"], []);

        const renderBackdrop = useCallback(
            (props: any) => (
                <BottomSheetBackdrop
                    {...props}
                    disappearsOnIndex={-1}
                    appearsOnIndex={0}
                    opacity={0.7}
                />
            ),
            []
        );

        const handleSelectReason = useCallback((reason: ReportReason) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setSelectedReason(reason);
        }, []);

        const handleContinue = useCallback(() => {
            if (selectedReason) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setStep("details");
            }
        }, [selectedReason]);

        const handleBack = useCallback(() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setStep("reason");
        }, []);

        const handleSubmitReport = useCallback(() => {
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
                        onReport?.();
                        onClose?.();
                        // Reset state
                        setSelectedReason(null);
                        setDetails("");
                        setStep("reason");
                    },
                    onError: () => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                    },
                }
            );
        }, [userId, selectedReason, details, reportUser, onReport, onClose]);

        const handleBlockInstead = useCallback(() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setSelectedReason(null);
            setDetails("");
            setStep("reason");
            onBlockInstead?.();
        }, [onBlockInstead]);

        const ReasonSelectionStep = () => (
            <>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerRow}>
                        <View style={styles.stepIndicator}>
                            <Text
                                style={[
                                    styles.stepNumber,
                                    { backgroundColor: isDark ? "#ec4899" : "#f43f5e" },
                                ]}
                            >
                                1
                            </Text>
                            <Text
                                style={[
                                    styles.stepLabel,
                                    { color: isDark ? "#94a3b8" : "#6b7280" },
                                ]}
                            >
                                of 2
                            </Text>
                        </View>
                    </View>
                    <Text
                        style={[
                            styles.title,
                            { color: isDark ? "#fff" : "#1a1a2e" },
                        ]}
                    >
                        Report {userName}
                    </Text>
                    <Text
                        style={[
                            styles.subtitle,
                            { color: isDark ? "#94a3b8" : "#6b7280" },
                        ]}
                    >
                        Why are you reporting this person?
                    </Text>
                </View>

                {/* Reasons List */}
                <View style={styles.reasonsContainer}>
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
                                            ? isDark
                                                ? "#ec4899"
                                                : "#f43f5e"
                                            : isDark
                                            ? "rgba(255, 255, 255, 0.1)"
                                            : "rgba(0, 0, 0, 0.08)",
                                    borderWidth: selectedReason === reason.id ? 2 : 1,
                                },
                            ]}
                            onPress={() => handleSelectReason(reason.id)}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.reasonIcon}>{reason.icon}</Text>
                            <Text
                                style={[
                                    styles.reasonText,
                                    {
                                        color: isDark ? "#e2e8f0" : "#374151",
                                        fontWeight:
                                            selectedReason === reason.id ? "600" : "500",
                                    },
                                ]}
                            >
                                {reason.label}
                            </Text>
                            {selectedReason === reason.id && (
                                <Ionicons
                                    name="checkmark-circle"
                                    size={24}
                                    color={isDark ? "#ec4899" : "#f43f5e"}
                                />
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Continue Button */}
                <View style={styles.buttonsContainer}>
                    <TouchableOpacity
                        style={[
                            styles.continueButton,
                            { opacity: selectedReason ? 1 : 0.5 },
                        ]}
                        onPress={handleContinue}
                        disabled={!selectedReason}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={["#ec4899", "#f43f5e"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.continueButtonGradient}
                        >
                            <Text style={styles.continueButtonText}>Continue</Text>
                            <Ionicons name="arrow-forward" size={20} color="#fff" />
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.blockLink}
                        onPress={handleBlockInstead}
                        activeOpacity={0.7}
                    >
                        <Text
                            style={[
                                styles.blockLinkText,
                                { color: isDark ? "#94a3b8" : "#6b7280" },
                            ]}
                        >
                            Block instead
                        </Text>
                    </TouchableOpacity>
                </View>
            </>
        );

        const DetailsStep = () => (
            <>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerRow}>
                        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                            <Ionicons
                                name="arrow-back"
                                size={24}
                                color={isDark ? "#fff" : "#1a1a2e"}
                            />
                        </TouchableOpacity>
                        <View style={styles.stepIndicator}>
                            <Text
                                style={[
                                    styles.stepNumber,
                                    { backgroundColor: isDark ? "#ec4899" : "#f43f5e" },
                                ]}
                            >
                                2
                            </Text>
                            <Text
                                style={[
                                    styles.stepLabel,
                                    { color: isDark ? "#94a3b8" : "#6b7280" },
                                ]}
                            >
                                of 2
                            </Text>
                        </View>
                    </View>
                    <Text
                        style={[
                            styles.title,
                            { color: isDark ? "#fff" : "#1a1a2e" },
                        ]}
                    >
                        Add details
                    </Text>
                    <Text
                        style={[
                            styles.subtitle,
                            { color: isDark ? "#94a3b8" : "#6b7280" },
                        ]}
                    >
                        Help us understand what happened (optional)
                    </Text>
                </View>

                {/* Selected Reason Display */}
                <View
                    style={[
                        styles.selectedReasonBadge,
                        {
                            backgroundColor: isDark
                                ? "rgba(236, 72, 153, 0.15)"
                                : "rgba(236, 72, 153, 0.1)",
                            borderColor: isDark
                                ? "rgba(236, 72, 153, 0.3)"
                                : "rgba(236, 72, 153, 0.2)",
                        },
                    ]}
                >
                    <Text style={styles.selectedReasonIcon}>
                        {REPORT_REASONS.find((r) => r.id === selectedReason)?.icon}
                    </Text>
                    <Text
                        style={[
                            styles.selectedReasonText,
                            { color: isDark ? "#f472b6" : "#ec4899" },
                        ]}
                    >
                        {REPORT_REASONS.find((r) => r.id === selectedReason)?.label}
                    </Text>
                </View>

                {/* Details Input */}
                <View style={styles.detailsContainer}>
                    <TextInput
                        style={[
                            styles.detailsInput,
                            {
                                backgroundColor: isDark
                                    ? "rgba(255, 255, 255, 0.06)"
                                    : "rgba(0, 0, 0, 0.03)",
                                borderColor: isDark
                                    ? "rgba(255, 255, 255, 0.1)"
                                    : "rgba(0, 0, 0, 0.08)",
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
                    <Text
                        style={[
                            styles.charCount,
                            { color: isDark ? "#64748b" : "#9ca3af" },
                        ]}
                    >
                        {details.length}/500
                    </Text>
                </View>

                {/* Submit Button */}
                <View style={styles.buttonsContainer}>
                    <TouchableOpacity
                        style={styles.submitButton}
                        onPress={handleSubmitReport}
                        disabled={isPending}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={["#ec4899", "#f43f5e"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.submitButtonGradient}
                        >
                            <Ionicons name="flag" size={20} color="#fff" />
                            <Text style={styles.submitButtonText}>
                                {isPending ? "Submitting..." : "Submit Report"}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <Text
                        style={[
                            styles.disclaimer,
                            { color: isDark ? "#64748b" : "#9ca3af" },
                        ]}
                    >
                        We take reports seriously and will review this within 24 hours.
                    </Text>
                </View>
            </>
        );

        return (
            <BottomSheet
                ref={ref}
                index={-1}
                snapPoints={snapPoints}
                enablePanDownToClose
                backdropComponent={renderBackdrop}
                handleIndicatorStyle={{
                    backgroundColor: isDark ? "#64748b" : "#cbd5e1",
                    width: 40,
                }}
                backgroundStyle={{
                    backgroundColor: "transparent",
                }}
                keyboardBehavior="interactive"
                keyboardBlurBehavior="restore"
                android_keyboardInputMode="adjustResize"
                style={styles.bottomSheet}
            >
                <BottomSheetScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {isDark ? (
                        <BlurView
                            intensity={80}
                            tint="dark"
                            style={StyleSheet.absoluteFill}
                        >
                            <View
                                style={[
                                    StyleSheet.absoluteFill,
                                    { backgroundColor: "rgba(15, 23, 42, 0.85)" },
                                ]}
                            />
                        </BlurView>
                    ) : (
                        <View
                            style={[
                                StyleSheet.absoluteFill,
                                { backgroundColor: "#ffffff" },
                            ]}
                        />
                    )}
                    <View style={styles.content}>
                        {step === "reason" ? <ReasonSelectionStep /> : <DetailsStep />}
                    </View>
                </BottomSheetScrollView>
            </BottomSheet>
        );
    }
);

ReportSheet.displayName = "ReportSheet";

const styles = StyleSheet.create({
    bottomSheet: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 16,
    },
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        flex: 1,
        padding: 24,
        paddingTop: 8,
    },
    header: {
        marginBottom: 20,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
        position: "relative",
    },
    backButton: {
        position: "absolute",
        left: 0,
        padding: 4,
    },
    stepIndicator: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    stepNumber: {
        width: 24,
        height: 24,
        borderRadius: 12,
        color: "#fff",
        fontSize: 14,
        fontWeight: "700",
        textAlign: "center",
        lineHeight: 24,
        overflow: "hidden",
    },
    stepLabel: {
        fontSize: 14,
        fontWeight: "500",
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
    },
    reasonsContainer: {
        gap: 10,
        marginBottom: 24,
    },
    reasonRow: {
        flexDirection: "row",
        alignItems: "center",
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
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
    detailsContainer: {
        marginBottom: 24,
    },
    detailsInput: {
        minHeight: 140,
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
    },
    buttonsContainer: {
        marginTop: "auto",
        paddingTop: 16,
    },
    continueButton: {
        borderRadius: 16,
        overflow: "hidden",
        shadowColor: "#ec4899",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    continueButtonGradient: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 16,
        paddingHorizontal: 24,
        gap: 10,
    },
    continueButtonText: {
        color: "#fff",
        fontSize: 17,
        fontWeight: "700",
    },
    submitButton: {
        borderRadius: 16,
        overflow: "hidden",
        shadowColor: "#ec4899",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    submitButtonGradient: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 16,
        paddingHorizontal: 24,
        gap: 10,
    },
    submitButtonText: {
        color: "#fff",
        fontSize: 17,
        fontWeight: "700",
    },
    blockLink: {
        alignItems: "center",
        marginTop: 20,
        padding: 12,
    },
    blockLinkText: {
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

export default ReportSheet;
