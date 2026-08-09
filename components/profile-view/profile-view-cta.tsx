import React, { useCallback, useState } from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { BlockReportModal } from '@/components/discover/block-report-modal';

export const PROFILE_VIEW_FLOATING_INSET = 156;

interface ProfileViewCtaProps {
    onOpenToMeet: () => void;
    onPass?: () => void;
    disabled?: boolean;
    completed?: boolean;
    label?: string;
    floating?: boolean;
    /** When set, shows Block / Report under the primary CTA (other-user profiles). */
    safetyTarget?: { userId: string; userName: string };
    /** Called after block or report flow completes (e.g. navigate away). */
    onSafetyActionComplete?: () => void;
}

export function ProfileViewCta({
    onOpenToMeet,
    onPass,
    disabled = false,
    completed = false,
    label = 'Interested',
    floating = true,
    safetyTarget,
    onSafetyActionComplete,
}: ProfileViewCtaProps) {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const scale = useSharedValue(1);
    const [blockReportMode, setBlockReportMode] = useState<'block' | 'report' | null>(null);

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePress = useCallback(() => {
        if (disabled || completed) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        scale.value = withSpring(0.94, { damping: 10, stiffness: 300 }, () => {
            scale.value = withSpring(1);
        });
        onOpenToMeet();
    }, [completed, disabled, onOpenToMeet, scale]);

    const scrimColors = isDark
        ? ['rgba(9, 9, 11, 0)', 'rgba(9, 9, 11, 0.82)', colors.background] as const
        : ['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.88)', '#fff'] as const;

    const content = (
        <>
            <Animated.View style={[styles.btnWrap, animStyle]}>
                <Pressable
                    onPress={handlePress}
                    disabled={disabled || completed}
                    style={styles.primaryPressable}
                >
                    <View
                        style={[
                            styles.btn,
                            completed ? styles.btnSent : { backgroundColor: colors.primary },
                            (disabled || completed) && styles.btnDisabled,
                        ]}
                    >
                        <Text style={styles.btnText}>
                            {completed ? 'Decision Saved ✓' : label}
                        </Text>
                    </View>
                </Pressable>
            </Animated.View>

            {safetyTarget ? (
                <View style={styles.safetyRow}>
                    <Pressable
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            setBlockReportMode('block');
                        }}
                        style={styles.safetyPressable}
                    >
                        {({ pressed }) => (
                            <View
                                style={[
                                    styles.safetyBtn,
                                    {
                                        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                                        borderColor: colors.border,
                                        opacity: pressed ? 0.88 : 1,
                                    },
                                ]}
                            >
                                <Text style={[styles.safetyBtnText, { color: colors.foreground }]}>Block</Text>
                            </View>
                        )}
                    </Pressable>
                    <Pressable
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            setBlockReportMode('report');
                        }}
                        style={styles.safetyPressable}
                    >
                        {({ pressed }) => (
                            <View
                                style={[
                                    styles.safetyBtn,
                                    {
                                        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                                        borderColor: colors.border,
                                        opacity: pressed ? 0.88 : 1,
                                    },
                                ]}
                            >
                                <Text style={[styles.safetyBtnText, { color: '#FF3B30' }]}>Report</Text>
                            </View>
                        )}
                    </Pressable>
                </View>
            ) : null}

            {onPass && !completed && !disabled ? (
                <Pressable onPress={onPass} style={styles.passPressable}>
                    <Text style={[styles.passText, { color: colors.mutedForeground }]}>
                        Pass
                    </Text>
                </Pressable>
            ) : null}
        </>
    );

    const modal = safetyTarget && blockReportMode ? (
        <BlockReportModal
            visible={!!blockReportMode}
            mode={blockReportMode}
            userId={safetyTarget.userId}
            userName={safetyTarget.userName}
            onClose={() => setBlockReportMode(null)}
            onSuccess={() => {
                setBlockReportMode(null);
                onSafetyActionComplete?.();
            }}
            onSwitchMode={() =>
                setBlockReportMode((m) => (m === 'block' ? 'report' : 'block'))
            }
        />
    ) : null;

    if (!floating) {
        return (
            <View
                style={[
                    styles.staticContainer,
                    {
                        backgroundColor: isDark ? colors.background : '#fff',
                        borderTopColor: colors.border,
                    },
                ]}
            >
                {content}
                {modal}
            </View>
        );
    }

    return (
        <>
            <View
                pointerEvents="box-none"
                style={[
                    styles.floatingHost,
                    { paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 12 : 16) },
                ]}
            >
                <LinearGradient
                    pointerEvents="none"
                    colors={[...scrimColors]}
                    locations={[0, 0.42, 1]}
                    style={styles.floatingScrim}
                />
                <View style={styles.floatingContent}>
                    {content}
                </View>
            </View>
            {modal}
        </>
    );
}

const styles = StyleSheet.create({
    staticContainer: {
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 32 : 16,
        borderTopWidth: 1,
    },
    floatingHost: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
    },
    floatingScrim: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 220,
    },
    floatingContent: {
        paddingHorizontal: 20,
        paddingTop: 28,
        gap: 10,
    },
    btnWrap: {
        width: '100%',
    },
    primaryPressable: {
        width: '100%',
    },
    safetyRow: {
        flexDirection: 'row',
        gap: 10,
        width: '100%',
    },
    safetyPressable: {
        flex: 1,
    },
    safetyBtn: {
        minHeight: 44,
        borderRadius: 14,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 11,
    },
    safetyBtnText: {
        fontSize: 14,
        fontWeight: '700',
    },
    passPressable: {
        alignItems: 'center',
        paddingVertical: 4,
    },
    passText: {
        fontSize: 14,
        fontWeight: '600',
    },
    btn: {
        minHeight: 54,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
    },
    btnSent: {
        backgroundColor: '#10b981',
    },
    btnDisabled: {
        opacity: 0.65,
    },
    btnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});
