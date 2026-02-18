/**
 * StudyToggle
 *
 * "Go Live" widget — lets the user broadcast that they're studying
 * at a campus location and are open to company.
 *
 * Shows either:
 *  A) A compact "You're live" banner + End button when already active.
 *  B) A form to configure location, duration, vibe, then Go Live.
 */
import React, { useState } from "react";
import {
    View,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
} from "react-native";
import * as Haptics from "expo-haptics";

import { Text } from "@/components/ui/text";
import { useTheme } from "@/hooks/use-theme";
import { useGoLive, useEndSession } from "@/hooks/use-study-date";
import {
    VIBE_EMOJIS,
    VIBE_LABELS,
    DURATION_OPTIONS,
    CAMPUS_LOCATIONS,
    type StudyVibe,
    type MyStudySession,
    type StudySessionForm,
} from "@/types/study-date";

// ─── Active session banner ────────────────────────────────────────────────────

interface ActiveBannerProps {
    session: MyStudySession;
}

function ActiveBanner({ session }: ActiveBannerProps) {
    const { colors, isDark } = useTheme();
    const { mutate: endSession, isPending } = useEndSession();

    const until = new Date(session.availableUntil);
    const timeStr = until.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const handleEnd = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert("End session?", "You'll no longer appear in the nearby list.", [
            { text: "Cancel", style: "cancel" },
            {
                text: "End",
                style: "destructive",
                onPress: () => endSession(),
            },
        ]);
    };

    return (
        <View
            style={[
                activeStyles.banner,
                {
                    backgroundColor: isDark ? "rgba(16,185,129,0.12)" : "rgba(16,185,129,0.08)",
                    borderColor: "rgba(16,185,129,0.3)",
                },
            ]}
        >
            <View style={activeStyles.dot} />
            <View style={activeStyles.info}>
                <Text style={[activeStyles.location, { color: colors.foreground }]}>
                    📚 {session.locationName}
                </Text>
                <Text style={[activeStyles.until, { color: colors.mutedForeground }]}>
                    {session.vibe ? `${VIBE_EMOJIS[session.vibe]} ${VIBE_LABELS[session.vibe]} · ` : ""}
                    Until {timeStr}
                </Text>
            </View>
            <TouchableOpacity
                onPress={handleEnd}
                disabled={isPending}
                style={[activeStyles.endBtn, { borderColor: "rgba(239,68,68,0.4)" }]}
                activeOpacity={0.75}
            >
                {isPending ? (
                    <ActivityIndicator size="small" color="#ef4444" />
                ) : (
                    <Text style={activeStyles.endText}>End</Text>
                )}
            </TouchableOpacity>
        </View>
    );
}

const activeStyles = StyleSheet.create({
    banner: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#10b981",
    },
    info: { flex: 1, gap: 2 },
    location: { fontSize: 15, fontWeight: "600", lineHeight: 20 },
    until: { fontSize: 12, lineHeight: 16 },
    endBtn: {
        paddingHorizontal: 16,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 1,
    },
    endText: { fontSize: 13, fontWeight: "600", color: "#ef4444", lineHeight: 18 },
});

// ─── Go-live form ─────────────────────────────────────────────────────────────

interface StudyToggleProps {
    mySession: MyStudySession | null;
}

const VIBES: StudyVibe[] = ["chill_chat", "silent_focus", "group_study"];

export function StudyToggle({ mySession }: StudyToggleProps) {
    const { colors, isDark } = useTheme();
    const { mutate: goLive, isPending } = useGoLive();

    const [locationName, setLocationName] = useState("");
    const [durationMinutes, setDurationMinutes] = useState(60);
    const [vibe, setVibe] = useState<StudyVibe>("chill_chat");
    const [locationOpen, setLocationOpen] = useState(false);

    if (mySession) {
        return <ActiveBanner session={mySession} />;
    }

    const handleGoLive = () => {
        if (!locationName) {
            Alert.alert("Pick a location", "Where are you studying?");
            return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const availableUntil = new Date(Date.now() + durationMinutes * 60000).toISOString();
        const form: StudySessionForm = {
            locationName,
            availableUntil,
            subject: "",
            vibe,
            openToAnyone: true,
        };
        goLive(form);
    };

    const chipBg = (active: boolean) =>
        active
            ? { backgroundColor: colors.primary }
            : {
                  backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
              };

    return (
        <View
            style={[
                formStyles.card,
                {
                    backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#fff",
                    borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)",
                },
            ]}
        >
            <Text style={[formStyles.heading, { color: colors.foreground }]}>
                📚 Study Date Mode
            </Text>
            <Text style={[formStyles.sub, { color: colors.mutedForeground }]}>
                Let compatible people know you&apos;re here — they can ask to join.
            </Text>

            {/* Location picker */}
            <Text style={[formStyles.label, { color: colors.mutedForeground }]}>
                I&apos;m at
            </Text>
            <TouchableOpacity
                onPress={() => setLocationOpen(!locationOpen)}
                style={[
                    formStyles.selector,
                    {
                        backgroundColor: isDark
                            ? "rgba(255,255,255,0.06)"
                            : "rgba(0,0,0,0.04)",
                        borderColor: isDark
                            ? "rgba(255,255,255,0.1)"
                            : "rgba(0,0,0,0.08)",
                    },
                ]}
                activeOpacity={0.8}
            >
                <Text
                    style={[
                        formStyles.selectorText,
                        { color: locationName ? colors.foreground : colors.mutedForeground },
                    ]}
                >
                    {locationName || "Pick a location ▾"}
                </Text>
            </TouchableOpacity>

            {locationOpen && (
                <View
                    style={[
                        formStyles.dropdown,
                        {
                            backgroundColor: isDark ? "#1a1a2e" : "#fff",
                            borderColor: isDark
                                ? "rgba(255,255,255,0.1)"
                                : "rgba(0,0,0,0.08)",
                        },
                    ]}
                >
                    {CAMPUS_LOCATIONS.map((loc) => (
                        <TouchableOpacity
                            key={loc}
                            onPress={() => {
                                setLocationName(loc);
                                setLocationOpen(false);
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }}
                            style={[
                                formStyles.dropdownItem,
                                loc === locationName && {
                                    backgroundColor: isDark
                                        ? "rgba(236,72,153,0.15)"
                                        : "rgba(236,72,153,0.06)",
                                },
                            ]}
                            activeOpacity={0.8}
                        >
                            <Text
                                style={[
                                    formStyles.dropdownText,
                                    { color: loc === locationName ? colors.primary : colors.foreground },
                                ]}
                            >
                                {loc}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {/* Duration chips */}
            <Text style={[formStyles.label, { color: colors.mutedForeground }]}>Until</Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={formStyles.chips}
            >
                {DURATION_OPTIONS.map((opt) => {
                    const active = durationMinutes === opt.minutes;
                    return (
                        <TouchableOpacity
                            key={opt.minutes}
                            onPress={() => {
                                setDurationMinutes(opt.minutes);
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }}
                            style={[formStyles.chip, chipBg(active)]}
                            activeOpacity={0.8}
                        >
                            <Text
                                style={[formStyles.chipText, { color: active ? "#fff" : colors.foreground }]}
                            >
                                {opt.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* Vibe chips */}
            <Text style={[formStyles.label, { color: colors.mutedForeground }]}>Vibe</Text>
            <View style={formStyles.vibeRow}>
                {VIBES.map((v) => {
                    const active = vibe === v;
                    return (
                        <TouchableOpacity
                            key={v}
                            onPress={() => {
                                setVibe(v);
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }}
                            style={[formStyles.vibeChip, chipBg(active)]}
                            activeOpacity={0.8}
                        >
                            <Text style={formStyles.vibeEmoji}>{VIBE_EMOJIS[v]}</Text>
                            <Text
                                style={[
                                    formStyles.vibeLabel,
                                    { color: active ? "#fff" : colors.foreground },
                                ]}
                            >
                                {VIBE_LABELS[v]}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Go Live button */}
            <TouchableOpacity
                onPress={handleGoLive}
                disabled={isPending}
                style={[formStyles.goLiveBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.85}
            >
                {isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                ) : (
                    <Text style={formStyles.goLiveText}>Go Live 🚀</Text>
                )}
            </TouchableOpacity>
        </View>
    );
}

const formStyles = StyleSheet.create({
    card: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 20,
        gap: 0,
    },
    heading: { fontSize: 18, fontWeight: "700", lineHeight: 24, marginBottom: 4 },
    sub: { fontSize: 13, lineHeight: 18, marginBottom: 16 },
    label: { fontSize: 12, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8, marginTop: 4 },
    selector: {
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 11,
        marginBottom: 4,
    },
    selectorText: { fontSize: 14, fontWeight: "500", lineHeight: 20 },
    dropdown: {
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 4,
        overflow: "hidden",
    },
    dropdownItem: {
        paddingHorizontal: 16,
        paddingVertical: 11,
    },
    dropdownText: { fontSize: 14, fontWeight: "500", lineHeight: 20 },
    chips: { gap: 8, paddingBottom: 4 },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
    },
    chipText: { fontSize: 13, fontWeight: "600", lineHeight: 18 },
    vibeRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 4 },
    vibeChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
    },
    vibeEmoji: { fontSize: 14, lineHeight: 18 },
    vibeLabel: { fontSize: 13, fontWeight: "600", lineHeight: 18 },
    goLiveBtn: {
        borderRadius: 16,
        paddingVertical: 14,
        alignItems: "center",
        marginTop: 16,
    },
    goLiveText: { color: "#fff", fontSize: 16, fontWeight: "700", lineHeight: 22 },
});
