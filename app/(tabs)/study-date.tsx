/**
 * Study Date Mode — Tab Screen
 *
 * Shows:
 *  - The Go Live / active session toggle
 *  - List of nearby students currently studying
 *
 * Auto-refreshes every 60 seconds (handled by the query hook).
 */
import React, { useCallback } from "react";
import {
    View,
    ScrollView,
    StyleSheet,
    RefreshControl,
    TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "@/components/ui/text";
import { useTheme } from "@/hooks/use-theme";
import { useStudyDateFeed } from "@/hooks/use-study-date";
import { StudyToggle, NearbyStudents } from "@/components/study-date";

export default function StudyDateScreen() {
    const { colors } = useTheme();

    const { data, isLoading, isError, error, refetch, isRefetching } = useStudyDateFeed();

    const handleRetry = useCallback(() => {
        refetch();
    }, [refetch]);

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={["top"]}>
            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefetching}
                        onRefresh={refetch}
                        tintColor={colors.primary}
                        colors={[colors.primary]}
                    />
                }
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={[styles.headerTitle, { color: colors.foreground }]}>
                        Study Date
                    </Text>
                    <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
                        Find someone to study with on campus
                    </Text>
                </View>

                {/* Error */}
                {isError && !data && (
                    <View style={styles.errorBox}>
                        <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
                            {error instanceof Error ? error.message : "Couldn't load sessions."}
                        </Text>
                        <TouchableOpacity onPress={handleRetry} style={styles.retryBtn}>
                            <Text style={[styles.retryText, { color: colors.primary }]}>
                                Try again
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Go Live toggle */}
                <View style={styles.section}>
                    <StudyToggle mySession={data?.mySession ?? null} />
                </View>

                {/* Nearby students */}
                <View style={styles.section}>
                    <NearbyStudents
                        sessions={data?.sessions ?? []}
                        isLoading={isLoading}
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    content: {
        paddingHorizontal: 16,
        paddingBottom: 120,
        gap: 0,
    },
    header: {
        paddingTop: 8,
        paddingBottom: 20,
        gap: 2,
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: "800",
        lineHeight: 32,
    },
    headerSub: {
        fontSize: 13,
        fontWeight: "500",
        lineHeight: 18,
    },
    section: { marginBottom: 24 },
    errorBox: { alignItems: "center", paddingVertical: 16, gap: 8 },
    errorText: { fontSize: 14, lineHeight: 20 },
    retryBtn: { paddingHorizontal: 16, paddingVertical: 8 },
    retryText: { fontSize: 14, fontWeight: "600", lineHeight: 20 },
});
