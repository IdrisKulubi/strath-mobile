import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useTheme } from "@/hooks/use-theme";
import { Text } from "@/components/ui/text";
import { HypeRequest } from "@/components/profile/hype-request";

export default function HypeRequestScreen() {
    const router = useRouter();
    const { colors } = useTheme();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
            <View
                style={[
                    styles.header,
                    { backgroundColor: colors.background, borderBottomColor: colors.border },
                ]}
            >
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={[styles.headerButtonText, { color: colors.mutedForeground }]}>
                        Cancel
                    </Text>
                </TouchableOpacity>

                <Text style={[styles.headerTitle, { color: colors.foreground }]}>Hype Me</Text>

                <TouchableOpacity onPress={() => router.back()} style={styles.doneButton}>
                    <Text style={[styles.headerButtonText, { color: colors.primary, fontWeight: "600" }]}
                    >
                        Done
                    </Text>
                </TouchableOpacity>
            </View>

            <HypeRequest />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: "600",
    },
    headerButtonText: {
        fontSize: 14,
    },
    backButton: {
        paddingVertical: 6,
        paddingHorizontal: 6,
    },
    doneButton: {
        paddingVertical: 6,
        paddingHorizontal: 6,
    },
});
