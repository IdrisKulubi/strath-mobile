import React, { useCallback, useEffect, useState } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    StatusBar,
    Pressable,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    FadeInDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { useDateFeedback, useDateFeedbackStatus, MeetAgain } from '@/hooks/use-date-feedback';
import { StarRating } from '@/components/feedback/star-rating';
import { MeetAgainSelector } from '@/components/feedback/meet-again-selector';
import { FeedbackTextInput } from '@/components/feedback/feedback-text-input';

export default function FeedbackScreen() {
    const { dateId, name } = useLocalSearchParams<{ dateId: string; name?: string }>();
    const router = useRouter();
    const { colors, colorScheme } = useTheme();
    const isDark = colorScheme === 'dark';

    const [rating, setRating] = useState(0);
    const [meetAgain, setMeetAgain] = useState<MeetAgain | null>(null);
    const [textFeedback, setTextFeedback] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const { mutateAsync: submitFeedback, isPending } = useDateFeedback();
    const { data: feedbackStatus } = useDateFeedbackStatus(dateId);

    const submitBtnScale = useSharedValue(1);
    const submitAnimStyle = useAnimatedStyle(() => ({
        transform: [{ scale: submitBtnScale.value }],
    }));

    const canSubmit = rating > 0 && meetAgain !== null && !isPending;

    useEffect(() => {
        if (feedbackStatus?.hasSubmitted) {
            setSubmitted(true);
        }
    }, [feedbackStatus?.hasSubmitted]);

    const handleSubmit = useCallback(async () => {
        if (!canSubmit || !meetAgain) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        submitBtnScale.value = withSpring(0.94, { damping: 10, stiffness: 300 }, () => {
            submitBtnScale.value = withSpring(1);
        });
        try {
            await submitFeedback({
                dateId: dateId ?? '',
                rating,
                meetAgain,
                textFeedback: textFeedback.trim() || undefined,
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setSubmitted(true);
        } catch (error) {
            if (error instanceof Error && error.message.includes('already submitted feedback')) {
                setSubmitted(true);
                return;
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
    }, [canSubmit, meetAgain, dateId, rating, textFeedback, submitFeedback, submitBtnScale]);

    const handleDone = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/(tabs)/dates');
    }, [router]);

    const partnerName = name ?? 'your date';

    // ── Thank-you state ───────────────────────────────────────────────────────
    if (submitted) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
                <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
                <Animated.View entering={FadeInDown.springify().damping(14)} style={styles.thankYouContent}>
                    <View style={[styles.thankYouIcon, { backgroundColor: 'rgba(233,30,140,0.12)' }]}>
                        <Ionicons name="heart" size={52} color={colors.primary} />
                    </View>
                    <Text style={[styles.thankYouTitle, { color: colors.foreground }]}>
                        Thanks for the feedback 💜
                    </Text>
                    <Text style={[styles.thankYouSub, { color: colors.mutedForeground }]}>
                        Your response helps us make better matches.
                    </Text>
                    <Pressable
                        onPress={handleDone}
                        style={[styles.doneBtn, { backgroundColor: colors.primary }]}
                    >
                        <Text style={styles.doneBtnText}>Back to Dates</Text>
                    </Pressable>
                </Animated.View>
            </SafeAreaView>
        );
    }

    // ── Feedback form ─────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* Header */}
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
                    {/* Title */}
                    <Animated.View entering={FadeInDown.delay(40).springify().damping(14)} style={styles.titleBlock}>
                        <Text style={[styles.title, { color: colors.foreground }]}>
                            How was your date? 💜
                        </Text>
                        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                            with {partnerName}
                        </Text>
                    </Animated.View>

                    {/* Star rating */}
                    <Animated.View entering={FadeInDown.delay(100).springify().damping(14)} style={styles.section}>
                        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                            Rate the date
                        </Text>
                        <StarRating value={rating} onChange={setRating} size={42} />
                        {rating > 0 && (
                            <Text style={[styles.ratingHint, { color: colors.mutedForeground }]}>
                                {['', 'Not great', 'It was okay', 'Pretty good', 'Really good', 'Amazing!'][rating]}
                            </Text>
                        )}
                    </Animated.View>

                    {/* Meet again */}
                    <Animated.View entering={FadeInDown.delay(160).springify().damping(14)} style={styles.section}>
                        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                            Would you meet again?
                        </Text>
                        <MeetAgainSelector value={meetAgain} onChange={setMeetAgain} />
                    </Animated.View>

                    {/* Optional text */}
                    <Animated.View entering={FadeInDown.delay(220).springify().damping(14)} style={styles.section}>
                        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                            Anything to share?{' '}
                            <Text style={[styles.optionalTag, { color: colors.mutedForeground }]}>
                                optional
                            </Text>
                        </Text>
                        <FeedbackTextInput value={textFeedback} onChange={setTextFeedback} />
                    </Animated.View>

                    {/* Submit */}
                    <Animated.View
                        entering={FadeInDown.delay(280).springify().damping(14)}
                        style={[styles.submitWrap, submitAnimStyle]}
                    >
                        <Pressable
                            onPress={handleSubmit}
                            disabled={!canSubmit}
                            style={[
                                styles.submitBtn,
                                {
                                    backgroundColor: canSubmit ? colors.primary : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
                                },
                            ]}
                        >
                            {isPending ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={[
                                    styles.submitBtnText,
                                    { color: canSubmit ? '#fff' : colors.mutedForeground },
                                ]}>
                                    Submit Feedback
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
        gap: 4,
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
        fontSize: 16,
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
    optionalTag: {
        fontWeight: '400',
        textTransform: 'none',
        letterSpacing: 0,
    },
    ratingHint: {
        fontSize: 14,
        textAlign: 'center',
        fontWeight: '500',
        marginTop: -4,
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
    // Thank-you state
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
