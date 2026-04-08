import React, { useCallback, useState } from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { BlockReportModal } from '@/components/discover/block-report-modal';

interface ProfileViewCtaProps {
    onOpenToMeet: () => void;
    onPass?: () => void;
    disabled?: boolean;
    completed?: boolean;
    label?: string;
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
    label = 'Open to Meet',
    safetyTarget,
    onSafetyActionComplete,
}: ProfileViewCtaProps) {
    const { colors, isDark } = useTheme();
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

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: isDark ? colors.background : '#fff',
                    borderTopColor: colors.border,
                },
            ]}
        >
            <Animated.View style={[styles.btnWrap, animStyle]}>
                <Pressable
                    onPress={handlePress}
                    disabled={disabled || completed}
                    style={[
                        styles.btn,
                        completed
                            ? styles.btnSent
                            : { backgroundColor: colors.primary },
                        (disabled || completed) && styles.btnDisabled,
                    ]}
                >
                    <Text style={styles.btnText}>
                        {completed ? 'Decision Saved ✓' : label}
                    </Text>
                </Pressable>
            </Animated.View>

            {safetyTarget ? (
                <View style={styles.safetyRow}>
                    <Pressable
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            setBlockReportMode('block');
                        }}
                        style={({ pressed }) => [
                            styles.safetyBtn,
                            {
                                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                                borderColor: colors.border,
                                opacity: pressed ? 0.88 : 1,
                            },
                        ]}
                    >
                        <Text style={[styles.safetyBtnText, { color: colors.foreground }]}>Block</Text>
                    </Pressable>
                    <Pressable
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            setBlockReportMode('report');
                        }}
                        style={({ pressed }) => [
                            styles.safetyBtn,
                            {
                                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                                borderColor: colors.border,
                                opacity: pressed ? 0.88 : 1,
                            },
                        ]}
                    >
                        <Text style={[styles.safetyBtnText, { color: '#FF3B30' }]}>Report</Text>
                    </Pressable>
                </View>
            ) : null}

            {onPass && !completed && !disabled && (
                <Pressable onPress={onPass} style={styles.passWrap}>
                    <Text style={[styles.passText, { color: colors.mutedForeground }]}>
                        Pass
                    </Text>
                </Pressable>
            )}

            {safetyTarget && blockReportMode ? (
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
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 32 : 16,
        borderTopWidth: 1,
    },
    btnWrap: {
        width: '100%',
    },
    safetyRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 12,
        width: '100%',
    },
    safetyBtn: {
        flex: 1,
        borderRadius: 14,
        borderWidth: 1,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 46,
    },
    safetyBtnText: {
        fontSize: 14,
        fontWeight: '700',
    },
    passWrap: {
        alignItems: 'center',
        paddingVertical: 12,
        marginTop: 4,
    },
    passText: {
        fontSize: 14,
        fontWeight: '600',
    },
    btn: {
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 54,
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
