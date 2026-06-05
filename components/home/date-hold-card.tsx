import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, TouchableOpacity, Text as RNText } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { CancelHoldSheet } from '@/components/home/cancel-hold-sheet';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { CachedImage } from '@/components/ui/cached-image';
import { useTheme } from '@/hooks/use-theme';
import { useToast } from '@/components/ui/toast';
import {
    MatchHold,
    MatchHoldCancelReason,
    useCancelMatchHold,
} from '@/hooks/use-daily-matches';
import { usePaymentStatus } from '@/hooks/use-payment-status';
import { usePaymentsEnabled } from '@/hooks/use-payments-enabled';
import { formatPaymentAmount } from '@/lib/payment-ui';
import { formatMeetupSlot } from '@/lib/meetup-slot';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
interface DateHoldCardProps {
    hold: MatchHold;
}

export function DateHoldCard({ hold }: DateHoldCardProps) {
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const toast = useToast();
    const cancel = useCancelMatchHold();
    const [showCancel, setShowCancel] = useState(false);

    const partnerName = hold.partner.firstName ?? 'your match';

    const { paymentsEnabled } = usePaymentsEnabled();
    const { data: paymentStatus } = usePaymentStatus(hold.dateMatchId ?? undefined);

    const copy = useMemo(
        () => buildCopy(hold, paymentsEnabled, paymentStatus?.amount, paymentStatus?.currency),
        [hold, paymentsEnabled, paymentStatus?.amount, paymentStatus?.currency],
    );

    const reschedulePending = hold.slotConfirmation?.reschedule?.pending;
    const needsRescheduleResponse = Boolean(reschedulePending?.isYourTurnToRespond);

    const handleRescheduleResponse = useCallback(() => {
        if (!reschedulePending?.requestId) {
            router.push('/(tabs)/dates');
            return;
        }
        router.push({
            pathname: '/(tabs)/dates',
            params: { rescheduleRequestId: reschedulePending.requestId },
        } as any);
    }, [reschedulePending?.requestId, router]);

    const handlePrimaryCta = useCallback(() => {
        if (copy.primaryCta?.kind === 'feedback' && hold.dateMatchId) {
            router.push({
                pathname: '/feedback/[dateId]',
                params: {
                    dateId: hold.dateMatchId,
                    name: partnerName,
                },
            });
            return;
        }
        router.push('/(tabs)/dates');
    }, [copy.primaryCta, hold.dateMatchId, partnerName, router]);

    const paidCreditNote = useMemo(() => {
        if (!paymentsEnabled || !paymentStatus?.currentUserPaid) {
            return null;
        }
        const amountLabel = formatPaymentAmount(
            paymentStatus.amount ?? 499,
            paymentStatus.currency ?? 'KES',
        );
        return `If you cancel, your ${amountLabel} stays as StrathSpace credit for your next date.`;
    }, [paymentsEnabled, paymentStatus]);

    const handleCancel = (reason: MatchHoldCancelReason) => {
        cancel.mutate(
            { mutualMatchId: hold.mutualMatchId, reason, notes: null },
            {
                onSuccess: (data) => {
                    if (data.credited && data.creditAmountCents != null) {
                        const amountLabel = formatPaymentAmount(
                            data.creditAmountCents / 100,
                            paymentStatus?.currency ?? 'KES',
                        );
                        toast.show({
                            message: `Cancelled. ${amountLabel} saved as your StrathSpace credit.`,
                            variant: 'success',
                        });
                    } else {
                        toast.show({
                            message: 'Cancelled — Home will reopen for new intros.',
                            variant: 'success',
                        });
                    }
                    setShowCancel(false);
                },
                onError: () => {
                    toast.show({
                        message: 'Could not cancel right now. Please try again.',
                        variant: 'danger',
                    });
                },
            },
        );
    };

    const rescheduleCtaFill = isDark ? 'rgba(217,74,143,0.12)' : 'rgba(184,50,122,0.08)';
    const rescheduleCtaFillPressed = isDark ? 'rgba(217,74,143,0.2)' : 'rgba(184,50,122,0.12)';

    return (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.outer}>
            <View style={styles.card}>
                <View style={styles.content}>
                    <View style={styles.statusPillRow}>
                        <View style={[styles.statusPill, { backgroundColor: colors.primary }]}>
                            <Ionicons name={copy.statusIcon} size={14} color={colors.primaryForeground} />
                            <Text style={[styles.statusPillText, { color: colors.primaryForeground }]}>
                                {copy.statusLabel}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.partnerRow}>
                        <View style={[styles.avatarWrap, { borderColor: colors.border }]}>
                            {hold.partner.profilePhoto ? (
                                <CachedImage uri={hold.partner.profilePhoto} style={styles.avatar} />
                            ) : (
                                <View style={[styles.avatarFallback, { backgroundColor: colors.primary }]}>
                                    <Text style={[styles.avatarFallbackText, { color: colors.primaryForeground }]}>
                                        {partnerName.charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                            )}
                        </View>
                        <View style={styles.partnerText}>
                            <Text style={[styles.partnerName, { color: colors.foreground }]} numberOfLines={1}>
                                {partnerName}
                                {hold.partner.age ? `, ${hold.partner.age}` : ''}
                            </Text>
                            {hold.partner.course || hold.partner.university ? (
                                <Text
                                    style={[styles.partnerMeta, { color: colors.mutedForeground }]}
                                    numberOfLines={1}
                                >
                                    {[hold.partner.course, hold.partner.university]
                                        .filter(Boolean)
                                        .join(' • ')}
                                </Text>
                            ) : null}
                        </View>
                    </View>

                    <Text style={[styles.title, { color: colors.foreground }]}>{copy.title}</Text>
                    <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{copy.subtitle}</Text>

                    {hold.slotConfirmation?.needsSlotConfirmation && hold.slotConfirmation.viewerSlotConfirmed ? (
                        <View style={[styles.detailsBlock, { borderColor: colors.border }]}>
                            {hold.slotConfirmation.scheduledAt ? (
                                <View style={styles.detailRow}>
                                    <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                                    <Text style={[styles.detailText, { color: colors.foreground }]}>
                                        {formatMeetupSlot(hold.slotConfirmation.scheduledAt)}
                                    </Text>
                                </View>
                            ) : null}
                            <Text style={[styles.waitingPartner, { color: colors.mutedForeground }]}>
                                {hold.slotConfirmation.partnerSlotConfirmed
                                    ? `${partnerName} confirmed — finalizing your date.`
                                    : `You confirmed · Waiting for ${partnerName} to confirm.`}
                            </Text>
                        </View>
                    ) : !hold.slotConfirmation?.needsSlotConfirmation && (hold.scheduledAt || hold.venueName) ? (
                        <View style={[styles.detailsBlock, { borderColor: colors.border }]}>
                            {hold.scheduledAt ? (
                                <View style={styles.detailRow}>
                                    <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                                    <Text style={[styles.detailText, { color: colors.foreground }]}>
                                        {formatDate(hold.scheduledAt)}
                                    </Text>
                                </View>
                            ) : null}
                            {hold.venueName ? (
                                <View style={styles.detailRow}>
                                    <Ionicons name="location-outline" size={18} color={colors.primary} />
                                    <Text style={[styles.detailText, { color: colors.foreground }]}>
                                        {hold.venueName}
                                        {hold.venueAddress ? ` · ${hold.venueAddress}` : ''}
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                    ) : null}

                    {needsRescheduleResponse && reschedulePending ? (
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Respond to date change request"
                            onPress={handleRescheduleResponse}
                            style={({ pressed }) => [
                                styles.rescheduleCta,
                                {
                                    borderColor: colors.primary,
                                    backgroundColor: pressed
                                        ? rescheduleCtaFillPressed
                                        : rescheduleCtaFill,
                                },
                            ]}
                        >
                            <Ionicons name="swap-horizontal" size={18} color={colors.primary} />
                            <Text style={[styles.rescheduleCtaText, { color: colors.primary }]}>
                                Respond to date change request
                            </Text>
                        </Pressable>
                    ) : null}

                    <View style={styles.ctaStack}>
                        {copy.primaryCta ? (
                            <TouchableOpacity
                                accessibilityRole="button"
                                accessibilityLabel={copy.primaryCta.label}
                                activeOpacity={0.88}
                                onPress={handlePrimaryCta}
                            >
                                <View
                                    style={[
                                        styles.primaryButton,
                                        {
                                            backgroundColor: colors.primary,
                                            borderColor: colors.primary,
                                        },
                                    ]}
                                >
                                    <RNText style={styles.primaryButtonLabel}>
                                        {copy.primaryCta.label}
                                    </RNText>
                                </View>
                            </TouchableOpacity>
                        ) : null}

                        <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel={
                                hold.status === 'completed_pending_feedback'
                                    ? 'Mark as not interested'
                                    : 'Cancel, keep matching me'
                            }
                            activeOpacity={0.88}
                            onPress={() => setShowCancel(true)}
                        >
                            <View
                                style={[
                                    styles.outlineButton,
                                    {
                                        borderColor: colors.primary,
                                        backgroundColor: colors.background,
                                    },
                                ]}
                            >
                                <RNText style={[styles.outlineButtonLabel, { color: colors.primary }]}>
                                    {hold.status === 'completed_pending_feedback'
                                        ? 'Mark as not interested'
                                        : 'Cancel, keep matching me'}
                                </RNText>
                            </View>
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.footnote, { color: colors.mutedForeground }]}>
                        {copy.footnote}
                    </Text>
                </View>
            </View>

            <CancelHoldSheet
                visible={showCancel}
                partnerName={partnerName}
                isSubmitting={cancel.isPending}
                paidCreditNote={paidCreditNote}
                onClose={() => setShowCancel(false)}
                onConfirm={handleCancel}
            />
        </Animated.View>
    );
}

interface HoldCopy {
    statusLabel: string;
    statusIcon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle: string;
    footnote: string;
    primaryCta: { label: string; kind: 'view' | 'feedback' } | null;
}

function buildCopy(
    hold: MatchHold,
    paymentsEnabled: boolean,
    amount?: number,
    currency?: string,
): HoldCopy {
    const name = hold.partner.firstName ?? 'them';
    const amountLabel = formatPaymentAmount(amount ?? 499, currency ?? 'KES');
    const needsPayConfirm =
        paymentsEnabled
        && hold.slotConfirmation?.needsSlotConfirmation
        && !hold.slotConfirmation.viewerSlotConfirmed;

    switch (hold.status) {
        case 'mutual':
            return {
                statusLabel: 'Mutual match',
                statusIcon: 'heart',
                title: `You and ${name} both said yes`,
                subtitle: hold.slotConfirmation?.needsSlotConfirmation
                    ? needsPayConfirm
                        ? `Pay ${amountLabel} on Dates to confirm your campus time. New intros stay paused until this is settled.`
                        : 'Confirm your assigned StrathSpace date below. New intros stay paused until this is settled.'
                    : 'Say hi in chat while your date is lined up. New intros are paused for this match.',
                footnote: 'You can cancel any time and we will keep matching you.',
                primaryCta: needsPayConfirm
                    ? { label: `Pay ${amountLabel} on Dates`, kind: 'view' }
                    : { label: 'Message', kind: 'view' },
            };
        case 'being_arranged':
            return {
                statusLabel: hold.slotConfirmation?.needsSlotConfirmation
                    ? needsPayConfirm
                        ? 'Pay to confirm'
                        : 'Confirm your date'
                    : 'Arranging your date',
                statusIcon: hold.slotConfirmation?.needsSlotConfirmation ? 'calendar' : 'calendar-outline',
                title: hold.slotConfirmation?.needsSlotConfirmation
                    ? needsPayConfirm
                        ? `Pay ${amountLabel} to confirm with ${name}`
                        : `Confirm your date with ${name}`
                    : `Setting up your date with ${name}`,
                subtitle: hold.slotConfirmation?.needsSlotConfirmation
                    ? needsPayConfirm
                        ? 'Your campus time is assigned. Complete payment on Dates to continue.'
                        : 'Your campus time is assigned. Confirm below to continue.'
                    : 'Your date is being finalized. New intros stay paused.',
                footnote: hold.slotConfirmation?.needsSlotConfirmation
                    ? needsPayConfirm
                        ? 'Messaging unlocks after you pay and confirm.'
                        : 'Messaging unlocks after you confirm.'
                    : 'Open Dates for details while your plan is finalized.',
                primaryCta: hold.slotConfirmation?.needsSlotConfirmation
                    ? needsPayConfirm
                        ? { label: `Pay ${amountLabel} on Dates`, kind: 'view' }
                        : null
                    : { label: 'See arrangement', kind: 'view' },
            };
        case 'upcoming':
            return {
                statusLabel: 'Upcoming date',
                statusIcon: 'calendar',
                title: `Date with ${name} coming up`,
                subtitle:
                    'Your date is confirmed. New intros stay paused until after your date — focus is the whole point.',
                footnote: 'Need to cancel? Tap below and we’ll release you.',
                primaryCta: { label: 'See date details', kind: 'view' },
            };
        case 'completed_pending_feedback':
            return {
                statusLabel: 'How did it go?',
                statusIcon: 'chatbubble-ellipses-outline',
                title: `Tell us about your date with ${name}`,
                subtitle:
                    'Your date is marked as completed. Leave feedback to continue receiving matches.',
                footnote: hold.autoReleaseAt
                    ? `New matches stay paused until you respond, or auto-resume ${formatRelative(hold.autoReleaseAt)}.`
                    : 'New matches stay paused until you respond, or auto-resume soon.',
                primaryCta: { label: 'Leave feedback', kind: 'feedback' },
            };
    }
}

function formatDate(iso: string): string {
    try {
        const d = new Date(iso);
        return d.toLocaleString('en-KE', {
            timeZone: 'Africa/Nairobi',
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
    } catch {
        return iso;
    }
}

function formatRelative(iso: string): string {
    try {
        const ms = new Date(iso).getTime() - Date.now();
        const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
        if (days <= 0) return 'shortly';
        if (days === 1) return 'in about a day';
        return `in about ${days} days`;
    } catch {
        return 'soon';
    }
}

const styles = StyleSheet.create({
    outer: {
        paddingHorizontal: 18,
        paddingTop: 8,
        paddingBottom: 8,
    },
    card: {
        backgroundColor: 'transparent',
    },
    content: {
        paddingHorizontal: 4,
        paddingVertical: 8,
        gap: 14,
    },
    statusPillRow: {
        flexDirection: 'row',
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
    },
    statusPillText: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.3,
        textTransform: 'uppercase',
    },
    partnerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        marginTop: 4,
    },
    avatarWrap: {
        width: 64,
        height: 64,
        borderRadius: 32,
        overflow: 'hidden',
        borderWidth: 1,
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    avatarFallback: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarFallbackText: {
        fontSize: 26,
        fontWeight: '800',
        color: 'transparent',
    },
    partnerText: {
        flex: 1,
        gap: 2,
    },
    partnerName: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    partnerMeta: {
        fontSize: 13,
        fontWeight: '500',
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.4,
        lineHeight: 28,
        marginTop: 4,
    },
    subtitle: {
        fontSize: 15,
        lineHeight: 22,
    },
    detailsBlock: {
        marginTop: 4,
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 10,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    detailText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
    },
    waitingPartner: {
        fontSize: 13,
        lineHeight: 18,
        marginTop: 4,
    },
    rescheduleCta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        minHeight: 48,
        paddingHorizontal: 16,
        borderRadius: 14,
        borderWidth: 1,
        marginTop: 4,
    },
    rescheduleCtaText: {
        fontSize: 15,
        fontWeight: '700',
    },
    ctaStack: {
        marginTop: SPACING.tight,
        gap: SPACING.compact,
        width: '100%',
    },
    primaryButton: {
        width: '100%',
        minHeight: 52,
        borderRadius: RADIUS.lg,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SPACING.base,
        paddingVertical: SPACING.compact,
    },
    primaryButtonLabel: {
        ...TYPOGRAPHY.headline,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    outlineButton: {
        width: '100%',
        minHeight: 52,
        borderRadius: RADIUS.lg,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SPACING.base,
        paddingVertical: SPACING.compact,
    },
    outlineButtonLabel: {
        ...TYPOGRAPHY.headline,
        fontWeight: '600',
    },
    footnote: {
        fontSize: 12,
        lineHeight: 17,
        textAlign: 'center',
        marginTop: 2,
    },
});
