import React from "react";
import { View, ScrollView, StyleSheet, Pressable, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/hooks/use-theme";

const PREVIEWS = [
    {
        route: "/ui-preview/missions",
        label: "🎯 Mission Card",
        description: "All 6 mission states + interactive simulator",
    },
];

export default function UIPreviewIndex() {
    const { colors, colorScheme } = useTheme();
    const router = useRouter();

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={["top"]}>
            <StatusBar barStyle={colorScheme === "dark" ? "light-content" : "dark-content"} />
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <Text style={[styles.title, { color: colors.foreground }]}>UI Preview</Text>
                <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Component sandbox</Text>
            </View>
            <ScrollView contentContainerStyle={styles.list}>
                {PREVIEWS.map((p) => (
                    <Pressable
                        key={p.route}
                        onPress={() => router.push(p.route as any)}
                        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                    >
                        <Text style={[styles.cardLabel, { color: colors.foreground }]}>{p.label}</Text>
                        <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>{p.description}</Text>
                    </Pressable>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },
    header: { padding: 20, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
    title: { fontSize: 22, fontWeight: "800" },
    subtitle: { fontSize: 13, marginTop: 2 },
    list: { padding: 16, gap: 12 },
    card: {
        padding: 16,
        borderRadius: 16,
        borderWidth: StyleSheet.hairlineWidth,
    },
    cardLabel: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
    cardDesc: { fontSize: 13 },
});
