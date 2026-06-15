import React from 'react';
import { Modal, StyleSheet, Text as RNText, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { CachedImage } from '@/components/ui/cached-image';
import { useTheme } from '@/hooks/use-theme';
import { useMeetupSlotConfirmController } from '@/hooks/use-meetup-slot-confirm-controller';
import { MeetupSlotConfirmContent } from '@/components/dates/meetup-slot-confirm';
import { ConfirmMatchWhySection } from '@/components/dates/confirm-match-why-section';
import {
    getConfirmMatchHeaderSubtitle,
    getGhostSafetyLine,
    mapPaymentPhaseToHeaderPhase,
} from '@/lib/confirmation-copy';
import { SPACING, RADIUS, TYPOGRAPHY } from '@/lib/design-tokens';
import type { MatchHold } from '@/hooks/use-daily-matches';

interface MeetupSlotConfirmModalProps {
    visible: boolean;
    hold: MatchHold;
    onCancelHold?: () => void;
}

export function MeetupSlotConfirmModal({
    visible,
    hold,
    onCancelHold,
}: MeetupSlotConfirmModalProps) {
    const { colors } = useTheme();
    const partnerName = hold.partner.firstName ?? 'your match';
    const slot = hold.slotConfirmation;

    const controller = useMeetupSlotConfirmController({
        mutualMatchId: hold.mutualMatchId,
        dateMatchId: hold.dateMatchId,
        partnerFirstName: partnerName,
        viewerSlotConfirmed: slot.viewerSlotConfirmed,
        partnerSlotConfirmed: slot.partnerSlotConfirmed,
        confirmWindowOpen: slot.confirmWindowOpen,
    });

    const {
        paymentsEnabled,
        paymentPhase,
        amountLabel,
        canAct,
        showConfirmedState,
        showWhySection,
        showGhostSafetyLine: shouldShowGhostSafetyLine,
        primaryCtaLabel,
        handlePrimaryAction,
    } = controller;

    const headerSubtitle = getConfirmMatchHeaderSubtitle(
        partnerName,
        amountLabel,
        mapPaymentPhaseToHeaderPhase(paymentPhase, paymentsEnabled),
    );

    const showFooterPrimary = !showConfirmedState && canAct;
    const ghostSafetyLine = shouldShowGhostSafetyLine ? getGhostSafetyLine(partnerName) : null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={() => {}}
        >
            <SafeAreaView
                edges={['top', 'bottom', 'left', 'right']}
                style={[styles.screen, { backgroundColor: colors.background }]}
            >
                <View style={styles.main}>
                    <View style={styles.content}>
                        <View style={styles.partnerHero}>
                            <View style={[styles.avatarWrap, { borderColor: colors.border }]}>
                                {hold.partner.profilePhoto ? (
                                    <CachedImage uri={hold.partner.profilePhoto} style={styles.avatar} />
                                ) : (
                                    <View style={[styles.avatarFallback, { backgroundColor: colors.muted }]}>
                                        <Ionicons name="person" size={32} color={colors.mutedForeground} />
                                    </View>
                                )}
                            </View>
                            <Text style={[styles.partnerName, { color: colors.foreground }]}>
                                {partnerName}
                                {hold.partner.age ? `, ${hold.partner.age}` : ''}
                            </Text>
                        </View>

                        <View style={styles.header}>
                            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
                                Confirm your date with {partnerName}
                            </Text>
                            <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
                                {headerSubtitle}
                            </Text>
                        </View>

                        {showWhySection ? (
                            <ConfirmMatchWhySection partnerFirstName={partnerName} layout="modal" variant="flat" />
                        ) : null}

                        <MeetupSlotConfirmContent
                            layout="modal"
                            hidePrimaryCta
                            controller={controller}
                            mutualMatchId={hold.mutualMatchId}
                            dateMatchId={hold.dateMatchId}
                            partnerFirstName={partnerName}
                            scheduledAt={slot.scheduledAt}
                            confirmBy={slot.confirmBy}
                            viewerSlotConfirmed={slot.viewerSlotConfirmed}
                            partnerSlotConfirmed={slot.partnerSlotConfirmed}
                            confirmWindowOpen={slot.confirmWindowOpen}
                            reschedule={slot.reschedule}
                            style={styles.slotBlock}
                        />
                    </View>
                </View>

                <View style={styles.footer}>
                    {showConfirmedState ? (
                        <View
                            style={[
                                styles.confirmedFooter,
                                { borderColor: colors.border, backgroundColor: colors.card },
                            ]}
                        >
                            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                            <RNText style={[styles.confirmedFooterLabel, { color: colors.foreground }]}>
                                You confirmed
                            </RNText>
                        </View>
                    ) : showFooterPrimary ? (
                        <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel={primaryCtaLabel}
                            activeOpacity={0.88}
                            disabled={!canAct}
                            onPress={handlePrimaryAction}
                        >
                            <View
                                style={[
                                    styles.primaryButton,
                                    {
                                        backgroundColor: colors.primary,
                                        borderColor: colors.primary,
                                    },
                                    !canAct && styles.buttonDisabled,
                                ]}
                            >
                                <RNText style={styles.primaryButtonLabel}>{primaryCtaLabel}</RNText>
                            </View>
                        </TouchableOpacity>
                    ) : null}

                    {ghostSafetyLine ? (
                        <RNText style={[styles.ghostSafetyLine, { color: colors.mutedForeground }]}>
                            {ghostSafetyLine}
                        </RNText>
                    ) : null}

                    {onCancelHold ? (
                        <TouchableOpacity
                            onPress={onCancelHold}
                            accessibilityRole="button"
                            accessibilityLabel="Cancel this match"
                            activeOpacity={0.7}
                            style={styles.cancelLinkWrap}
                        >
                            <RNText style={[styles.cancelLink, { color: colors.mutedForeground }]}>
                                Cancel this match
                            </RNText>
                        </TouchableOpacity>
                    ) : null}
                </View>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
    },
    main: {
        flex: 1,
        paddingHorizontal: SPACING.screenX,
        paddingTop: SPACING.compact,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-evenly',
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
        paddingVertical: SPACING.tight,
    },
    slotBlock: {
        marginTop: 0,
    },
    header: {
        alignItems: 'center',
        gap: SPACING.micro,
        paddingHorizontal: SPACING.compact,
    },
    headerTitle: {
        ...TYPOGRAPHY.title,
        textAlign: 'center',
        letterSpacing: -0.3,
        fontWeight: '700',
    },
    headerSubtitle: {
        ...TYPOGRAPHY.caption,
        textAlign: 'center',
        lineHeight: 20,
        maxWidth: 320,
    },
    partnerHero: {
        alignItems: 'center',
        gap: SPACING.micro,
        paddingHorizontal: SPACING.compact,
        width: '100%',
    },
    avatarWrap: {
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
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
    partnerName: {
        ...TYPOGRAPHY.callout,
        fontWeight: '600',
        textAlign: 'center',
    },
    footer: {
        paddingHorizontal: SPACING.screenX,
        paddingTop: SPACING.compact,
        paddingBottom: SPACING.base,
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
        gap: SPACING.tight,
    },
    primaryButton: {
        width: '100%',
        minHeight: 52,
        borderRadius: RADIUS.lg,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SPACING.base,
    },
    primaryButtonLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    buttonDisabled: {
        opacity: 0.45,
    },
    ghostSafetyLine: {
        ...TYPOGRAPHY.caption,
        textAlign: 'center',
        fontWeight: '600',
        lineHeight: 18,
        paddingHorizontal: SPACING.tight,
    },
    confirmedFooter: {
        width: '100%',
        minHeight: 52,
        borderRadius: RADIUS.lg,
        borderWidth: StyleSheet.hairlineWidth,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    confirmedFooterLabel: {
        fontSize: 16,
        fontWeight: '600',
    },
    cancelLinkWrap: {
        alignSelf: 'center',
        paddingVertical: SPACING.micro,
        paddingHorizontal: SPACING.compact,
        minHeight: 44,
        justifyContent: 'center',
    },
    cancelLink: {
        ...TYPOGRAPHY.caption,
        fontWeight: '600',
        textAlign: 'center',
        textDecorationLine: 'underline',
    },
});
