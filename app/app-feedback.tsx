import React, { useCallback, useMemo, useState } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    Pressable,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Switch,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { useToast } from '@/components/ui/toast';
import {
    APP_FEEDBACK_CATEGORIES,
    AppFeedbackCategory,
    useSubmitAppFeedback,
} from '@/hooks/use-app-feedback';
import { markFeedbackSubmitted } from '@/lib/app-feedback-storage';

const MAX_LENGTH = 1000;
const MIN_LENGTH = 3;

export default function AppFeedbackScreen() {
    const router = useRouter();
    const { colors, colorScheme } = useTheme();
    const isDark = colorScheme === 'dark';
    const { show: showToast } = useToast();

    const [category, setCategory] = useState<AppFeedbackCategory>('feature_request');
    const [message, setMessage] = useState('');
    const [anonymous, setAnonymous] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const { mutateAsync: submit, isPending } = useSubmitAppFeedback();

    const trimmedLength = message.trim().length;
    const canSubmit = trimmedLength >= MIN_LENGTH && !isPending;

    const handleSelectCategory = useCallback((id: AppFeedbackCategory) => {
        Haptics.selectionAsync();
        setCategory(id);
    }, []);

    const handleSubmit = useCallback(async () => {
        if (!canSubmit) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            await submit({
                category,
                message: message.trim(),
                anonymous,
            });
            await markFeedbackSubmitted();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setSubmitted(true);
        } catch (error) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            showToast({
                message: error instanceof Error ? error.message : 'Failed to send feedback',
                variant: 'danger',
                position: 'top',
            });
        }
    }, [canSubmit, category, message, anonymous, submit, showToast]);

    const handleDone = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.back();
    }, [router]);

    const counterColor = useMemo(() => {
        if (trimmedLength > MAX_LENGTH - 50) return colors.destructive;
        return colors.mutedForeground;
    }, [trimmedLength, colors]);

    if (submitted) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
                <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
                <Animated.View entering={FadeInDown.springify().damping(14)} style={styles.thankYouContent}>
                    <View style={[styles.thankYouIcon, { backgroundColor: 'rgba(233,30,140,0.12)' }]}>
                        <Ionicons name="mail-open-outline" size={52} color={colors.primary} />
                    </View>
                    <Text style={[styles.thankYouTitle, { color: colors.foreground }]}>
                        Got it — we read every word 💌
                    </Text>
                    <Text style={[styles.thankYouSub, { color: colors.mutedForeground }]}>
                        Your feedback helps shape where StrathSpace goes next. Thank you for taking the time.
                    </Text>
                    <Pressable
                        onPress={handleDone}
                        style={[styles.doneBtn, { backgroundColor: colors.primary }]}
                    >
                        <Text style={styles.doneBtnText}>Back to App</Text>
                    </Pressable>
                </Animated.View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={26} color={colors.foreground} />
                    </Pressable>
                </View>

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <Animated.View entering={FadeInDown.delay(40).springify().damping(14)} style={styles.titleBlock}>
                        <Text style={[styles.title, { color: colors.foreground }]}>
                            Send us feedback 💜
                        </Text>
                        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                            Bugs, feature ideas, complaints — it all helps us make StrathSpace better.
                        </Text>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(100).springify().damping(14)} style={styles.section}>
                        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                            What&apos;s on your mind?
                        </Text>
                        <View style={styles.chipsRow}>
                            {APP_FEEDBACK_CATEGORIES.map((c) => {
                                const isActive = category === c.id;
                                return (
                                    <Pressable
                                        key={c.id}
                                        onPress={() => handleSelectCategory(c.id)}
                                        style={[
                                            styles.chip,
                                            {
                                                backgroundColor: isActive ? colors.primary : colors.card,
                                                borderColor: isActive ? colors.primary : colors.border,
                                            },
                                        ]}
                                    >
                                        <Text style={styles.chipEmoji}>{c.emoji}</Text>
                                        <Text
                                            style={[
                                                styles.chipLabel,
                                                { color: isActive ? '#fff' : colors.foreground },
                                            ]}
                                        >
                                            {c.label}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(160).springify().damping(14)} style={styles.section}>
                        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                            Tell us more
                        </Text>
                        <View
                            style={[
                                styles.inputWrap,
                                { backgroundColor: colors.card, borderColor: colors.border },
                            ]}
                        >
                            <TextInput
                                value={message}
                                onChangeText={(t) => setMessage(t.slice(0, MAX_LENGTH))}
                                placeholder="What would you like to see, fix, or change?"
                                placeholderTextColor={colors.mutedForeground}
                                multiline
                                textAlignVertical="top"
                                style={[styles.input, { color: colors.foreground }]}
                                maxLength={MAX_LENGTH}
                            />
                        </View>
                        <View style={styles.counterRow}>
                            <Text style={[styles.counterHint, { color: colors.mutedForeground }]}>
                                Min {MIN_LENGTH} characters
                            </Text>
                            <Text style={[styles.counterText, { color: counterColor }]}>
                                {trimmedLength}/{MAX_LENGTH}
                            </Text>
                        </View>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(220).springify().damping(14)} style={styles.section}>
                        <View style={[styles.anonRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <View style={styles.anonTextBlock}>
                                <Text style={[styles.anonLabel, { color: colors.foreground }]}>
                                    Send anonymously
                                </Text>
                                <Text style={[styles.anonDesc, { color: colors.mutedForeground }]}>
                                    {anonymous
                                        ? "We won't know who sent this."
                                        : "We'll see your name so we can follow up if needed."}
                                </Text>
                            </View>
                            <Switch
                                value={anonymous}
                                onValueChange={(v) => {
                                    Haptics.selectionAsync();
                                    setAnonymous(v);
                                }}
                                trackColor={{ false: '#767577', true: colors.primary }}
                                thumbColor={Platform.OS === 'ios' ? '#fff' : (anonymous ? '#fff' : '#f4f3f4')}
                            />
                        </View>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(280).springify().damping(14)} style={styles.submitWrap}>
                        <Pressable
                            onPress={handleSubmit}
                            disabled={!canSubmit}
                            style={[
                                styles.submitBtn,
                                {
                                    backgroundColor: canSubmit
                                        ? colors.primary
                                        : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                                },
                            ]}
                        >
                            {isPending ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text
                                    style={[
                                        styles.submitBtnText,
                                        { color: canSubmit ? '#fff' : colors.mutedForeground },
                                    ]}
                                >
                                    Send Feedback
                                </Text>
                            )}
                        </Pressable>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    flex: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 16,
        paddingTop: 4,
        paddingBottom: 8,
    },
    backBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 48,
        gap: 28,
    },
    titleBlock: {
        gap: 8,
        paddingTop: 8,
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        letterSpacing: -0.3,
        lineHeight: 32,
        paddingBottom: 2,
    },
    subtitle: {
        fontSize: 15,
        lineHeight: 21,
    },
    section: {
        gap: 12,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    chipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 999,
        borderWidth: 1,
        gap: 6,
    },
    chipEmoji: {
        fontSize: 14,
    },
    chipLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    inputWrap: {
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 12,
        minHeight: 140,
    },
    input: {
        fontSize: 15,
        lineHeight: 22,
        minHeight: 120,
        padding: 0,
    },
    counterRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    counterHint: {
        fontSize: 12,
    },
    counterText: {
        fontSize: 12,
        fontWeight: '500',
    },
    anonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    anonTextBlock: {
        flex: 1,
        gap: 4,
    },
    anonLabel: {
        fontSize: 15,
        fontWeight: '600',
    },
    anonDesc: {
        fontSize: 13,
        lineHeight: 18,
    },
    submitWrap: {
        marginTop: 8,
    },
    submitBtn: {
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 54,
    },
    submitBtnText: {
        fontSize: 16,
        fontWeight: '700',
    },
    thankYouContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        gap: 16,
    },
    thankYouIcon: {
        width: 96,
        height: 96,
        borderRadius: 48,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    thankYouTitle: {
        fontSize: 24,
        fontWeight: '800',
        textAlign: 'center',
        letterSpacing: -0.3,
        lineHeight: 30,
        paddingBottom: 2,
    },
    thankYouSub: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
    },
    doneBtn: {
        borderRadius: 16,
        paddingVertical: 15,
        paddingHorizontal: 48,
        alignItems: 'center',
        marginTop: 8,
        minHeight: 52,
    },
    doneBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});
