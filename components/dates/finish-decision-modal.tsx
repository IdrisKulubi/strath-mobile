import React, { useCallback, useEffect, useState } from 'react';
import {
    Modal,
    Pressable,
    StyleSheet,
    View,
    ActivityIndicator,
} from 'react-native';
import Animated, { FadeIn, SlideInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';

import { Text } from '@/components/ui/text';
import { CachedImage } from '@/components/ui/cached-image';
import { useToast } from '@/components/ui/toast';
import { useTheme } from '@/hooks/use-theme';
import { useVibeCheck } from '@/hooks/use-vibe-check';
import type { MutualDate } from '@/hooks/use-date-requests';

interface FinishDecisionModalProps {
    visible: boolean;
    mutualDate: MutualDate | null;
    onClose: () => void;
}

function partnerStatusLabel(mutualDate: MutualDate | null): string {
    if (!mutualDate) return '';
    switch (mutualDate.partnerDecision) {
        case 'meet':
            return `${mutualDate.withUser.firstName} said meet — your turn.`;
        case 'pass':
            return `${mutualDate.withUser.firstName} passed.`;
        default:
            return `${mutualDate.withUser.firstName} hasn't decided yet.`;
    }
}

function partnerStatusIcon(
    mutualDate: MutualDate | null,
): { name: keyof typeof Ionicons.glyphMap; color: string } {
    switch (mutualDate?.partnerDecision) {
        case 'meet':
            return { name: 'heart', color: '#10b981' };
        case 'pass':
            return { name: 'close-circle-outline', color: '#94a3b8' };
        default:
            return { name: 'time-outline', color: '#f59e0b' };
    }
}

export function FinishDecisionModal({
    visible,
    mutualDate,
    onClose,
}: FinishDecisionModalProps) {
    const { colors, isDark } = useTheme();
    const toast = useToast();
    const qc = useQueryClient();

    const matchId = mutualDate?.legacyMatchId ?? '';
    const vibeCheckId = mutualDate?.vibeCheckId ?? '';

    const {
        submitDecisionAsync,
        isSubmittingDecision,
        submitDecisionError,
        isSubmitDecisionError,
        resetSubmitDecision,
    } = useVibeCheck(matchId, vibeCheckId);

    const [pending, setPending] = useState<'meet' | 'pass' | null>(null);

    useEffect(() => {
        if (!visible) {
            setPending(null);
            resetSubmitDecision();
        }
    }, [visible, resetSubmitDecision]);

    const handleSubmit = useCallback(
        async (decision: 'meet' | 'pass') => {
            if (!vibeCheckId) {
                toast.show({ message: 'Decision link is no longer available.', variant: 'danger' });
                return;
            }
            setPending(decision);
            Haptics.impactAsync(
                decision === 'meet'
                    ? Haptics.ImpactFeedbackStyle.Medium
                    : Haptics.ImpactFeedbackStyle.Light,
            );
            try {
                const result = await submitDecisionAsync({ vibeCheckId, decision });
                qc.invalidateQueries({ queryKey: ['mutualDates'] });

                if (result.bothAgreedToMeet) {
                    toast.show({
                        message: `It's a match — we'll arrange your date with ${mutualDate?.withUser.firstName ?? 'them'}.`,
                        variant: 'success',
                    });
                } else if (result.bothDecided) {
                    toast.show({
                        message: `Decision saved. We'll keep matching you with new people.`,
                        variant: 'default',
                    });
                } else {
                    toast.show({
                        message:
                            decision === 'meet'
                                ? `Saved. We'll let you know when ${mutualDate?.withUser.firstName ?? 'they'} respond.`
                                : 'Decision saved.',
                        variant: 'default',
                    });
                }
                onClose();
            } catch {
                // Mutation error surfaces inline below; keep modal open for Retry.
            }
        },
        [vibeCheckId, submitDecisionAsync, qc, toast, mutualDate?.withUser.firstName, onClose],
    );

    if (!mutualDate) return null;

    const sheetBg = isDark ? '#1a0d2e' : '#ffffff';
    const handleColor = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)';
    const partnerStatus = partnerStatusLabel(mutualDate);
    const partnerIcon = partnerStatusIcon(mutualDate);

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Animated.View entering={FadeIn.duration(180)} style={styles.backdrop}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
                <Animated.View
                    entering={SlideInUp.duration(260)}
                    style={[styles.sheet, { backgroundColor: sheetBg }]}
                >
                    <View style={[styles.handle, { backgroundColor: handleColor }]} />

                    <View style={styles.partnerRow}>
                        <View style={[styles.avatarRing, { borderColor: colors.primary }]}>
                            {mutualDate.withUser.profilePhoto ? (
                                <CachedImage
                                    uri={mutualDate.withUser.profilePhoto}
                                    style={styles.avatar}
                                    fallbackType="avatar"
                                />
                            ) : (
                                <View
                                    style={[
                                        styles.avatar,
                                        styles.avatarFallback,
                                        { backgroundColor: colors.muted },
                                    ]}
                                >
                                    <Ionicons name="person" size={28} color={colors.mutedForeground} />
                                </View>
                            )}
                        </View>
                        <View style={styles.partnerMeta}>
                            <Text style={[styles.partnerName, { color: colors.foreground }]}>
                                {mutualDate.withUser.firstName}
                            </Text>
                            <View style={styles.partnerStatusRow}>
                                <Ionicons name={partnerIcon.name} size={14} color={partnerIcon.color} />
                                <Text
                                    style={[styles.partnerStatus, { color: colors.mutedForeground }]}
                                    numberOfLines={2}
                                >
                                    {partnerStatus}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <Text style={[styles.title, { color: colors.foreground }]}>
                        Finish your decision
                    </Text>
                    <Text style={[styles.body, { color: colors.mutedForeground }]}>
                        After your vibe call you didn&apos;t finish the meet/pass step. Tell us now —
                        you can still match if you both choose meet.
                    </Text>

                    <View style={styles.actions}>
                        <Pressable
                            accessibilityRole="button"
                            disabled={isSubmittingDecision}
                            onPress={() => handleSubmit('meet')}
                            style={({ pressed }) => [
                                styles.primaryBtn,
                                {
                                    backgroundColor: colors.primary,
                                    opacity: isSubmittingDecision ? 0.7 : pressed ? 0.92 : 1,
                                },
                            ]}
                        >
                            {isSubmittingDecision && pending === 'meet' ? (
                                <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                                <Text style={styles.primaryBtnText}>Yes, I want to meet</Text>
                            )}
                        </Pressable>

                        <Pressable
                            accessibilityRole="button"
                            disabled={isSubmittingDecision}
                            onPress={() => handleSubmit('pass')}
                            style={({ pressed }) => [
                                styles.ghostBtn,
                                {
                                    borderColor: colors.border,
                                    backgroundColor: isDark
                                        ? 'rgba(255,255,255,0.06)'
                                        : 'rgba(0,0,0,0.04)',
                                    opacity: isSubmittingDecision ? 0.5 : pressed ? 0.9 : 1,
                                },
                            ]}
                        >
                            {isSubmittingDecision && pending === 'pass' ? (
                                <ActivityIndicator size="small" color={colors.mutedForeground} />
                            ) : (
                                <Text style={[styles.ghostBtnText, { color: colors.mutedForeground }]}>
                                    Not really
                                </Text>
                            )}
                        </Pressable>

                        {isSubmitDecisionError && pending && !isSubmittingDecision && (
                            <View style={styles.errorBlock}>
                                <Text style={[styles.errorText, { color: '#f43f5e' }]}>
                                    {submitDecisionError instanceof Error
                                        ? submitDecisionError.message
                                        : "Couldn't save your choice."}
                                </Text>
                                <Pressable
                                    onPress={() => handleSubmit(pending)}
                                    style={[styles.retryPill, { borderColor: colors.primary }]}
                                >
                                    <Ionicons name="refresh" size={14} color={colors.primary} />
                                    <Text style={[styles.retryText, { color: colors.primary }]}>
                                        Retry
                                    </Text>
                                </Pressable>
                            </View>
                        )}

                        <Pressable
                            accessibilityRole="button"
                            onPress={onClose}
                            style={styles.dismissBtn}
                        >
                            <Text
                                style={[styles.dismissText, { color: colors.mutedForeground }]}
                            >
                                Decide later
                            </Text>
                        </Pressable>
                    </View>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
}

const AVATAR_SIZE = 56;

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: 32,
    },
    handle: {
        width: 44,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 18,
    },
    partnerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        marginBottom: 18,
    },
    avatarRing: {
        width: AVATAR_SIZE + 4,
        height: AVATAR_SIZE + 4,
        borderRadius: (AVATAR_SIZE + 4) / 2,
        borderWidth: 2,
        padding: 1,
        overflow: 'hidden',
    },
    avatar: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        borderRadius: AVATAR_SIZE / 2,
    },
    avatarFallback: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    partnerMeta: {
        flex: 1,
        gap: 4,
    },
    partnerName: {
        fontSize: 17,
        fontWeight: '700',
    },
    partnerStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    partnerStatus: {
        flex: 1,
        fontSize: 13,
        lineHeight: 18,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        letterSpacing: -0.2,
        marginBottom: 6,
    },
    body: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 18,
    },
    actions: {
        gap: 10,
    },
    primaryBtn: {
        borderRadius: 16,
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 52,
    },
    primaryBtnText: {
        color: '#ffffff',
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
    errorBlock: {
        marginTop: 4,
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
    dismissBtn: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    dismissText: {
        fontSize: 13,
        fontWeight: '500',
    },
});
