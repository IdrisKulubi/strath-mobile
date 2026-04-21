import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';

type PendingDecisionType = 'open_to_meet' | 'passed';

interface PendingDecisionBarProps {
    decision: PendingDecisionType;
    firstName: string;
    expiresAt: number;
    onUndo: () => void;
}

const UNDO_WINDOW_MS = 5000;

export function PendingDecisionBar({
    decision,
    firstName,
    expiresAt,
    onUndo,
}: PendingDecisionBarProps) {
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useTheme();
    const [remainingMs, setRemainingMs] = useState(() => Math.max(0, expiresAt - Date.now()));

    useEffect(() => {
        setRemainingMs(Math.max(0, expiresAt - Date.now()));
        const interval = setInterval(() => {
            setRemainingMs(Math.max(0, expiresAt - Date.now()));
        }, 100);

        return () => {
            clearInterval(interval);
        };
    }, [expiresAt]);

    const progress = useMemo(
        () => Math.max(0, Math.min(1, remainingMs / UNDO_WINDOW_MS)),
        [remainingMs],
    );
    const remainingSeconds = Math.max(1, Math.ceil(remainingMs / 1000));

    const title = decision === 'passed'
        ? `Skipped ${firstName}`
        : `Interest sent to ${firstName}`;
    const subtitle = decision === 'passed'
        ? `Undo in ${remainingSeconds}s`
        : `Undo before this sends in ${remainingSeconds}s`;
    const iconName = decision === 'passed' ? 'play-back' : 'heart';

    return (
        <Animated.View
            entering={FadeInDown.springify().damping(18)}
            exiting={FadeOutDown.duration(180)}
            style={[
                styles.wrap,
                {
                    bottom: Math.max(insets.bottom, 12) + 8,
                },
            ]}
            pointerEvents="box-none"
        >
            <View
                style={[
                    styles.card,
                    {
                        backgroundColor: isDark ? '#1b1527' : '#ffffff',
                        borderColor: colors.border,
                        shadowColor: '#000',
                    },
                ]}
            >
                <View style={styles.row}>
                    <View style={[styles.iconWrap, { backgroundColor: decision === 'passed' ? 'rgba(100,116,139,0.14)' : 'rgba(233,30,140,0.14)' }]}>
                        <Ionicons
                            name={iconName}
                            size={16}
                            color={decision === 'passed' ? '#64748b' : colors.primary}
                        />
                    </View>

                    <View style={styles.textWrap}>
                        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
                            {title}
                        </Text>
                        <Text style={[styles.subtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
                            {subtitle}
                        </Text>
                    </View>

                    <Pressable
                        onPress={onUndo}
                        style={({ pressed }) => [
                            styles.undoBtn,
                            {
                                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)',
                                borderColor: colors.border,
                                opacity: pressed ? 0.72 : 1,
                            },
                        ]}
                    >
                        <Text style={[styles.undoText, { color: colors.foreground }]}>Undo</Text>
                    </Pressable>
                </View>

                <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)' }]}>
                    <View
                        style={[
                            styles.progressFill,
                            {
                                width: `${progress * 100}%`,
                                backgroundColor: decision === 'passed' ? '#64748b' : colors.primary,
                            },
                        ]}
                    />
                </View>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        position: 'absolute',
        left: 16,
        right: 16,
        zIndex: 20,
    },
    card: {
        borderRadius: 20,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingTop: 14,
        paddingBottom: 12,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.16,
        shadowRadius: 20,
        elevation: 12,
        gap: 12,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconWrap: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textWrap: {
        flex: 1,
        gap: 2,
    },
    title: {
        fontSize: 15,
        fontWeight: '700',
    },
    subtitle: {
        fontSize: 12.5,
        fontWeight: '500',
    },
    undoBtn: {
        borderRadius: 14,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 9,
    },
    undoText: {
        fontSize: 13,
        fontWeight: '700',
    },
    progressTrack: {
        height: 4,
        borderRadius: 999,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 999,
    },
});
