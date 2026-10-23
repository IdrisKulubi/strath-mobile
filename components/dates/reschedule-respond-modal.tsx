import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    Text as RNText,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/hooks/use-theme';
import { useCancelMatchHold } from '@/hooks/use-daily-matches';
import { useRespondReschedule } from '@/hooks/use-reschedule';
import { useToast } from '@/components/ui/toast';
import { RescheduleSlotPickerSheet } from '@/components/dates/reschedule-slot-picker-sheet';
import { formatConfirmBy, formatMeetupSlot, MEETUP_WINDOWS_COPY } from '@/lib/meetup-slot';
import type { ReschedulePendingState, RescheduleSlotOption } from '@/lib/reschedule-types';
import { Palette, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';

const MAX_COUNTER_PROPOSALS = 3;

export interface RescheduleRespondModalProps {
    visible: boolean;
    mutualMatchId: string;
    partnerFirstName: string;
    pending: ReschedulePendingState;
    onClose: () => void;
}

export function RescheduleRespondModal({
    visible,
    mutualMatchId,
    partnerFirstName,
    pending,
    onClose,
}: RescheduleRespondModalProps) {
    const { isDark, colors } = useTheme();
    const toast = useToast();
    const respond = useRespondReschedule();
    const cancelHold = useCancelMatchHold();
    const [counterMode, setCounterMode] = useState(false);
    const [declineReason, setDeclineReason] = useState('');
    const [pickerVisible, setPickerVisible] = useState(false);

    const t = isDark ? Palette.dark : Palette.light;
    const atCounterCap = pending.counterCount >= MAX_COUNTER_PROPOSALS;

    useEffect(() => {
        if (!visible) {
            setCounterMode(false);
            setDeclineReason('');
            setPickerVisible(false);
        }
    }, [visible]);

    const handleAccept = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        respond.mutate(
            { requestId: pending.requestId, action: 'accept' },
            {
                onSuccess: () => {
                    toast.show({ message: 'Date updated.', variant: 'success' });
                    onClose();
                },
                onError: (error) => {
                    toast.show({
                        message: error instanceof Error ? error.message : 'Could not accept the new time.',
                        variant: 'danger',
                    });
                },
            },
        );
    };

    const handleCounterSelect = (option: RescheduleSlotOption) => {
        const reason = declineReason.trim();
        if (reason.length < 3) {
            toast.show({ message: 'Please share why this time does not work.', variant: 'danger' });
            return;
        }

        respond.mutate(
            {
                requestId: pending.requestId,
                action: 'decline',
                declineReason: reason,
                counterScheduledAt: option.scheduledAt,
            },
            {
                onSuccess: () => {
                    setPickerVisible(false);
                    setCounterMode(false);
                    toast.show({
                        message: `Counter sent to ${partnerFirstName}.`,
                        variant: 'success',
                    });
                    onClose();
                },
                onError: (error) => {
                    toast.show({
                        message:
                            error instanceof Error
                                ? error.message
                                : 'Could not suggest a different time.',
                        variant: 'danger',
                    });
                },
            },
        );
    };

    const handleCancelMatch = () => {
        Alert.alert(
            'Cancel this match?',
            `This will end your match with ${partnerFirstName}.`,
            [
                { text: 'Keep match', style: 'cancel' },
                {
                    text: 'Cancel match',
                    style: 'destructive',
                    onPress: () => {
                        cancelHold.mutate(
                            { mutualMatchId, reason: 'scheduling_conflict', notes: null },
                            {
                                onSuccess: () => {
                                    toast.show({ message: 'Match cancelled.', variant: 'default' });
                                    onClose();
                                },
                                onError: () => {
                                    toast.show({
                                        message: 'Could not cancel the match. Try again.',
                                        variant: 'danger',
                                    });
                                },
                            },
                        );
                    },
                },
            ],
        );
    };

    return (
        <>
            <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
                <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
                    <View style={styles.headerRow}>
                        <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
                            <Ionicons name="close" size={28} color={colors.foreground} />
                        </Pressable>
                    </View>

                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <RNText style={[styles.title, { color: colors.foreground }]}>
                            {partnerFirstName} wants to change your date
                        </RNText>

                        <View style={[styles.slotHero, { backgroundColor: colors.muted }]}>
                            <Ionicons name="calendar-outline" size={22} color={colors.primary} />
                            <RNText style={[styles.slotLabel, { color: colors.foreground }]}>
                                {formatMeetupSlot(pending.proposedScheduledAt)}
                            </RNText>
                        </View>

                        <RNText style={[styles.deadline, { color: colors.mutedForeground }]}>
                            Confirm by {formatConfirmBy(pending.proposedConfirmBy)}
                        </RNText>

                        <RNText style={[styles.venueCopy, { color: colors.mutedForeground }]}>
                            {MEETUP_WINDOWS_COPY}
                        </RNText>

                        {pending.lastDeclineReason ? (
                            <View style={[styles.quoteBlock, { borderColor: colors.border, backgroundColor: `${colors.primary}10` }]}>
                                <RNText style={[styles.quoteLabel, { color: colors.mutedForeground }]}>
                                    They said:
                                </RNText>
                                <RNText style={[styles.quoteText, { color: colors.foreground }]}>
                                    {pending.lastDeclineReason}
                                </RNText>
                            </View>
                        ) : null}

                        {atCounterCap ? (
                            <RNText style={[styles.capCopy, { color: colors.mutedForeground }]}>
                                You&apos;ve gone back and forth a few times. Accept this time or cancel the match.
                            </RNText>
                        ) : null}

                        {counterMode && !atCounterCap ? (
                            <View style={styles.counterForm}>
                                <RNText style={[styles.fieldLabel, { color: colors.foreground }]}>
                                    Why doesn&apos;t this work?
                                </RNText>
                                <TextInput
                                    value={declineReason}
                                    onChangeText={setDeclineReason}
                                    placeholder="e.g. I have class until 4pm"
                                    placeholderTextColor={colors.mutedForeground}
                                    multiline
                                    style={[
                                        styles.reasonInput,
                                        {
                                            color: colors.foreground,
                                            borderColor: colors.border,
                                            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                                        },
                                    ]}
                                />
                                <TouchableOpacity
                                    onPress={() => setPickerVisible(true)}
                                    disabled={declineReason.trim().length < 3}
                                    style={[
                                        styles.secondaryBtn,
                                        {
                                            borderColor: colors.primary,
                                            opacity: declineReason.trim().length < 3 ? 0.45 : 1,
                                        },
                                    ]}
                                >
                                    <RNText style={[styles.secondaryBtnLabel, { color: colors.primary }]}>
                                        Pick a different time
                                    </RNText>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <>
                                <TouchableOpacity
                                    onPress={handleAccept}
                                    disabled={respond.isPending}
                                    style={[styles.primaryBtn, { backgroundColor: t.primary }]}
                                >
                                    {respond.isPending ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <RNText style={styles.primaryBtnLabel}>Accept new time</RNText>
                                    )}
                                </TouchableOpacity>

                                {!atCounterCap ? (
                                    <TouchableOpacity
                                        onPress={() => setCounterMode(true)}
                                        style={[styles.secondaryBtn, { borderColor: colors.primary }]}
                                    >
                                        <RNText style={[styles.secondaryBtnLabel, { color: colors.primary }]}>
                                            Suggest a different time
                                        </RNText>
                                    </TouchableOpacity>
                                ) : null}
                            </>
                        )}

                        <Pressable onPress={handleCancelMatch} style={styles.cancelLink}>
                            <RNText style={[styles.cancelLinkLabel, { color: colors.primary }]}>
                                Cancel this match
                            </RNText>
                        </Pressable>
                    </ScrollView>
                </SafeAreaView>
            </Modal>

            <RescheduleSlotPickerSheet
                visible={pickerVisible}
                mutualMatchId={mutualMatchId}
                title="Suggest a different time"
                confirmLabel="Send counter"
                onClose={() => setPickerVisible(false)}
                onSelect={handleCounterSelect}
            />
        </>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
    },
    headerRow: {
        paddingHorizontal: SPACING.screenX,
        paddingVertical: SPACING.tight,
        alignItems: 'flex-end',
    },
    scrollContent: {
        paddingHorizontal: SPACING.screenX,
        paddingBottom: SPACING.section,
        gap: SPACING.compact,
    },
    title: {
        ...TYPOGRAPHY.display,
        textAlign: 'center',
        marginBottom: SPACING.tight,
    },
    slotHero: {
        alignItems: 'center',
        gap: SPACING.tight,
        paddingVertical: SPACING.section,
        paddingHorizontal: SPACING.base,
        borderRadius: RADIUS.md,
    },
    slotLabel: {
        ...TYPOGRAPHY.title,
        textAlign: 'center',
    },
    deadline: {
        ...TYPOGRAPHY.caption,
        textAlign: 'center',
        fontWeight: '600',
    },
    venueCopy: {
        ...TYPOGRAPHY.caption,
        textAlign: 'center',
    },
    quoteBlock: {
        borderRadius: RADIUS.md,
        borderWidth: StyleSheet.hairlineWidth,
        padding: SPACING.base,
        gap: 4,
    },
    quoteLabel: {
        ...TYPOGRAPHY.caption,
        fontWeight: '600',
    },
    quoteText: {
        ...TYPOGRAPHY.body,
        fontStyle: 'italic',
    },
    capCopy: {
        ...TYPOGRAPHY.caption,
        textAlign: 'center',
        marginVertical: SPACING.tight,
    },
    counterForm: {
        gap: SPACING.compact,
        marginTop: SPACING.compact,
    },
    fieldLabel: {
        ...TYPOGRAPHY.body,
        fontWeight: '600',
    },
    reasonInput: {
        minHeight: 88,
        borderRadius: RADIUS.md,
        borderWidth: StyleSheet.hairlineWidth,
        padding: SPACING.base,
        textAlignVertical: 'top',
        fontSize: 15,
    },
    primaryBtn: {
        minHeight: 52,
        borderRadius: RADIUS.lg,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: SPACING.section,
    },
    primaryBtnLabel: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    secondaryBtn: {
        minHeight: 52,
        borderRadius: RADIUS.lg,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SPACING.base,
    },
    secondaryBtnLabel: {
        fontSize: 16,
        fontWeight: '700',
    },
    cancelLink: {
        alignItems: 'center',
        paddingVertical: SPACING.base,
    },
    cancelLinkLabel: {
        fontSize: 15,
        fontWeight: '600',
    },
});
