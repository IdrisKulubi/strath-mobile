import React, { useMemo } from 'react';
import {
    View,
    StyleSheet,
    Pressable,
    Modal,
    ScrollView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { CachedImage } from '@/components/ui/cached-image';
import { useTheme } from '@/hooks/use-theme';
import { AgentMatch } from '@/hooks/use-agent';
import { X, ChatCircle, GraduationCap, Sparkle, UserCircle } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';

interface WingmanMatchDetailProps {
    visible: boolean;
    match: AgentMatch | null;
    isConnecting?: boolean;
    onClose: () => void;
    onConnect: (match: AgentMatch, introMessage: string) => Promise<void>;
}

function toPercent(value: number) {
    return Math.max(0, Math.min(100, Math.round(value)));
}

export function WingmanMatchDetail({
    visible,
    match,
    isConnecting = false,
    onClose,
    onConnect,
}: WingmanMatchDetailProps) {
    const { colors, colorScheme } = useTheme();
    const isDark = colorScheme === 'dark';

    const photos = useMemo(() => {
        if (!match) return [];
        const all = [match.profile.profilePhoto, ...(match.profile.photos || [])].filter(Boolean) as string[];
        return [...new Set(all)];
    }, [match]);

    const compatibility = useMemo(() => {
        if (!match) {
            return { personality: 0, lifestyle: 0, interests: 0 };
        }

        const personality = toPercent(match.scores.vector);
        const lifestyle = toPercent(match.scores.preference);
        const interests = toPercent(match.explanation.matchPercentage);

        return { personality, lifestyle, interests };
    }, [match]);

    const reasons = useMemo(() => {
        if (!match) return [];

        const items = [
            match.explanation.tagline,
            match.explanation.summary,
            ...(match.profile.interests || []).slice(0, 2).map((interest) => `Shared interest: ${interest}`),
            match.profile.course ? `Academic vibe alignment: ${match.profile.course}` : null,
        ].filter(Boolean) as string[];

        return [...new Set(items)].slice(0, 6);
    }, [match]);

    const starters = useMemo(() => {
        if (!match) return [];
        const items = match.explanation.conversationStarters || [];
        return items.slice(0, 3);
    }, [match]);

    const handleConnect = async () => {
        if (!match) return;

        const autoStarter = starters[0] || `Hey ${match.profile.firstName || ''}, Wingman thought we'd vibe ✨`;
        const messageToSend = autoStarter;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            await onConnect(match, messageToSend);
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Failed to connect';
            Alert.alert('Connect failed', msg);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View style={styles.backdrop}>
                <View style={[styles.container, {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                }]}
                >
                    <View style={[styles.header, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.title, { color: colors.foreground }]}>Match Details</Text>
                        <Pressable
                            onPress={onClose}
                            style={[styles.closeButton, {
                                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                            }]}
                        >
                            <X size={18} color={colors.foreground} />
                        </Pressable>
                    </View>

                    {!match ? null : (
                        <>
                            <ScrollView contentContainerStyle={styles.content}>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photosRow}>
                                    {photos.length > 0 ? photos.map((photo, index) => (
                                        <CachedImage key={`${photo}-${index}`} uri={photo} style={styles.photo} />
                                    )) : (
                                        <View style={[styles.placeholderPhoto, {
                                            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                                        }]}
                                        >
                                            <UserCircle size={44} color={colors.mutedForeground} />
                                        </View>
                                    )}
                                </ScrollView>

                                <View style={styles.nameRow}>
                                    <Text style={[styles.name, { color: colors.foreground }]}>
                                        {match.profile.firstName || 'Someone'}{match.profile.age ? `, ${match.profile.age}` : ''}
                                    </Text>
                                    <View style={[styles.matchPct, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                                        <Sparkle size={12} color="#10b981" weight="fill" />
                                        <Text style={[styles.matchPctText, { color: '#10b981' }]}>
                                            {toPercent(match.explanation.matchPercentage)}%
                                        </Text>
                                    </View>
                                </View>

                                {(match.profile.course || match.profile.yearOfStudy) && (
                                    <View style={styles.metaRow}>
                                        <GraduationCap size={14} color={colors.mutedForeground} />
                                        <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                                            {match.profile.course || 'Student'}{match.profile.yearOfStudy ? ` · Year ${match.profile.yearOfStudy}` : ''}
                                        </Text>
                                    </View>
                                )}

                                <View style={styles.section}>
                                    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Personality Summary</Text>
                                    <Text style={[styles.sectionText, { color: colors.mutedForeground }]}>
                                        {match.profile.personalitySummary || match.explanation.summary}
                                    </Text>
                                </View>

                                <View style={styles.section}>
                                    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Compatibility Breakdown</Text>
                                    <View style={styles.breakdownRow}>
                                        <Text style={[styles.breakdownLabel, { color: colors.mutedForeground }]}>Personality</Text>
                                        <Text style={[styles.breakdownValue, { color: colors.foreground }]}>{compatibility.personality}%</Text>
                                    </View>
                                    <View style={styles.breakdownRow}>
                                        <Text style={[styles.breakdownLabel, { color: colors.mutedForeground }]}>Lifestyle</Text>
                                        <Text style={[styles.breakdownValue, { color: colors.foreground }]}>{compatibility.lifestyle}%</Text>
                                    </View>
                                    <View style={styles.breakdownRow}>
                                        <Text style={[styles.breakdownLabel, { color: colors.mutedForeground }]}>Interests</Text>
                                        <Text style={[styles.breakdownValue, { color: colors.foreground }]}>{compatibility.interests}%</Text>
                                    </View>
                                </View>

                                <View style={styles.section}>
                                    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Why You Matched</Text>
                                    {reasons.map((reason, index) => (
                                        <Text key={`${reason}-${index}`} style={[styles.bulletText, { color: colors.mutedForeground }]}>
                                            • {reason}
                                        </Text>
                                    ))}
                                </View>

                                <View style={styles.section}>
                                    <View style={styles.sectionTitleRow}>
                                        <ChatCircle size={14} color={colors.primary} weight="fill" />
                                        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Conversation Starters</Text>
                                    </View>
                                    {starters.length > 0 ? starters.map((starter, index) => (
                                        <View
                                            key={`${starter}-${index}`}
                                            style={[styles.starterChip, {
                                                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                                borderColor: colors.border,
                                            }]}
                                        >
                                            <Text style={[styles.starterText, { color: colors.foreground }]}>
                                                “{starter}”
                                            </Text>
                                        </View>
                                    )) : (
                                        <Text style={[styles.sectionText, { color: colors.mutedForeground }]}>No starters yet.</Text>
                                    )}
                                </View>
                            </ScrollView>

                            <View style={[styles.footer, { borderTopColor: colors.border }]}>
                                <Pressable
                                    onPress={handleConnect}
                                    disabled={isConnecting}
                                    style={[styles.connectButton, { opacity: isConnecting ? 0.7 : 1 }]}
                                >
                                    {isConnecting ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text style={styles.connectButtonText}>Connect</Text>
                                    )}
                                </Pressable>
                            </View>
                        </>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    container: {
        height: '88%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderWidth: 1,
        borderBottomWidth: 0,
    },
    header: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        padding: 16,
        gap: 14,
        paddingBottom: 32,
    },
    photosRow: {
        gap: 10,
        paddingBottom: 4,
    },
    photo: {
        width: 180,
        height: 220,
        borderRadius: 16,
    },
    placeholderPhoto: {
        width: 180,
        height: 220,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    name: {
        fontSize: 24,
        fontWeight: '700',
        flexShrink: 1,
    },
    matchPct: {
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    matchPctText: {
        fontSize: 12,
        fontWeight: '700',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metaText: {
        fontSize: 13,
        fontWeight: '500',
    },
    section: {
        gap: 8,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
    },
    sectionText: {
        fontSize: 14,
        lineHeight: 20,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    breakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 2,
    },
    breakdownLabel: {
        fontSize: 14,
    },
    breakdownValue: {
        fontSize: 14,
        fontWeight: '700',
    },
    bulletText: {
        fontSize: 14,
        lineHeight: 20,
    },
    starterChip: {
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    starterText: {
        fontSize: 13,
        lineHeight: 18,
    },
    footer: {
        borderTopWidth: 1,
        padding: 14,
    },
    connectButton: {
        backgroundColor: '#ec4899',
        borderRadius: 14,
        paddingVertical: 13,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 46,
    },
    connectButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
});
