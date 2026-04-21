import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, Modal, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn, SlideInUp } from 'react-native-reanimated';
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

    const copy = useMemo(() => buildCopy(hold), [hold]);

    const handleCancel = (reason: MatchHoldCancelReason, notes?: string) => {
        cancel.mutate(
            { mutualMatchId: hold.mutualMatchId, reason, notes: notes ?? null },
            {
                onSuccess: () => {
                    toast.show({
                        message: 'Cancelled — Home will reopen for new intros.',
                        variant: 'success',
                    });
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

    const cardBorder = isDark ? 'rgba(233,30,140,0.3)' : 'rgba(233,30,140,0.22)';
    const cardBg = isDark ? 'rgba(45,27,71,0.55)' : '#ffffff';
    const glow = isDark
        ? (['rgba(233,30,140,0.4)', 'rgba(147,51,234,0.18)'] as const)
        : (['rgba(233,30,140,0.18)', 'rgba(233,30,140,0.04)'] as const);

    return (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.outer}>
            <View style={[styles.card, { borderColor: cardBorder, backgroundColor: cardBg }]}>
                <LinearGradient
                    colors={glow}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                />

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
                        <View style={[styles.avatarWrap, { borderColor: cardBorder }]}>
                            {hold.partner.profilePhoto ? (
                                <CachedImage uri={hold.partner.profilePhoto} style={styles.avatar} />
                            ) : (
                                <LinearGradient
                                    colors={['#ec4899', '#f43f5e']}
                                    style={styles.avatarFallback}
                                >
                                    <Text style={styles.avatarFallbackText}>
                                        {partnerName.charAt(0).toUpperCase()}
                                    </Text>
                                </LinearGradient>
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

                    {(hold.scheduledAt || hold.venueName) && (
                        <View style={[styles.detailsBlock, { borderColor: cardBorder }]}>
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
                    )}

                    <View style={styles.ctaStack}>
                        {copy.primaryCta ? (
                            <Pressable
                                accessibilityRole="button"
                                onPress={() => {
                                    if (copy.primaryCta?.kind === 'feedback' && hold.dateMatchId) {
                                        router.push({
                                            pathname: '/feedback/[dateId]',
                                            params: {
                                                dateId: hold.dateMatchId,
                                                name: partnerName,
                                            },
                                        });
                                    } else {
                                        router.push('/(tabs)/dates');
                                    }
                                }}
                                style={({ pressed }) => [
                                    styles.primaryCta,
                                    { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 },
                                ]}
                            >
                                <Text style={[styles.primaryCtaLabel, { color: colors.primaryForeground }]}>
                                    {copy.primaryCta.label}
                                </Text>
                                <Ionicons name="arrow-forward" size={18} color={colors.primaryForeground} />
                            </Pressable>
                        ) : null}

                        <Pressable
                            accessibilityRole="button"
                            onPress={() => setShowCancel(true)}
                            style={({ pressed }) => [
                                styles.secondaryCta,
                                { borderColor: cardBorder, opacity: pressed ? 0.85 : 1 },
                            ]}
                        >
                            <Text style={[styles.secondaryCtaLabel, { color: colors.foreground }]}>
                                {hold.status === 'completed_pending_feedback'
                                    ? 'Mark as not interested'
                                    : 'Cancel — keep matching me'}
                            </Text>
                        </Pressable>
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
                onClose={() => setShowCancel(false)}
                onConfirm={handleCancel}
            />
        </Animated.View>
    );
}

interface CancelHoldSheetProps {
    visible: boolean;
    partnerName: string;
    isSubmitting: boolean;
    onClose: () => void;
    onConfirm: (reason: MatchHoldCancelReason, notes?: string) => void;
}

const REASONS: { id: MatchHoldCancelReason; label: string }[] = [
    { id: 'no_longer_interested', label: 'No longer interested' },
    { id: 'scheduling_conflict', label: 'Scheduling conflict' },
    { id: 'safety_concern', label: 'Safety concern' },
    { id: 'other', label: 'Other' },
];

function CancelHoldSheet({
    visible,
    partnerName,
    isSubmitting,
    onClose,
    onConfirm,
}: CancelHoldSheetProps) {
    const { colors, isDark } = useTheme();
    const [selected, setSelected] = useState<MatchHoldCancelReason | null>(null);

    const sheetBg = isDark ? '#1a0d2e' : '#ffffff';
    const handleColor = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)';

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Animated.View entering={FadeIn.duration(180)} style={styles.modalBackdrop}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
                <Animated.View
                    entering={SlideInUp.duration(260)}
                    style={[styles.sheet, { backgroundColor: sheetBg }]}
                >
                    <View style={[styles.sheetHandle, { backgroundColor: handleColor }]} />
                    <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
                        <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
                            Cancel match with {partnerName}?
                        </Text>
                        <Text style={[styles.sheetSubtitle, { color: colors.mutedForeground }]}>
                            We’ll release you back into matching right away. Help us by telling us why.
                        </Text>

                        <View style={styles.reasonStack}>
                            {REASONS.map((r) => {
                                const isSelected = selected === r.id;
                                return (
                                    <Pressable
                                        key={r.id}
                                        accessibilityRole="radio"
                                        accessibilityState={{ selected: isSelected }}
                                        onPress={() => setSelected(r.id)}
                                        style={({ pressed }) => [
                                            styles.reasonRow,
                                            {
                                                borderColor: isSelected ? colors.primary : colors.border,
                                                backgroundColor: isSelected
                                                    ? isDark
                                                        ? 'rgba(233,30,140,0.18)'
                                                        : 'rgba(233,30,140,0.08)'
                                                    : 'transparent',
                                                opacity: pressed ? 0.85 : 1,
                                            },
                                        ]}
                                    >
                                        <View
                                            style={[
                                                styles.radioOuter,
                                                { borderColor: isSelected ? colors.primary : colors.border },
                                            ]}
                                        >
                                            {isSelected ? (
                                                <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
                                            ) : null}
                                        </View>
                                        <Text style={[styles.reasonLabel, { color: colors.foreground }]}>
                                            {r.label}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>

                        <View style={styles.sheetActions}>
                            <Pressable
                                accessibilityRole="button"
                                onPress={onClose}
                                style={({ pressed }) => [
                                    styles.sheetSecondary,
                                    { borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
                                ]}
                            >
                                <Text style={[styles.sheetSecondaryLabel, { color: colors.foreground }]}>
                                    Keep my match
                                </Text>
                            </Pressable>
                            <Pressable
                                accessibilityRole="button"
                                disabled={!selected || isSubmitting}
                                onPress={() => selected && onConfirm(selected)}
                                style={({ pressed }) => [
                                    styles.sheetPrimary,
                                    {
                                        backgroundColor: colors.primary,
                                        opacity: !selected || isSubmitting ? 0.55 : pressed ? 0.9 : 1,
                                    },
                                ]}
                            >
                                <Text style={[styles.sheetPrimaryLabel, { color: colors.primaryForeground }]}>
                                    {isSubmitting ? 'Cancelling…' : 'Confirm cancel'}
                                </Text>
                            </Pressable>
                        </View>
                    </ScrollView>
                </Animated.View>
            </Animated.View>
        </Modal>
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

function buildCopy(hold: MatchHold): HoldCopy {
    const name = hold.partner.firstName ?? 'them';
    switch (hold.status) {
        case 'mutual':
            return {
                statusLabel: 'Mutual match',
                statusIcon: 'sparkles',
                title: `You and ${name} both said yes`,
                subtitle:
                    'We’re lining up your date. New intros are paused so you can focus on this — we’ll notify you the moment your date is set.',
                footnote: 'You can cancel any time and we’ll keep matching you.',
                primaryCta: { label: 'View in Dates', kind: 'view' },
            };
        case 'call_pending':
            return {
                statusLabel: 'Vibe call pending',
                statusIcon: 'call-outline',
                title: `Vibe call with ${name}`,
                subtitle:
                    'You’ve got a quick vibe call coming up. New intros are paused so you can give this match your full attention.',
                footnote: 'Open Dates to see call details.',
                primaryCta: { label: 'Open Dates', kind: 'view' },
            };
        case 'being_arranged':
            return {
                statusLabel: 'Arranging your date',
                statusIcon: 'sparkles',
                title: `Setting up your date with ${name}`,
                subtitle:
                    'We’re working with you both to pick a time and venue. Hang tight — new intros are on pause.',
                footnote: 'You’ll get a push notification once it’s confirmed.',
                primaryCta: { label: 'See arrangement', kind: 'view' },
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
        return d.toLocaleString(undefined, {
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
        borderRadius: 28,
        borderWidth: 1,
        overflow: 'hidden',
    },
    content: {
        paddingHorizontal: 22,
        paddingVertical: 24,
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
        color: '#fff',
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
        borderWidth: StyleSheet.hairlineWidth,
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
    ctaStack: {
        marginTop: 4,
        gap: 10,
    },
    primaryCta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 16,
    },
    primaryCtaLabel: {
        fontSize: 16,
        fontWeight: '700',
    },
    secondaryCta: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 14,
        borderWidth: 1,
        alignItems: 'center',
    },
    secondaryCtaLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    footnote: {
        fontSize: 12,
        lineHeight: 17,
        textAlign: 'center',
        marginTop: 2,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        maxHeight: '80%',
    },
    sheetHandle: {
        width: 44,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 10,
    },
    sheetContent: {
        paddingHorizontal: 22,
        paddingTop: 18,
        paddingBottom: 32,
        gap: 14,
    },
    sheetTitle: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    sheetSubtitle: {
        fontSize: 14,
        lineHeight: 20,
    },
    reasonStack: {
        marginTop: 6,
        gap: 10,
    },
    reasonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1,
    },
    radioOuter: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    reasonLabel: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
    },
    sheetActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 12,
    },
    sheetSecondary: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1,
        alignItems: 'center',
    },
    sheetSecondaryLabel: {
        fontSize: 15,
        fontWeight: '700',
    },
    sheetPrimary: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
    },
    sheetPrimaryLabel: {
        fontSize: 15,
        fontWeight: '700',
    },
});
