import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/ui/text';
import { CachedImage } from '@/components/ui/cached-image';
import { useTheme } from '@/hooks/use-theme';
import { formatDisplayValue, PROMPT_TITLES } from '@/components/profile-view/profile-view-formatters';

export function InlinePhotoBreak({
    uri,
    label,
    variant = 'full',
    onPhotoPress,
}: {
    uri?: string;
    label: string;
    variant?: 'full' | 'left' | 'right';
    onPhotoPress?: (uri: string) => void;
}) {
    const { colors, isDark } = useTheme();

    if (!uri) return null;

    const isFull = variant === 'full';
    const isRight = variant === 'right';

    return (
        <View
            style={[
                styles.photoBreakWrap,
                !isFull && styles.photoBreakWrapSplit,
                isRight && styles.photoBreakWrapRight,
            ]}
        >
            <View
                style={[
                    styles.photoBreakCard,
                    !isFull && styles.photoBreakCardSplit,
                    isRight && styles.photoBreakCardRight,
                    {
                        backgroundColor: isDark ? colors.card : '#fff',
                        borderColor: colors.border,
                    },
                ]}
            >
                <Pressable style={styles.photoBreakImage} onPress={() => onPhotoPress?.(uri)}>
                    <CachedImage uri={uri} style={styles.photoBreakImage} contentFit="cover" />
                </Pressable>
                <View
                    style={[
                        styles.photoBreakLabel,
                        isRight && styles.photoBreakLabelRight,
                    ]}
                >
                    <Ionicons name="images-outline" size={14} color="#fff" />
                    <Text style={styles.photoBreakLabelText}>{label}</Text>
                </View>
            </View>
        </View>
    );
}

export function ProfileSectionCard({
    children,
}: {
    children: React.ReactNode;
}) {
    const { colors, isDark } = useTheme();

    return (
        <View
            style={[
                styles.sectionCard,
                {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                    borderColor: colors.border,
                },
            ]}
        >
            {children}
        </View>
    );
}

export function PillCollection({
    items,
}: {
    items: string[];
}) {
    const { colors, isDark } = useTheme();

    if (items.length === 0) return null;

    return (
        <View style={styles.pillWrap}>
            {items.map((item, index) => (
                <View
                    key={`${item}-${index}`}
                    style={[
                        styles.inlinePill,
                        {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                            borderColor: colors.border,
                        },
                    ]}
                >
                    <Text style={[styles.inlinePillText, { color: colors.foreground }]}>
                        {item}
                    </Text>
                </View>
            ))}
        </View>
    );
}

export function ProfilePillSection({
    title,
    items,
}: {
    title: string;
    items: string[];
}) {
    const { colors } = useTheme();

    if (items.length === 0) return null;

    return (
        <ProfileSectionCard>
            <View style={styles.subSection}>
                {title ? (
                    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
                ) : null}
                <PillCollection items={items} />
            </View>
        </ProfileSectionCard>
    );
}

export function PromptResponseCard({
    promptId,
    response,
}: {
    promptId: string;
    response: string;
}) {
    const { colors, isDark } = useTheme();
    const title = PROMPT_TITLES[promptId] ?? formatDisplayValue(promptId) ?? 'Prompt';

    return (
        <View
            style={[
                styles.promptCard,
                {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                    borderColor: colors.border,
                },
            ]}
        >
            <Text style={[styles.promptTitle, { color: colors.mutedForeground }]}>
                {title}
            </Text>
            <Text style={[styles.promptResponse, { color: colors.foreground }]}>
                {response}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    sectionCard: {
        borderRadius: 22,
        borderWidth: 1,
        padding: 16,
    },
    subSection: {
        gap: 10,
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: '700',
        letterSpacing: -0.3,
        lineHeight: 28,
    },
    pillWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    inlinePill: {
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    inlinePillText: {
        fontSize: 13,
        fontWeight: '600',
    },
    promptCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 14,
        gap: 8,
    },
    promptTitle: {
        fontSize: 13,
        fontWeight: '600',
    },
    promptResponse: {
        fontSize: 15,
        lineHeight: 22,
    },
    photoBreakWrap: {
        marginTop: -2,
    },
    photoBreakWrapSplit: {
        width: '100%',
    },
    photoBreakWrapRight: {},
    photoBreakCard: {
        height: 480,
        borderRadius: 28,
        borderWidth: 1,
        overflow: 'hidden',
        position: 'relative',
    },
    photoBreakCardSplit: {
        height: 480,
        borderRadius: 28,
    },
    photoBreakCardRight: {
        borderTopRightRadius: 28,
        borderBottomLeftRadius: 28,
    },
    photoBreakImage: {
        width: '100%',
        height: '100%',
    },
    photoBreakLabel: {
        position: 'absolute',
        left: 14,
        bottom: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(0,0,0,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
    },
    photoBreakLabelRight: {
        left: undefined,
        right: 14,
    },
    photoBreakLabelText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
});
