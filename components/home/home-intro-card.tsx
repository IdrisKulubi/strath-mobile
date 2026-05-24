import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text as RNText, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { CachedImage } from '@/components/ui/cached-image';
import { RADIUS, SPACING } from '@/lib/design-tokens';
import { useTheme } from '@/hooks/use-theme';

const VERIFIED_BLUE = '#2F80ED';
const PRIMARY_FALLBACK = '#B8327A';
const SCRIM_LABEL = '#FFFFFF';

export type HomeIntroDecision = 'pending' | 'open_to_meet' | 'passed';

export interface HomeIntroCardData {
    id: string;
    photo?: string | null;
    firstName: string;
    age?: number | null;
    identityLine: string;
    reason: string;
    decision?: HomeIntroDecision;
}

interface HomeIntroCardProps {
    data: HomeIntroCardData;
    height: number;
    onPhotoPress: () => void;
    onInterested: () => void;
    onPass: () => void;
    actionsDisabled?: boolean;
}

export function HomeIntroCard({
    data,
    height,
    onPhotoPress,
    onInterested,
    onPass,
    actionsDisabled = false,
}: HomeIntroCardProps) {
    const { colors } = useTheme();
    const hasDecision = data.decision && data.decision !== 'pending';
    const decisionLabel =
        data.decision === 'open_to_meet'
            ? 'Interested'
            : data.decision === 'passed'
              ? 'Passed'
              : null;

    const primaryFill = colors.primary ?? PRIMARY_FALLBACK;

    const handlePhotoPress = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPhotoPress();
    }, [onPhotoPress]);

    const handleInterested = useCallback(() => {
        if (hasDecision || actionsDisabled) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onInterested();
    }, [actionsDisabled, hasDecision, onInterested]);

    const handlePass = useCallback(() => {
        if (hasDecision || actionsDisabled) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPass();
    }, [actionsDisabled, hasDecision, onPass]);

    return (
        <View
            style={[
                styles.card,
                {
                    height,
                    borderColor: colors.border,
                },
            ]}
        >
            <Pressable
                onPress={handlePhotoPress}
                style={styles.photoPressable}
                accessibilityRole="button"
                accessibilityLabel={`View ${data.firstName}'s profile`}
            >
                {data.photo ? (
                    <CachedImage uri={data.photo} style={styles.photo} contentFit="cover" fallbackType="avatar" />
                ) : (
                    <View style={[styles.photo, styles.placeholder, { backgroundColor: colors.muted }]}>
                        <Ionicons name="person-circle-outline" size={56} color={colors.mutedForeground} />
                    </View>
                )}

                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.78)']}
                    locations={[0, 0.55, 1]}
                    style={styles.scrim}
                    pointerEvents="none"
                />
            </Pressable>

            <View style={styles.overlay} pointerEvents="box-none">
                <Pressable onPress={handlePhotoPress} style={styles.copyTapArea} accessibilityRole="button">
                    <View style={styles.nameRow}>
                        <RNText style={styles.name} numberOfLines={1}>
                            {data.firstName}
                            {data.age != null ? `, ${data.age}` : ''}
                        </RNText>
                        <Ionicons
                            name="checkmark-circle"
                            size={18}
                            color={VERIFIED_BLUE}
                            style={styles.verifiedIcon}
                            accessibilityLabel="Verified profile"
                        />
                    </View>
                    {data.identityLine ? (
                        <RNText style={styles.identity} numberOfLines={1}>
                            {data.identityLine}
                        </RNText>
                    ) : null}
                    {data.reason ? (
                        <RNText style={styles.reason} numberOfLines={1}>
                            {data.reason}
                        </RNText>
                    ) : null}
                </Pressable>

                {hasDecision ? (
                    <View style={styles.decisionPill}>
                        <Ionicons
                            name={data.decision === 'open_to_meet' ? 'heart' : 'checkmark-circle'}
                            size={15}
                            color={SCRIM_LABEL}
                        />
                        <RNText style={styles.decisionText}>{decisionLabel}</RNText>
                    </View>
                ) : (
                    <View style={styles.actionRow}>
                        <Pressable
                            onPress={handleInterested}
                            disabled={actionsDisabled}
                            style={({ pressed }) => [
                                styles.actionPill,
                                styles.interestedPill,
                                {
                                    borderColor: primaryFill,
                                    opacity: pressed || actionsDisabled ? 0.85 : 1,
                                },
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel="Interested"
                        >
                            <RNText style={[styles.actionLabel, { color: primaryFill }]}>
                                Interested
                            </RNText>
                        </Pressable>

                        <Pressable
                            onPress={handlePass}
                            disabled={actionsDisabled}
                            style={({ pressed }) => [
                                styles.actionPill,
                                styles.passPill,
                                {
                                    borderColor: primaryFill,
                                    opacity: pressed || actionsDisabled ? 0.85 : 1,
                                },
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel="Pass"
                        >
                            <RNText style={[styles.actionLabel, { color: primaryFill }]}>Pass</RNText>
                        </Pressable>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: RADIUS.xl,
        borderWidth: 1,
        overflow: 'hidden',
        backgroundColor: '#1C1524',
    },
    photoPressable: {
        ...StyleSheet.absoluteFillObject,
    },
    photo: {
        width: '100%',
        height: '100%',
    },
    placeholder: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrim: {
        ...StyleSheet.absoluteFillObject,
    },
    overlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: SPACING.base,
        paddingBottom: SPACING.base,
        gap: SPACING.compact,
    },
    copyTapArea: {
        gap: 3,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        maxWidth: '100%',
    },
    name: {
        flexShrink: 1,
        color: SCRIM_LABEL,
        fontSize: 20,
        lineHeight: 24,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    verifiedIcon: {
        flexShrink: 0,
    },
    identity: {
        color: 'rgba(255,255,255,0.88)',
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '500',
    },
    reason: {
        color: 'rgba(255,255,255,0.75)',
        fontSize: 13,
        lineHeight: 18,
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        marginTop: SPACING.tight,
    },
    actionPill: {
        height: 44,
        borderRadius: RADIUS.full,
        borderWidth: 1.5,
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    interestedPill: {
        minWidth: 132,
    },
    passPill: {
        minWidth: 96,
    },
    actionLabel: {
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.1,
    },
    decisionPill: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: SPACING.tight,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: RADIUS.full,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.35)',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    decisionText: {
        color: SCRIM_LABEL,
        fontSize: 14,
        fontWeight: '600',
    },
});
