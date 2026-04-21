import React, { forwardRef, useCallback, useEffect, useMemo, useRef } from 'react';
import {
    ActivityIndicator,
    Linking,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import BottomSheet, {
    BottomSheetBackdrop,
    BottomSheetView,
} from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/hooks/use-theme';
import { useToast } from '@/components/ui/toast';
import { syncPurchasesForRestore } from '@/lib/revenuecat';
import { useDateCoordinationPayment } from '@/hooks/use-date-coordination-payment';

/**
 * Paywall shown after both users confirm post-call that they still want to
 * meet. Matches the copy/structure in `docs/payment.md` §3 step 6.
 *
 * Two primary CTAs:
 *   - Pay KES 200 via native IAP sheet (RevenueCat).
 *   - Use existing StrathSpace credit (one tap, no store sheet).
 *
 * Secondary affordances:
 *   - Restore Purchases (required by Apple, useful for re-sync after crashes).
 *   - Terms / Privacy links.
 *   - "Not anymore" implicitly = closing the sheet; backend treats dismissal
 *     without payment as still-pending. Explicit cancellation is a separate
 *     action the caller can wire up.
 */

interface DateCoordinationPaywallProps {
    dateMatchId: string | null;
    /** Display name of the other person — used in subtext. */
    partnerName?: string | null;
    onClose?: () => void;
    onPaid?: () => void;
}

const SNAP_POINTS = ['82%'] as const;

const TERMS_URL = 'https://www.strathspace.com/legal/terms';
const PRIVACY_URL = 'https://www.strathspace.com/legal/privacy';

const DateCoordinationPaywall = forwardRef<BottomSheet, DateCoordinationPaywallProps>(
    ({ dateMatchId, partnerName, onClose, onPaid }, ref) => {
        const { isDark } = useTheme();
        const toast = useToast();
        const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

        const {
            status,
            displayPrice,
            canUseCredit,
            creditBalanceCents,
            isLoading,
            isPackageLoading,
            isPackageAvailable,
            pay,
            isPaying,
            paymentSucceeded,
            redeemCredit,
            isRedeeming,
            redemptionSucceeded,
            error,
            isUserCancelled,
            isRevenueCatUnavailable,
        } = useDateCoordinationPayment(dateMatchId, {
            enabled: !!dateMatchId,
            onPaid: () => {
                onPaid?.();
                if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
                closeTimerRef.current = setTimeout(() => onClose?.(), 900);
            },
        });

        const renderBackdrop = useCallback(
            (props: any) => (
                <BottomSheetBackdrop
                    {...props}
                    disappearsOnIndex={-1}
                    appearsOnIndex={0}
                    opacity={0.7}
                    pressBehavior="close"
                />
            ),
            []
        );

        const showSurfacedError = useCallback(() => {
            if (isUserCancelled) return;
            if (!error) return;

            const message = isRevenueCatUnavailable
                ? 'Payments are temporarily unavailable. Please try again in a moment.'
                : error instanceof Error
                    ? error.message
                    : 'Something went wrong. Please try again.';

            toast.show({ message, variant: 'danger' });
        }, [error, isRevenueCatUnavailable, isUserCancelled, toast]);

        useEffect(() => {
            showSurfacedError();
        }, [showSurfacedError]);

        useEffect(() => {
            return () => {
                if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
            };
        }, []);

        const handlePay = useCallback(() => {
            if (isPaying || isRedeeming || !isPackageAvailable) return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            pay();
        }, [isPaying, isRedeeming, isPackageAvailable, pay]);

        const handleUseCredit = useCallback(() => {
            if (isPaying || isRedeeming || !canUseCredit) return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            redeemCredit();
        }, [isPaying, isRedeeming, canUseCredit, redeemCredit]);

        const handleRestorePurchases = useCallback(async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const info = await syncPurchasesForRestore();
            if (info) {
                toast.show({
                    message: 'Purchases synced.',
                    variant: 'success',
                });
            } else {
                toast.show({
                    message: 'Could not reach the store. Check your connection.',
                    variant: 'warning',
                });
            }
        }, [toast]);

        const handleOpenLink = useCallback((url: string) => {
            Linking.openURL(url).catch(() => {
                toast.show({ message: 'Could not open link.', variant: 'danger' });
            });
        }, [toast]);

        const priceLabel = displayPrice ?? 'KES 200';
        const subtextName = partnerName ? ` with ${partnerName}` : '';

        const includes = useMemo(
            () => [
                { icon: 'people-circle-outline', text: 'Date coordination by our team' },
                { icon: 'checkmark-done-outline', text: 'Confirmation with both of you' },
                { icon: 'notifications-outline', text: 'Pre-date reminder' },
                { icon: 'chatbubble-ellipses-outline', text: 'Follow-up support' },
            ],
            []
        );

        const showSuccessState = paymentSucceeded || redemptionSucceeded;
        const showPendingPartner = status?.state === 'paid_waiting_for_other' && status?.mePaid;

        return (
            <BottomSheet
                ref={ref}
                index={-1}
                snapPoints={SNAP_POINTS as unknown as string[]}
                enablePanDownToClose
                backdropComponent={renderBackdrop}
                handleIndicatorStyle={{
                    backgroundColor: isDark ? '#64748b' : '#cbd5e1',
                    width: 40,
                }}
                backgroundStyle={{ backgroundColor: 'transparent' }}
                onClose={onClose}
                style={styles.bottomSheet}
            >
                <BottomSheetView style={styles.sheetContent}>
                    {isDark ? (
                        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill}>
                            <View
                                style={[
                                    StyleSheet.absoluteFill,
                                    { backgroundColor: 'rgba(15, 23, 42, 0.9)' },
                                ]}
                            />
                        </BlurView>
                    ) : (
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#ffffff' }]} />
                    )}

                    <View style={styles.content}>
                        <View style={styles.header}>
                            <View
                                style={[
                                    styles.heroIcon,
                                    {
                                        backgroundColor: isDark
                                            ? 'rgba(236, 72, 153, 0.18)'
                                            : 'rgba(236, 72, 153, 0.10)',
                                    },
                                ]}
                            >
                                <Ionicons
                                    name="sparkles"
                                    size={28}
                                    color={isDark ? '#f472b6' : '#ec4899'}
                                />
                            </View>
                            <Text
                                style={[styles.title, { color: isDark ? '#fff' : '#1a1a2e' }]}
                            >
                                Confirm your date
                            </Text>
                            <Text
                                style={[
                                    styles.subtext,
                                    { color: isDark ? '#cbd5e1' : '#475569' },
                                ]}
                            >
                                A small commitment fee helps us keep StrathSpace intentional
                                and reduce time-wasters. We arrange the date{subtextName} once
                                both of you confirm.
                            </Text>
                        </View>

                        <View
                            style={[
                                styles.priceCard,
                                {
                                    backgroundColor: isDark
                                        ? 'rgba(255, 255, 255, 0.06)'
                                        : 'rgba(15, 23, 42, 0.04)',
                                    borderColor: isDark
                                        ? 'rgba(255, 255, 255, 0.08)'
                                        : 'rgba(15, 23, 42, 0.06)',
                                },
                            ]}
                        >
                            <View style={styles.priceRow}>
                                <Text
                                    style={[
                                        styles.priceLabel,
                                        { color: isDark ? '#94a3b8' : '#64748b' },
                                    ]}
                                >
                                    Date Coordination Fee
                                </Text>
                                {isPackageLoading && !displayPrice ? (
                                    <ActivityIndicator
                                        size="small"
                                        color={isDark ? '#f472b6' : '#ec4899'}
                                    />
                                ) : (
                                    <Text
                                        style={[
                                            styles.priceValue,
                                            { color: isDark ? '#fff' : '#1a1a2e' },
                                        ]}
                                    >
                                        {priceLabel}
                                    </Text>
                                )}
                            </View>

                            <View style={styles.divider} />

                            <View style={styles.includesList}>
                                {includes.map((item) => (
                                    <View key={item.text} style={styles.includesRow}>
                                        <Ionicons
                                            name={item.icon as any}
                                            size={18}
                                            color={isDark ? '#f472b6' : '#ec4899'}
                                        />
                                        <Text
                                            style={[
                                                styles.includesText,
                                                { color: isDark ? '#e2e8f0' : '#334155' },
                                            ]}
                                        >
                                            {item.text}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {isLoading ? (
                            <View style={styles.loadingBlock}>
                                <ActivityIndicator
                                    size="small"
                                    color={isDark ? '#f472b6' : '#ec4899'}
                                />
                            </View>
                        ) : showSuccessState ? (
                            <View
                                style={[
                                    styles.successBanner,
                                    {
                                        backgroundColor: isDark
                                            ? 'rgba(34, 197, 94, 0.15)'
                                            : 'rgba(34, 197, 94, 0.10)',
                                    },
                                ]}
                            >
                                <Ionicons name="checkmark-circle" size={22} color="#22c55e" />
                                <Text
                                    style={[
                                        styles.successText,
                                        { color: isDark ? '#bbf7d0' : '#166534' },
                                    ]}
                                >
                                    {showPendingPartner
                                        ? "You're confirmed. Waiting for the other person."
                                        : "You're confirmed. We're arranging this one."}
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.ctaStack}>
                                {canUseCredit ? (
                                    <TouchableOpacity
                                        style={styles.primaryCta}
                                        onPress={handleUseCredit}
                                        disabled={isPaying || isRedeeming}
                                        activeOpacity={0.85}
                                    >
                                        <LinearGradient
                                            colors={['#ec4899', '#f43f5e']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={styles.primaryCtaGradient}
                                        >
                                            {isRedeeming ? (
                                                <ActivityIndicator size="small" color="#fff" />
                                            ) : (
                                                <>
                                                    <Ionicons
                                                        name="gift-outline"
                                                        size={20}
                                                        color="#fff"
                                                    />
                                                    <Text style={styles.primaryCtaText}>
                                                        Use credit to confirm
                                                    </Text>
                                                </>
                                            )}
                                        </LinearGradient>
                                    </TouchableOpacity>
                                ) : null}

                                <TouchableOpacity
                                    style={[
                                        canUseCredit ? styles.secondaryCta : styles.primaryCta,
                                        (!isPackageAvailable && !isPackageLoading) &&
                                            styles.ctaDisabled,
                                    ]}
                                    onPress={handlePay}
                                    disabled={
                                        isPaying ||
                                        isRedeeming ||
                                        (!isPackageAvailable && !isPackageLoading)
                                    }
                                    activeOpacity={0.85}
                                >
                                    {canUseCredit ? (
                                        <View
                                            style={[
                                                styles.secondaryCtaInner,
                                                {
                                                    borderColor: isDark
                                                        ? 'rgba(255, 255, 255, 0.2)'
                                                        : 'rgba(15, 23, 42, 0.2)',
                                                },
                                            ]}
                                        >
                                            {isPaying ? (
                                                <ActivityIndicator
                                                    size="small"
                                                    color={isDark ? '#f472b6' : '#ec4899'}
                                                />
                                            ) : (
                                                <Text
                                                    style={[
                                                        styles.secondaryCtaText,
                                                        { color: isDark ? '#f472b6' : '#ec4899' },
                                                    ]}
                                                >
                                                    Pay {priceLabel} instead
                                                </Text>
                                            )}
                                        </View>
                                    ) : (
                                        <LinearGradient
                                            colors={['#ec4899', '#f43f5e']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={styles.primaryCtaGradient}
                                        >
                                            {isPaying ? (
                                                <ActivityIndicator size="small" color="#fff" />
                                            ) : (
                                                <>
                                                    <Ionicons
                                                        name="lock-closed-outline"
                                                        size={20}
                                                        color="#fff"
                                                    />
                                                    <Text style={styles.primaryCtaText}>
                                                        Pay {priceLabel} to confirm
                                                    </Text>
                                                </>
                                            )}
                                        </LinearGradient>
                                    )}
                                </TouchableOpacity>

                                {canUseCredit ? (
                                    <Text
                                        style={[
                                            styles.creditNote,
                                            { color: isDark ? '#94a3b8' : '#64748b' },
                                        ]}
                                    >
                                        You have {formatKesCents(creditBalanceCents)} in
                                        StrathSpace credit.
                                    </Text>
                                ) : null}
                            </View>
                        )}

                        <View style={styles.footer}>
                            <TouchableOpacity
                                onPress={handleRestorePurchases}
                                activeOpacity={0.7}
                                style={styles.footerLink}
                            >
                                <Text
                                    style={[
                                        styles.footerLinkText,
                                        { color: isDark ? '#94a3b8' : '#64748b' },
                                    ]}
                                >
                                    Restore Purchases
                                </Text>
                            </TouchableOpacity>
                            <Text style={styles.footerDot}>·</Text>
                            <TouchableOpacity
                                onPress={() => handleOpenLink(TERMS_URL)}
                                activeOpacity={0.7}
                                style={styles.footerLink}
                            >
                                <Text
                                    style={[
                                        styles.footerLinkText,
                                        { color: isDark ? '#94a3b8' : '#64748b' },
                                    ]}
                                >
                                    Terms
                                </Text>
                            </TouchableOpacity>
                            <Text style={styles.footerDot}>·</Text>
                            <TouchableOpacity
                                onPress={() => handleOpenLink(PRIVACY_URL)}
                                activeOpacity={0.7}
                                style={styles.footerLink}
                            >
                                <Text
                                    style={[
                                        styles.footerLinkText,
                                        { color: isDark ? '#94a3b8' : '#64748b' },
                                    ]}
                                >
                                    Privacy
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </BottomSheetView>
            </BottomSheet>
        );
    }
);

DateCoordinationPaywall.displayName = 'DateCoordinationPaywall';

function formatKesCents(cents: number): string {
    const shillings = Math.round(cents / 100);
    return `KES ${shillings.toLocaleString('en-KE')}`;
}

const styles = StyleSheet.create({
    bottomSheet: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 16,
    },
    sheetContent: {
        flex: 1,
        overflow: 'hidden',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: 32,
    },
    header: {
        alignItems: 'center',
        marginBottom: 20,
    },
    heroIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtext: {
        fontSize: 15,
        lineHeight: 22,
        textAlign: 'center',
        paddingHorizontal: 8,
    },
    priceCard: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 20,
        marginBottom: 20,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    priceLabel: {
        fontSize: 14,
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    priceValue: {
        fontSize: 22,
        fontWeight: '800',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(127, 127, 127, 0.15)',
        marginVertical: 16,
    },
    includesList: {
        gap: 10,
    },
    includesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    includesText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
        lineHeight: 19,
    },
    loadingBlock: {
        height: 54,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ctaStack: {
        gap: 12,
    },
    primaryCta: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#ec4899',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 8,
    },
    primaryCtaGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        gap: 10,
    },
    primaryCtaText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
    },
    secondaryCta: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    secondaryCtaInner: {
        borderWidth: 1.5,
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryCtaText: {
        fontSize: 15,
        fontWeight: '700',
    },
    ctaDisabled: {
        opacity: 0.5,
    },
    creditNote: {
        textAlign: 'center',
        fontSize: 12,
        fontWeight: '500',
        marginTop: 4,
    },
    successBanner: {
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    successText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
        gap: 6,
    },
    footerLink: {
        padding: 4,
    },
    footerLinkText: {
        fontSize: 12,
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
    footerDot: {
        color: '#94a3b8',
        fontSize: 12,
    },
});

export default DateCoordinationPaywall;
