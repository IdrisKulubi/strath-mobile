import React, { useCallback } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    FadeInDown,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/ui/text';
import { CachedImage } from '@/components/ui/cached-image';
import { useTheme } from '@/hooks/use-theme';
import { DateRequest, VIBE_EMOJIS, VIBE_LABELS } from '@/hooks/use-date-requests';

interface IncomingRequestCardProps {
    request: DateRequest;
    index: number;
    onAccept: (requestId: string) => void;
    onDecline: (requestId: string) => void;
    isResponding?: boolean;
}

function UserCircleFallback({ size, color }: { size: number; color: string }) {
    return <Ionicons name="person-circle-outline" size={size} color={color} />;
}

export function IncomingRequestCard({
    request,
    index,
    onAccept,
    onDecline,
    isResponding = false,
}: IncomingRequestCardProps) {
    const { colors, colorScheme } = useTheme();
    const isDark = colorScheme === 'dark';

    const acceptScale = useSharedValue(1);
    const declineScale = useSharedValue(1);

    const acceptAnimStyle = useAnimatedStyle(() => ({
        transform: [{ scale: acceptScale.value }],
    }));
    const declineAnimStyle = useAnimatedStyle(() => ({
        transform: [{ scale: declineScale.value }],
    }));

    const handleAccept = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        acceptScale.value = withSpring(0.94, { damping: 10, stiffness: 300 }, () => {
            acceptScale.value = withSpring(1);
        });
        onAccept(request.id);
    }, [acceptScale, onAccept, request.id]);

    const handleDecline = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        declineScale.value = withTiming(0.94, { duration: 80 }, () => {
            declineScale.value = withSpring(1);
        });
        onDecline(request.id);
    }, [declineScale, onDecline, request.id]);

    const { fromUser, vibe, message } = request;

    return (
        <Animated.View
            entering={FadeInDown.delay(index * 80).springify().damping(14)}
            style={[
                styles.card,
                {
                    backgroundColor: isDark ? colors.card : '#fff',
                    borderColor: colors.border,
                },
            ]}
        >
            {/* Header row */}
            <View style={styles.headerRow}>
                <View style={[styles.avatarWrap, { backgroundColor: colors.muted }]}>
                    {fromUser.profilePhoto ? (
                        <CachedImage uri={fromUser.profilePhoto} style={styles.avatar} />
                    ) : (
                        <UserCircleFallback size={56} color={colors.mutedForeground} />
                    )}
                </View>

                <View style={styles.nameBlock}>
                    <Text style={[styles.name, { color: colors.foreground }]}>
                        {fromUser.firstName}{fromUser.age ? `, ${fromUser.age}` : ''}
                    </Text>
                    {fromUser.compatibilityScore !== undefined && (
                        <View style={styles.compatRow}>
                            <Ionicons name="sparkles" size={12} color="#10b981" />
                            <Text style={styles.compatText}>
                                {fromUser.compatibilityScore}% compatible
                            </Text>
                        </View>
                    )}
                    <View style={styles.vibeChip}>
                        <Text style={[styles.vibeText, { color: colors.mutedForeground }]}>
                            {VIBE_EMOJIS[vibe]} {VIBE_LABELS[vibe]}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Compatibility reasons */}
            {fromUser.compatibilityReasons && fromUser.compatibilityReasons.length > 0 && (
                <View style={[styles.reasonsBlock, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: colors.border }]}>
                    <Text style={[styles.reasonsLabel, { color: colors.mutedForeground }]}>Why you might match</Text>
                    {fromUser.compatibilityReasons.map((reason, i) => (
                        <Text key={i} style={[styles.reasonText, { color: colors.foreground }]}>
                            • {reason}
                        </Text>
                    ))}
                </View>
            )}

            {/* Optional message */}
            {message ? (
                <View style={[styles.messageBlock, { backgroundColor: isDark ? 'rgba(233,30,140,0.08)' : 'rgba(233,30,140,0.06)', borderColor: colors.primary + '30' }]}>
                    <Text style={[styles.messageText, { color: colors.foreground }]}>"{message}"</Text>
                </View>
            ) : null}

            {/* Actions */}
            <View style={styles.actionsRow}>
                <Animated.View style={[styles.actionBtn, acceptAnimStyle]}>
                    <Pressable
                        onPress={handleAccept}
                        disabled={isResponding}
                        style={[styles.acceptBtn, { opacity: isResponding ? 0.65 : 1 }]}
                    >
                        {isResponding ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.acceptBtnText}>Accept Invite 💜</Text>
                        )}
                    </Pressable>
                </Animated.View>

                <Animated.View style={[styles.actionBtnSmall, declineAnimStyle]}>
                    <Pressable
                        onPress={handleDecline}
                        disabled={isResponding}
                        style={[
                            styles.declineBtn,
                            {
                                borderColor: colors.border,
                                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                opacity: isResponding ? 0.5 : 1,
                            },
                        ]}
                    >
                        <Text style={[styles.declineBtnText, { color: colors.mutedForeground }]}>Pass</Text>
                    </Pressable>
                </Animated.View>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 16,
        gap: 12,
        marginHorizontal: 16,
        marginBottom: 12,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatarWrap: {
        width: 64,
        height: 64,
        borderRadius: 32,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
    },
    nameBlock: {
        flex: 1,
        gap: 4,
    },
    name: {
        fontSize: 18,
        fontWeight: '700',
    },
    compatRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    compatText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#10b981',
    },
    vibeChip: {
        alignSelf: 'flex-start',
    },
    vibeText: {
        fontSize: 13,
        fontWeight: '500',
    },
    reasonsBlock: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 12,
        gap: 4,
    },
    reasonsLabel: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    reasonText: {
        fontSize: 13,
        lineHeight: 18,
    },
    messageBlock: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 12,
    },
    messageText: {
        fontSize: 14,
        lineHeight: 20,
        fontStyle: 'italic',
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 2,
    },
    actionBtn: {
        flex: 1,
    },
    actionBtnSmall: {
        width: 80,
    },
    acceptBtn: {
        backgroundColor: '#e91e8c',
        borderRadius: 14,
        paddingVertical: 13,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 46,
    },
    acceptBtnText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    declineBtn: {
        borderRadius: 14,
        borderWidth: 1,
        paddingVertical: 13,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 46,
    },
    declineBtnText: {
        fontSize: 14,
        fontWeight: '600',
    },
});
