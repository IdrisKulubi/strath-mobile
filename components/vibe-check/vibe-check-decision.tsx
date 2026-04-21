import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    StyleSheet,
    Pressable,
    ActivityIndicator,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    FadeInDown,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import type BottomSheet from '@gorhom/bottom-sheet';
import { Text } from '@/components/ui/text';
import { CachedImage } from '@/components/ui/cached-image';
import { useToast } from '@/components/ui/toast';
import { useTheme } from '@/hooks/use-theme';
import { useVibeCheck } from '@/hooks/use-vibe-check';
import { useFeatureFlags } from '@/hooks/use-feature-flags';
import { PARTNER_DECISION_TIMEOUT_SECONDS } from '@/lib/vibe-check-constants';
import { DateCoordinationPaywall } from '@/components/paywall/date-coordination-paywall';

interface VibeCheckDecisionProps {
    vibeCheckId: string;
    matchId: string;
    partnerFirstName?: string | null;
    partnerPhoto?: string | null;
    onClose?: () => void;
}

export function VibeCheckDecision({
    vibeCheckId,
    matchId,
    partnerFirstName,
    partnerPhoto,
    onClose,
}: VibeCheckDecisionProps) {
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const toast = useToast();

    const {
        submitDecisionAsync,
        isSubmittingDecision,
        submitDecisionError,
        isSubmitDecisionError,
        resetSubmitDecision,
        vibeCheckResult,
        nudgePartnerAsync,
    } = useVibeCheck(matchId, vibeCheckId);

    const yesScale = useSharedValue(1);
    const noScale = useSharedValue(1);
    const celebY = useSharedValue(0);
    const celebOpacity = useSharedValue(0);

    /** Last decision the user attempted; used for retry on network failure. */
    const [pendingRetry, setPendingRetry] = useState<'meet' | 'pass' | null>(null);
    /**
     * Countdown for "waiting on partner" after this user picks `meet`. When it hits 0 we
     * nudge the partner and route back to Dates so the user isn't stuck on a spinner.
     */
    const [partnerCountdown, setPartnerCountdown] = useState<number | null>(null);
    const partnerTimeoutFiredRef = useRef(false);
    const partnerTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const userDecision = vibeCheckResult?.userDecision;
    const bothAgreed = vibeCheckResult?.bothAgreedToMeet;
    const bothDecided = vibeCheckResult?.bothDecided;

    // ─── Payment gate (docs/payment.md) ──────────────────────────────────
    // When `payments_enabled` is ON and the backend-bridged date_match sits
    // in an open payment state, the "Being arranged" success screen is
    // replaced with a CTA that opens the Date Coordination paywall.
    const { flags: featureFlags } = useFeatureFlags();
    const paymentsEnabled = !!featureFlags?.paymentsEnabled;
    const dateMatchId = vibeCheckResult?.dateMatchId ?? null;
    const paymentState = vibeCheckResult?.paymentState ?? null;
    const needsPayment = useMemo(
        () =>
            paymentsEnabled
            && !!dateMatchId
            && (paymentState === 'awaiting_payment'
                || paymentState === 'paid_waiting_for_other'),
        [paymentsEnabled, dateMatchId, paymentState],
    );
    const paywallRef = useRef<BottomSheet>(null);
    const hasAutoOpenedPaywallRef = useRef(false);

    const openPaywall = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        paywallRef.current?.expand();
    }, []);

    const handlePaywallClose = useCallback(() => {
        paywallRef.current?.close();
    }, []);

    // Auto-open the paywall the first time we land on the mutual-agree branch
    // with an unpaid match. Manual reopen is available via the CTA below.
    useEffect(() => {
        if (!bothAgreed || !needsPayment) return;
        if (hasAutoOpenedPaywallRef.current) return;
        hasAutoOpenedPaywallRef.current = true;
        const t = setTimeout(openPaywall, 650);
        return () => clearTimeout(t);
    }, [bothAgreed, needsPayment, openPaywall]);

    useEffect(() => {
        if (vibeCheckResult?.bothAgreedToMeet) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 160);
            celebOpacity.value = withTiming(1, { duration: 300 });
            celebY.value = withSpring(0, { damping: 10, stiffness: 200 });
        }
    }, [vibeCheckResult?.bothAgreedToMeet, celebY, celebOpacity]);

    const stopPartnerTimer = useCallback(() => {
        if (partnerTimerRef.current) {
            clearInterval(partnerTimerRef.current);
            partnerTimerRef.current = null;
        }
    }, []);

    /**
     * Owns the 60s "waiting on partner" countdown. Only runs when the deciding user said
     * `meet` and the partner has not yet decided. Stops as soon as both decide.
     */
    useEffect(() => {
        if (userDecision !== 'meet' || bothDecided) {
            stopPartnerTimer();
            setPartnerCountdown(null);
            partnerTimeoutFiredRef.current = false;
            return;
        }

        if (partnerCountdown !== null) return; // already running

        partnerTimeoutFiredRef.current = false;
        setPartnerCountdown(PARTNER_DECISION_TIMEOUT_SECONDS);
        partnerTimerRef.current = setInterval(() => {
            setPartnerCountdown((prev) => {
                if (prev === null) return null;
                const next = prev - 1;
                if (next <= 0) {
                    if (partnerTimerRef.current) {
                        clearInterval(partnerTimerRef.current);
                        partnerTimerRef.current = null;
                    }
                    return 0;
                }
                return next;
            });
        }, 1000);

        return () => {
            stopPartnerTimer();
        };
    // partnerCountdown intentionally excluded — this effect bootstraps it once per state change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userDecision, bothDecided, stopPartnerTimer]);

    /** Cleanup on unmount. */
    useEffect(() => () => stopPartnerTimer(), [stopPartnerTimer]);

    /**
     * Side effect of countdown reaching 0: best-effort nudge then route to Dates.
     * Guarded with `partnerTimeoutFiredRef` so a fast unmount/remount can't double-fire.
     */
    useEffect(() => {
        if (partnerCountdown !== 0) return;
        if (partnerTimeoutFiredRef.current) return;
        if (bothDecided) return;
        partnerTimeoutFiredRef.current = true;

        const partnerName = partnerFirstName ?? 'They';
        nudgePartnerAsync(vibeCheckId).catch(() => {
            // best-effort; surface only as toast, don't block the redirect
        });
        toast.show({
            message: `${partnerName} hasn't decided yet — finish from Dates.`,
            variant: 'default',
        });
        if (onClose) {
            onClose();
        } else {
            router.replace('/(tabs)/dates');
        }
    }, [
        partnerCountdown,
        bothDecided,
        nudgePartnerAsync,
        vibeCheckId,
        partnerFirstName,
        onClose,
        router,
        toast,
    ]);

    const submitWithRetryGuard = useCallback(
        async (decision: 'meet' | 'pass') => {
            try {
                resetSubmitDecision();
                setPendingRetry(decision);
                await submitDecisionAsync({ vibeCheckId, decision });
                setPendingRetry(null);
            } catch {
                // mutation surfaces error via isSubmitDecisionError; pendingRetry stays set so
                // the user has a Retry pill in the prompt UI.
            }
        },
        [resetSubmitDecision, submitDecisionAsync, vibeCheckId],
    );

    const handleYes = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        yesScale.value = withSpring(0.93, { damping: 10, stiffness: 300 }, () => {
            yesScale.value = withSpring(1);
        });
        submitWithRetryGuard('meet');
    }, [submitWithRetryGuard, yesScale]);

    const handleNo = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        noScale.value = withTiming(0.94, { duration: 80 }, () => {
            noScale.value = withSpring(1);
        });
        submitWithRetryGuard('pass');
    }, [submitWithRetryGuard, noScale]);

    const handleRetry = useCallback(() => {
        if (!pendingRetry) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        submitWithRetryGuard(pendingRetry);
    }, [pendingRetry, submitWithRetryGuard]);

    const handleDone = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (onClose) {
            onClose();
        } else {
            router.push('/(tabs)/dates');
        }
    }, [onClose, router]);

    const yesAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: yesScale.value }] }));
    const noAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: noScale.value }] }));

    const name = partnerFirstName ?? 'them';

    // ── Mutual agree ─────────────────────────────────────────────────────────
    if (bothAgreed) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Animated.View entering={FadeInDown.springify().damping(14)} style={styles.center}>
                    <View style={[styles.successIcon, { backgroundColor: 'rgba(233,30,140,0.12)' }]}>
                        <Ionicons name="heart" size={48} color={colors.primary} />
                    </View>
                    <Text style={[styles.heading, { color: colors.foreground }]}>
                        The vibe is real! 🎉
                    </Text>
                    <Text style={[styles.body, { color: colors.mutedForeground }]}>
                        {needsPayment
                            ? `You and ${name} both want to meet.\nConfirm with a KES 200 coordination fee to arrange it.`
                            : `You and ${name} both want to meet.\nStrathSpace will arrange the date.`}
                    </Text>

                    {needsPayment ? (
                        <>
                            <View style={[styles.arrangeBox, {
                                backgroundColor: isDark ? 'rgba(236,72,153,0.12)' : 'rgba(236,72,153,0.08)',
                                borderColor: isDark ? 'rgba(236,72,153,0.28)' : 'rgba(236,72,153,0.2)',
                            }]}>
                                <View style={styles.arrangeDot}>
                                    <Ionicons name="sparkles" size={16} color={colors.primary} />
                                </View>
                                <Text style={[styles.arrangeText, { color: colors.mutedForeground }]}>
                                    {paymentState === 'paid_waiting_for_other'
                                        ? `${name} has already paid. Confirm your half to arrange the date.`
                                        : 'A small commitment fee keeps StrathSpace intentional.'}
                                </Text>
                            </View>
                            <Pressable
                                onPress={openPaywall}
                                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                            >
                                <Text style={styles.primaryBtnText}>
                                    Confirm with KES 200
                                </Text>
                            </Pressable>
                            <Pressable onPress={handleDone} style={styles.ghostBtn}>
                                <Text style={[styles.ghostBtnText, { color: colors.mutedForeground }]}>
                                    I&apos;ll do this later
                                </Text>
                            </Pressable>
                        </>
                    ) : (
                        <>
                            <View style={[styles.arrangeBox, {
                                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                borderColor: colors.border,
                            }]}>
                                <View style={styles.arrangeDot}>
                                    <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                                </View>
                                <Text style={[styles.arrangeText, { color: colors.mutedForeground }]}>
                                    Being arranged by StrathSpace — we&apos;ll reach out soon.
                                </Text>
                            </View>
                            <Pressable
                                onPress={handleDone}
                                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                            >
                                <Text style={styles.primaryBtnText}>Go to Dates</Text>
                            </Pressable>
                        </>
                    )}
                </Animated.View>

                {needsPayment && dateMatchId ? (
                    <DateCoordinationPaywall
                        ref={paywallRef}
                        dateMatchId={dateMatchId}
                        partnerName={partnerFirstName ?? null}
                        onClose={handlePaywallClose}
                        onPaid={() => {
                            // Paywall auto-closes on success. Route to Dates so
                            // the user lands in the "being_arranged" item.
                            toast.show({
                                message: 'You\'re confirmed. We\'ll arrange this one.',
                                variant: 'success',
                            });
                            if (onClose) {
                                onClose();
                            } else {
                                router.replace('/(tabs)/dates');
                            }
                        }}
                    />
                ) : null}
            </View>
        );
    }

    // ── User picked "pass": no partner wait makes sense (mutual is impossible). ──
    if (userDecision === 'pass' && !bothDecided) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Animated.View entering={FadeInDown.springify().damping(14)} style={styles.center}>
                    <View style={[styles.successIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' }]}>
                        <Ionicons name="checkmark-circle-outline" size={44} color={colors.mutedForeground} />
                    </View>
                    <Text style={[styles.heading, { color: colors.foreground }]}>
                        Got it
                    </Text>
                    <Text style={[styles.body, { color: colors.mutedForeground }]}>
                        We won't share your decision with {name}. Keep exploring 💫
                    </Text>
                    <Pressable
                        onPress={handleDone}
                        style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                    >
                        <Text style={styles.primaryBtnText}>Back to Dates</Text>
                    </Pressable>
                </Animated.View>
            </View>
        );
    }

    // ── User picked "meet", waiting on partner with a 60s soft timeout ──────
    if (userDecision === 'meet' && !bothDecided) {
        const seconds = partnerCountdown ?? PARTNER_DECISION_TIMEOUT_SECONDS;
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Animated.View entering={FadeInDown.springify().damping(14)} style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} style={{ marginBottom: 8 }} />
                    <Text style={[styles.heading, { color: colors.foreground }]}>
                        Waiting on {name}…
                    </Text>
                    <Text style={[styles.body, { color: colors.mutedForeground }]}>
                        You said{' '}
                        <Text style={{ color: '#10b981', fontWeight: '700' }}>
                            Yes, let&apos;s meet
                        </Text>
                        . We&apos;ll route you to Dates if they don&apos;t reply soon.
                    </Text>
                    <Text style={[styles.countdownText, { color: colors.mutedForeground }]}>
                        Waiting {seconds}s…
                    </Text>
                    <Pressable onPress={handleDone} style={styles.ghostBtn}>
                        <Text style={[styles.ghostBtnText, { color: colors.mutedForeground }]}>
                            Go to Dates
                        </Text>
                    </Pressable>
                </Animated.View>
            </View>
        );
    }

    // ── Both decided, no mutual agree ─────────────────────────────────────────
    if (bothDecided && !bothAgreed) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Animated.View entering={FadeInDown.springify().damping(14)} style={styles.center}>
                    <View style={[styles.successIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' }]}>
                        <Ionicons name="hand-left-outline" size={40} color={colors.mutedForeground} />
                    </View>
                    <Text style={[styles.heading, { color: colors.foreground }]}>
                        No worries
                    </Text>
                    <Text style={[styles.body, { color: colors.mutedForeground }]}>
                        Not every vibe leads to a date — and that's okay.{'\n'}Keep exploring 💫
                    </Text>
                    <Pressable onPress={handleDone} style={[styles.primaryBtn, { backgroundColor: colors.primary }]}>
                        <Text style={styles.primaryBtnText}>Back to Dates</Text>
                    </Pressable>
                </Animated.View>
            </View>
        );
    }

    // ── Decision prompt (main state) ─────────────────────────────────────────
    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Animated.View entering={FadeInDown.springify().damping(14)} style={styles.center}>
                {/* Photo */}
                <View style={[styles.photoRing, { borderColor: colors.primary }]}>
                    {partnerPhoto ? (
                        <CachedImage uri={partnerPhoto} style={styles.photo} fallbackType="avatar" />
                    ) : (
                        <View style={[styles.photo, styles.photoFallback, { backgroundColor: colors.muted }]}>
                            <Ionicons name="person" size={40} color={colors.mutedForeground} />
                        </View>
                    )}
                </View>

                <Text style={[styles.name, { color: colors.foreground }]}>{name}</Text>

                {/* Question */}
                <View style={styles.questionBlock}>
                    <Text style={[styles.heading, { color: colors.foreground }]}>
                        Still open to meeting?
                    </Text>
                    <Text style={[styles.body, { color: colors.mutedForeground }]}>
                        Your answer stays private until both sides decide.
                    </Text>
                </View>

                {/* Buttons */}
                <View style={styles.btnStack}>
                    <Animated.View style={[{ width: '100%' }, yesAnimStyle]}>
                        <Pressable
                            onPress={handleYes}
                            disabled={isSubmittingDecision}
                            style={[
                                styles.primaryBtn,
                                { backgroundColor: colors.primary, opacity: isSubmittingDecision ? 0.7 : 1 },
                            ]}
                        >
                            {isSubmittingDecision ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.primaryBtnText}>Yes, I&apos;m in</Text>
                            )}
                        </Pressable>
                    </Animated.View>

                    <Animated.View style={[{ width: '100%' }, noAnimStyle]}>
                        <Pressable
                            onPress={handleNo}
                            disabled={isSubmittingDecision}
                            style={[
                                styles.ghostBtn,
                                {
                                    borderColor: colors.border,
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                    opacity: isSubmittingDecision ? 0.5 : 1,
                                },
                            ]}
                        >
                            <Text style={[styles.ghostBtnText, { color: colors.mutedForeground }]}>
                                Not really
                            </Text>
                        </Pressable>
                    </Animated.View>

                    {isSubmitDecisionError && pendingRetry && !isSubmittingDecision && (
                        <View style={styles.errorBlock}>
                            <Text style={[styles.errorText, { color: '#f43f5e' }]}>
                                {submitDecisionError instanceof Error
                                    ? submitDecisionError.message
                                    : "Couldn't save your choice."}
                            </Text>
                            <Pressable
                                onPress={handleRetry}
                                style={[styles.retryPill, { borderColor: colors.primary }]}
                            >
                                <Ionicons name="refresh" size={14} color={colors.primary} />
                                <Text style={[styles.retryText, { color: colors.primary }]}>
                                    Retry
                                </Text>
                            </Pressable>
                        </View>
                    )}
                </View>

            </Animated.View>
        </View>
    );
}

const PHOTO_SIZE = 100;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        gap: 16,
    },
    photoRing: {
        width: PHOTO_SIZE + 6,
        height: PHOTO_SIZE + 6,
        borderRadius: (PHOTO_SIZE + 6) / 2,
        borderWidth: 3,
        padding: 2,
        overflow: 'hidden',
        marginBottom: 4,
    },
    photo: {
        width: PHOTO_SIZE,
        height: PHOTO_SIZE,
        borderRadius: PHOTO_SIZE / 2,
    },
    photoFallback: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    name: {
        fontSize: 20,
        fontWeight: '700',
        marginTop: -8,
    },
    questionBlock: {
        alignItems: 'center',
        gap: 6,
    },
    heading: {
        fontSize: 22,
        fontWeight: '700',
        textAlign: 'center',
        letterSpacing: -0.2,
    },
    body: {
        fontSize: 15,
        lineHeight: 22,
        textAlign: 'center',
    },
    btnStack: {
        width: '100%',
        gap: 10,
        marginTop: 4,
    },
    primaryBtn: {
        borderRadius: 16,
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 52,
    },
    primaryBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    ghostBtn: {
        borderRadius: 16,
        borderWidth: 1,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 50,
    },
    ghostBtnText: {
        fontSize: 15,
        fontWeight: '600',
    },
    privacyNote: {
        fontSize: 12,
        textAlign: 'center',
        marginTop: -4,
    },
    successIcon: {
        width: 88,
        height: 88,
        borderRadius: 44,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    arrangeBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderRadius: 14,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 12,
        width: '100%',
    },
    arrangeDot: {
        width: 8,
        alignItems: 'center',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    arrangeText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 18,
    },
    countdownText: {
        fontSize: 13,
        fontWeight: '600',
        fontVariant: ['tabular-nums'],
        marginTop: -4,
    },
    errorBlock: {
        marginTop: 12,
        alignItems: 'center',
        gap: 8,
    },
    errorText: {
        fontSize: 13,
        textAlign: 'center',
    },
    retryPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    retryText: {
        fontSize: 13,
        fontWeight: '700',
    },
});
