import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeOutUp, SlideInDown } from "react-native-reanimated";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/hooks/use-theme";
import { Sparkle, X } from "phosphor-react-native";

interface DropNotificationProps {
    visible: boolean;
    onOpen: () => void;
    onDismiss: () => void;
}

export function DropNotification({ visible, onOpen, onDismiss }: DropNotificationProps) {
    const { colors, isDark } = useTheme();

    if (!visible) return null;

    return (
        <Animated.View
            entering={SlideInDown.springify().damping(20)}
            exiting={FadeOutUp.duration(180)}
            style={[
                styles.container,
                {
                    backgroundColor: isDark ? "rgba(233, 30, 140, 0.14)" : "rgba(233, 30, 140, 0.08)",
                    borderColor: isDark ? "rgba(233, 30, 140, 0.25)" : "rgba(233, 30, 140, 0.2)",
                },
            ]}
        >
            <Pressable onPress={onOpen} style={styles.leftRow} hitSlop={6}>
                <Sparkle size={16} color={colors.primary} weight="fill" />
                <Text style={[styles.message, { color: colors.foreground }]}>Your weekly matches are here! 🎯</Text>
            </Pressable>

            <View style={styles.actions}>
                <Pressable onPress={onOpen} style={[styles.openButton, { backgroundColor: colors.primary }]}> 
                    <Text style={[styles.openText, { color: colors.primaryForeground }]}>View</Text>
                </Pressable>
                <Pressable onPress={onDismiss} style={styles.dismissButton}>
                    <X size={16} color={colors.mutedForeground} weight="bold" />
                </Pressable>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16,
        marginBottom: 10,
        borderRadius: 14,
        borderWidth: 1,
        paddingVertical: 10,
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
    },
    leftRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        flex: 1,
    },
    message: {
        fontSize: 13,
        fontWeight: "700",
    },
    actions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    openButton: {
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    openText: {
        fontSize: 12,
        fontWeight: "700",
    },
    dismissButton: {
        padding: 4,
    },
});
