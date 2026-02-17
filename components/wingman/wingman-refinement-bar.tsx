import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, TextInput, ActivityIndicator } from 'react-native';
import Animated, {
    FadeIn,
    FadeInDown,
    FadeOut,
    FadeOutUp,
    useSharedValue,
    useAnimatedStyle,
    withSequence,
    withSpring,
} from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { CaretDown, CaretUp, FunnelSimple, PaperPlaneRight, Waveform } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

interface WingmanRefinementBarProps {
    currentQuery: string | null;
    onRefine: (refinement: string) => void;
    isLoading?: boolean;
    refinementHints?: string[];
}

function getDefaultRefinements(currentQuery: string | null): string[] {
    const base = [
        'more introverted',
        'closer to campus',
        'older by 1-2 years',
        'more ambitious',
        'more chill',
        'more into fitness',
    ];

    if (!currentQuery) return base.slice(0, 4);

    const lower = currentQuery.toLowerCase();
    return base.filter(item => !lower.includes(item.split(' ')[1])).slice(0, 4);
}

export function WingmanRefinementBar({
    currentQuery,
    onRefine,
    isLoading = false,
    refinementHints,
}: WingmanRefinementBarProps) {
    const { colors, isDark } = useTheme();
    const [customRefine, setCustomRefine] = useState('');
    const [activeChip, setActiveChip] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const chipScale = useSharedValue(1);

    const quickRefinements = useMemo(() => {
        if (refinementHints && refinementHints.length > 0) {
            return refinementHints.slice(0, 4);
        }
        return getDefaultRefinements(currentQuery);
    }, [currentQuery, refinementHints]);

    const handleQuickRefine = (value: string) => {
        if (isLoading) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setActiveChip(value);
        chipScale.value = withSequence(
            withSpring(0.96, { damping: 14, stiffness: 280 }),
            withSpring(1, { damping: 14, stiffness: 280 })
        );
        onRefine(value);
    };

    const handleToggleExpand = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsExpanded((prev) => !prev);
    };

    const handleSubmitCustom = () => {
        const value = customRefine.trim();
        if (!value || isLoading) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onRefine(value);
        setActiveChip(null);
        setCustomRefine('');
    };

    const activeChipStyle = useAnimatedStyle(() => ({
        transform: [{ scale: chipScale.value }],
    }));

    return (
        <View style={styles.container}>
            <Pressable
                onPress={handleToggleExpand}
                style={[styles.headerButton, {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                    borderColor: colors.border,
                }]}
            >
                <View style={styles.headerRow}>
                    <FunnelSimple size={14} color={colors.primary} weight="fill" />
                    <Text style={[styles.title, { color: colors.foreground }]}>Refine your results</Text>
                </View>
                <View style={styles.headerRight}>
                    <Text style={[styles.headerHint, { color: colors.mutedForeground }]}>{isExpanded ? 'Hide' : 'Show'}</Text>
                    {isExpanded ? (
                        <CaretUp size={14} color={colors.mutedForeground} weight="bold" />
                    ) : (
                        <CaretDown size={14} color={colors.mutedForeground} weight="bold" />
                    )}
                </View>
            </Pressable>

            {isExpanded && (
                <Animated.View entering={FadeInDown.duration(180)} exiting={FadeOutUp.duration(130)} style={styles.expandArea}>
                    {isLoading && (
                        <Animated.View entering={FadeIn.duration(140)} exiting={FadeOut.duration(120)} style={styles.refiningRow}>
                            <LinearGradient
                                colors={isDark
                                    ? ['rgba(233,30,140,0.22)', 'rgba(217,70,166,0.28)', 'rgba(233,30,140,0.22)']
                                    : ['rgba(233,30,140,0.12)', 'rgba(217,70,166,0.16)', 'rgba(233,30,140,0.12)']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.refiningPill}
                            >
                                <Waveform size={14} color={colors.primary} weight="fill" />
                                <Text style={[styles.refiningText, { color: colors.primary }]}>Wingman is refining your vibe…</Text>
                            </LinearGradient>
                        </Animated.View>
                    )}

                    <View style={styles.chipsRow}>
                        {quickRefinements.map((item) => (
                            <Animated.View key={item} style={activeChip === item ? activeChipStyle : undefined}>
                                <Pressable
                                    onPress={() => handleQuickRefine(item)}
                                    disabled={isLoading}
                                    style={[styles.chip, {
                                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                        borderColor: activeChip === item ? colors.primary : colors.border,
                                        opacity: isLoading ? 0.6 : 1,
                                    }]}
                                >
                                    <Text style={[styles.chipText, { color: activeChip === item ? colors.primary : colors.foreground }]}>{item}</Text>
                                </Pressable>
                            </Animated.View>
                        ))}
                    </View>

                    <View style={[styles.inputRow, {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                        borderColor: colors.border,
                    }]}
                    >
                        <TextInput
                            value={customRefine}
                            onChangeText={setCustomRefine}
                            placeholder="Custom refinement (e.g. more expressive)"
                            placeholderTextColor={colors.mutedForeground}
                            style={[styles.input, { color: colors.foreground }]}
                            editable={!isLoading}
                            returnKeyType="send"
                            onSubmitEditing={handleSubmitCustom}
                        />
                        <Pressable
                            onPress={handleSubmitCustom}
                            disabled={isLoading || customRefine.trim().length === 0}
                            style={[styles.sendButton, {
                                backgroundColor: colors.primary,
                                opacity: isLoading || customRefine.trim().length === 0 ? 0.45 : 1,
                            }]}
                        >
                            {isLoading ? (
                                <ActivityIndicator size="small" color={colors.primaryForeground} />
                            ) : (
                                <PaperPlaneRight size={14} color={colors.primaryForeground} weight="fill" />
                            )}
                        </Pressable>
                    </View>
                </Animated.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 10,
        marginHorizontal: 16,
        marginBottom: 4,
        gap: 10,
    },
    headerButton: {
        borderWidth: 1,
        borderRadius: 12,
        minHeight: 44,
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    headerHint: {
        fontSize: 11,
        fontWeight: '600',
    },
    expandArea: {
        gap: 10,
    },
    title: {
        fontSize: 13,
        fontWeight: '700',
    },
    refiningRow: {
        width: '100%',
    },
    refiningPill: {
        borderRadius: 999,
        paddingVertical: 7,
        paddingHorizontal: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-start',
    },
    refiningText: {
        fontSize: 12,
        fontWeight: '700',
    },
    chipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 7,
    },
    chipText: {
        fontSize: 12,
        fontWeight: '600',
    },
    inputRow: {
        borderWidth: 1,
        borderRadius: 12,
        paddingLeft: 12,
        paddingRight: 8,
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    input: {
        flex: 1,
        fontSize: 13,
        fontWeight: '500',
        paddingVertical: 8,
    },
    sendButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
