import React, { useCallback, useMemo, forwardRef } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
} from "react-native";
import BottomSheet, {
    BottomSheetBackdrop,
    BottomSheetView,
} from "@gorhom/bottom-sheet";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/use-theme";
import { useBlockUser } from "@/hooks/use-block";
import * as Haptics from "expo-haptics";

interface BlockSheetProps {
    userId: string;
    userName: string;
    onBlock?: () => void;
    onReportInstead?: () => void;
    onClose?: () => void;
}

const BlockSheet = forwardRef<BottomSheet, BlockSheetProps>(
    ({ userId, userName, onBlock, onReportInstead, onClose }, ref) => {
        const { isDark } = useTheme();
        const { mutate: blockUser, isPending } = useBlockUser();

        const snapPoints = useMemo(() => ["55%"], []);

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

        const handleBlock = useCallback(() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            blockUser(userId, {
                onSuccess: () => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    onBlock?.();
                    onClose?.();
                },
                onError: () => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                },
            });
        }, [userId, blockUser, onBlock, onClose]);

        const handleReportInstead = useCallback(() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onReportInstead?.();
        }, [onReportInstead]);

        const blockEffects = [
            {
                icon: "eye-off",
                text: "You won't see each other again",
            },
            {
                icon: "chatbubble-ellipses-off",
                text: "They won't be able to message you",
            },
            {
                icon: "shield-checkmark",
                text: "We'll block any other accounts they create",
            },
        ];

        const Content = () => (
            <View style={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <Text
                        style={[
                            styles.title,
                            { color: isDark ? "#fff" : "#1a1a2e" },
                        ]}
                    >
                        Block {userName}?
                    </Text>
                </View>

                {/* Block Effects */}
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
                            <Text
                                style={[
                                    styles.effectText,
                                    { color: isDark ? "#e2e8f0" : "#374151" },
                                ]}
                            >
                                {effect.text}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Block Button */}
                <TouchableOpacity
                    style={styles.blockButton}
                    onPress={handleBlock}
                    disabled={isPending}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={["#ec4899", "#f43f5e"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.blockButtonGradient}
                    >
                        <Ionicons name="ban" size={20} color="#fff" />
                        <Text style={styles.blockButtonText}>
                            {isPending ? "Blocking..." : "Block"}
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>

                {/* Report Instead Link */}
                <TouchableOpacity
                    style={styles.reportLink}
                    onPress={handleReportInstead}
                    activeOpacity={0.7}
                >
                    <Text
                        style={[
                            styles.reportLinkText,
                            { color: isDark ? "#94a3b8" : "#6b7280" },
                        ]}
                    >
                        Report instead
                    </Text>
                </TouchableOpacity>
            </View>
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
                style={styles.bottomSheet}
            >
                <BottomSheetView style={styles.sheetContent}>
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
                    <Content />
                </BottomSheetView>
            </BottomSheet>
        );
    }
);

BlockSheet.displayName = "BlockSheet";

const styles = StyleSheet.create({
    bottomSheet: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 16,
    },
    sheetContent: {
        flex: 1,
        overflow: "hidden",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    content: {
        flex: 1,
        padding: 24,
        paddingTop: 8,
    },
    header: {
        alignItems: "center",
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: "700",
        textAlign: "center",
    },
    effectsContainer: {
        gap: 12,
        marginBottom: 32,
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
    blockButton: {
        borderRadius: 16,
        overflow: "hidden",
        shadowColor: "#ec4899",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    blockButtonGradient: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 16,
        paddingHorizontal: 24,
        gap: 10,
    },
    blockButtonText: {
        color: "#fff",
        fontSize: 17,
        fontWeight: "700",
    },
    reportLink: {
        alignItems: "center",
        marginTop: 20,
        padding: 12,
    },
    reportLinkText: {
        fontSize: 15,
        fontWeight: "600",
        textDecorationLine: "underline",
    },
});

export default BlockSheet;
