import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { BrainCircuit, ChevronRight } from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import { RADIUS, SPACING } from '@/lib/design-tokens';
import { useTheme } from '@/hooks/use-theme';

interface HomeMatchmakerEntryProps {
    compact?: boolean;
    onPress: () => void;
}

export function HomeMatchmakerEntry({
    compact = false,
    onPress,
}: HomeMatchmakerEntryProps) {
    const { colors, isDark } = useTheme();

    const handlePress = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
    }, [onPress]);

    return (
        <Pressable
            onPress={handlePress}
            style={[
                styles.card,
                compact && styles.cardCompact,
                {
                    backgroundColor: isDark ? colors.card : colors.card,
                    borderColor: colors.border,
                },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Open AI Matchmaker"
        >
            <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
                <BrainCircuit size={compact ? 18 : 20} color={colors.primary} />
            </View>

            <View style={styles.copy}>
                <Text style={[styles.title, compact && styles.titleCompact, { color: colors.foreground }]} numberOfLines={1}>
                    Ask the matchmaker
                </Text>
                <Text style={[styles.subtitle, { color: colors.mutedForeground }]} numberOfLines={compact ? 1 : 2}>
                    Describe who you want. We will search active profiles.
                </Text>
            </View>

            <View style={[styles.action, { backgroundColor: colors.primary }]}>
                <ChevronRight size={18} color={colors.primaryForeground} />
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        minHeight: 78,
        marginHorizontal: SPACING.screenX,
        marginBottom: SPACING.compact,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        paddingHorizontal: SPACING.compact,
        paddingVertical: SPACING.compact,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.compact,
    },
    cardCompact: {
        minHeight: 64,
        marginBottom: SPACING.tight,
        paddingVertical: SPACING.tight,
    },
    iconWrap: {
        width: 44,
        height: 44,
        borderRadius: RADIUS.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    copy: {
        flex: 1,
        minWidth: 0,
    },
    title: {
        fontSize: 16,
        lineHeight: 21,
        fontWeight: '800',
    },
    titleCompact: {
        fontSize: 15,
        lineHeight: 20,
    },
    subtitle: {
        marginTop: 2,
        fontSize: 12,
        lineHeight: 17,
        fontWeight: '500',
    },
    action: {
        width: 34,
        height: 34,
        borderRadius: RADIUS.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
