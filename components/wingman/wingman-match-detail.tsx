import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View,
    StyleSheet,
    Pressable,
    Modal,
    ScrollView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { CachedImage } from '@/components/ui/cached-image';
import { useTheme } from '@/hooks/use-theme';
import { AgentMatch } from '@/hooks/use-agent';
import { BlockReportModal } from '@/components/discover/block-report-modal';
import { X, ChatCircle, GraduationCap, Sparkle, UserCircle, CaretLeft } from 'phosphor-react-native';
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

function isPlaceholderAvatarUrl(uri: string | null | undefined): boolean {
    if (!uri) return true;
    const u = uri.toLowerCase();
    return (
        u.includes('dicebear.com') ||
        u.includes('ui-avatars.com') ||
        u.includes('robohash.org') ||
        u.includes('pravatar.cc') ||
        u.includes('multiavatar.com') ||
        u.includes('boringavatars.com')
    );
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
    const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
    const [showFullProfile, setShowFullProfile] = useState(false);
    const [blockReportMode, setBlockReportMode] = useState<'block' | 'report' | null>(null);
    const translateY = useSharedValue(0);

    const photos = useMemo(() => {
        if (!match) return [];
        const all = [match.profile.profilePhoto, ...(match.profile.photos || [])]
            .filter(Boolean)
            .filter((p) => !isPlaceholderAvatarUrl(p as string)) as string[];
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

    const profile = match?.profile;

    const profileCards = useMemo(() => {
        if (!profile) return [] as { title: string; chips?: string[]; text?: string; prompts?: { promptId: string; response: string }[] }[];

        const aboutMe = profile.aboutMe || profile.bio || profile.personalitySummary || null;

        const aboutChips = [
            profile.gender,
            profile.zodiacSign,
            profile.drinkingPreference,
            profile.smoking,
            profile.religion,
            profile.education,
            profile.height,
        ].filter(Boolean) as string[];

        const lookingForChips = [
            profile.lookingFor,
            profile.communicationStyle,
            profile.loveLanguage,
            profile.personalityType,
            profile.sleepingHabits,
            profile.workoutFrequency,
            profile.socialMediaUsage,
            profile.politics,
        ].filter(Boolean) as string[];

        const cards: { title: string; chips?: string[]; text?: string; prompts?: { promptId: string; response: string }[] }[] = [];

        if (aboutMe || aboutChips.length > 0) {
            cards.push({ title: 'About me', text: aboutMe || undefined, chips: aboutChips });
        }

        if (lookingForChips.length > 0) {
            cards.push({ title: "I'm looking for", chips: lookingForChips });
        }

        if ((profile.interests || []).length > 0) {
            cards.push({ title: 'Interests', chips: profile.interests || [] });
        }

        if ((profile.qualities || []).length > 0) {
            cards.push({ title: 'Qualities', chips: profile.qualities || [] });
        }

        if ((profile.languages || []).length > 0) {
            cards.push({ title: 'Languages', chips: profile.languages || [] });
        }

        if ((profile.prompts || []).length > 0) {
            cards.push({ title: 'Prompts', prompts: profile.prompts || [] });
        }

        return cards;
    }, [profile]);

    const fullProfileBlocks = useMemo(() => {
        const blocks: { type: 'photo' | 'card'; photo?: string; card?: { title: string; chips?: string[]; text?: string; prompts?: { promptId: string; response: string }[] } }[] = [];

        if (photos.length === 0 && profileCards.length === 0) {
            return blocks;
        }

        let photoIndex = 0;

        if (photos.length > 0) {
            blocks.push({ type: 'photo', photo: photos[photoIndex++] });
        }

        profileCards.forEach((card) => {
            blocks.push({ type: 'card', card });
            if (photoIndex < photos.length) {
                blocks.push({ type: 'photo', photo: photos[photoIndex++] });
            }
        });

        while (photoIndex < photos.length) {
            blocks.push({ type: 'photo', photo: photos[photoIndex++] });
        }

        return blocks;
    }, [photos, profileCards]);

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

    const handleOpenPhoto = useCallback((photoUri: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedPhoto(photoUri);
    }, []);

    const handleClosePhoto = useCallback(() => {
        setSelectedPhoto(null);
    }, []);

    const closeModal = useCallback(() => {
        onClose();
    }, [onClose]);

    const openFullProfile = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowFullProfile(true);
    }, []);

    const closeFullProfile = useCallback(() => {
        setShowFullProfile(false);
    }, []);

    const animateClose = useCallback(() => {
        translateY.value = withTiming(900, { duration: 220 }, () => {
            runOnJS(closeModal)();
        });
    }, [closeModal, translateY]);

    useEffect(() => {
        if (visible) {
            translateY.value = 0;
        } else {
            setBlockReportMode(null);
            setShowFullProfile(false);
        }
    }, [translateY, visible]);

    const dragToCloseGesture = Gesture.Pan()
        .activeOffsetY(8)
        .failOffsetX([-20, 20])
        .onUpdate((event) => {
            if (event.translationY > 0) {
                translateY.value = event.translationY;
            }
        })
        .onEnd((event) => {
            const shouldClose = event.translationY > 120 || event.velocityY > 900;
            if (shouldClose) {
                translateY.value = withTiming(900, { duration: 220 }, () => {
                    runOnJS(closeModal)();
                });
                return;
            }

            translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
        });

    const sheetAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    const backdropAnimatedStyle = useAnimatedStyle(() => ({
        opacity: interpolate(translateY.value, [0, 500], [1, 0.45]),
    }));

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={animateClose}
        >
            <Animated.View style={[styles.backdrop, backdropAnimatedStyle]}>
                <Animated.View
                    style={[styles.container, {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                    }, sheetAnimatedStyle]}
                >
                    <GestureDetector gesture={dragToCloseGesture}>
                        <View style={[styles.header, { borderBottomColor: colors.border }]}>
                            <View style={[styles.dragHandle, {
                                backgroundColor: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.18)',
                            }]} />
                            <Text style={[styles.title, { color: colors.foreground }]}>Match Details</Text>
                            <Pressable
                                onPress={animateClose}
                                style={[styles.closeButton, {
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                                }]}
                            >
                                <X size={18} color={colors.foreground} />
                            </Pressable>
                        </View>
                    </GestureDetector>

                    {!match ? null : (
                        <>
                            <ScrollView contentContainerStyle={styles.content}>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photosRow}>
                                    {photos.length > 0 ? photos.map((photo, index) => (
                                        <Pressable key={`${photo}-${index}`} onPress={() => handleOpenPhoto(photo)}>
                                            <CachedImage uri={photo} style={styles.photo} />
                                        </Pressable>
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

                                    {/* Safety actions */}
                                    <View style={styles.safetyRow}>
                                        <Pressable
                                            onPress={() => {
                                                if (!match) return;
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                                setBlockReportMode('block');
                                            }}
                                            style={({ pressed }) => ([
                                                styles.safetyBtn,
                                                {
                                                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                                                    borderColor: colors.border,
                                                    opacity: pressed ? 0.85 : 1,
                                                },
                                            ])}
                                        >
                                            <Text style={[styles.safetyBtnText, { color: colors.foreground }]}>Block</Text>
                                        </Pressable>

                                        <Pressable
                                            onPress={() => {
                                                if (!match) return;
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                                setBlockReportMode('report');
                                            }}
                                            style={({ pressed }) => ([
                                                styles.safetyBtn,
                                                {
                                                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                                                    borderColor: colors.border,
                                                    opacity: pressed ? 0.85 : 1,
                                                },
                                            ])}
                                        >
                                            <Text style={[styles.safetyBtnText, { color: '#FF3B30' }]}>Report</Text>
                                        </Pressable>
                                    </View>
                                </View>
                            </ScrollView>

                            <View style={[styles.footer, { borderTopColor: colors.border }]}>
                                <View style={styles.footerRow}>
                                    <Pressable
                                        onPress={handleConnect}
                                        disabled={isConnecting}
                                        style={[styles.connectButton, styles.footerButton, { opacity: isConnecting ? 0.7 : 1 }]}
                                    >
                                        {isConnecting ? (
                                            <ActivityIndicator size="small" color="#fff" />
                                        ) : (
                                            <Text style={styles.connectButtonText}>Connect</Text>
                                        )}
                                    </Pressable>

                                    <Pressable
                                        onPress={openFullProfile}
                                        style={[
                                            styles.viewProfileButton,
                                            styles.footerButton,
                                            {
                                                borderColor: colors.border,
                                                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                            },
                                        ]}
                                    >
                                        <Text style={[styles.viewProfileButtonText, { color: colors.foreground }]}>View Profile</Text>
                                    </Pressable>
                                </View>
                            </View>
                        </>
                    )}
                </Animated.View>
            </Animated.View>

            <Modal
                visible={showFullProfile}
                animationType="slide"
                onRequestClose={closeFullProfile}
            >
                <View style={[styles.fullProfileScreen, { backgroundColor: colors.background }]}> 
                    <View style={[styles.fullProfileHeader, { borderBottomColor: colors.border }]}> 
                        <Pressable
                            onPress={closeFullProfile}
                            style={[styles.backButton, {
                                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                            }]}
                        >
                            <CaretLeft size={18} color={colors.foreground} weight="bold" />
                        </Pressable>
                        <Text style={[styles.fullProfileTitle, { color: colors.foreground }]}>Profile</Text>
                        <View style={styles.headerSpacer} />
                    </View>

                    <ScrollView contentContainerStyle={styles.fullProfileContent}>
                        {fullProfileBlocks.length === 0 ? (
                            <View style={[styles.emptyProfileCard, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
                                <Text style={[styles.emptyProfileText, { color: colors.mutedForeground }]}>No additional profile details yet.</Text>
                            </View>
                        ) : (
                            fullProfileBlocks.map((block, index) => {
                                if (block.type === 'photo' && block.photo) {
                                    return (
                                        <View key={`profile-photo-${index}`} style={styles.fullPhotoCard}>
                                            <CachedImage uri={block.photo} style={styles.fullPhoto} />
                                            {index === 0 ? (
                                                <View style={styles.fullPhotoNameOverlay}>
                                                    <Text style={styles.fullPhotoNameText}>
                                                        {profile?.firstName || 'Someone'}{profile?.age ? `, ${profile.age}` : ''}
                                                    </Text>
                                                </View>
                                            ) : null}
                                        </View>
                                    );
                                }

                                if (block.type === 'card' && block.card) {
                                    return (
                                        <View
                                            key={`profile-card-${index}`}
                                            style={[
                                                styles.profileInfoCard,
                                                {
                                                    borderColor: colors.border,
                                                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                                                },
                                            ]}
                                        >
                                            <Text style={[styles.profileInfoTitle, { color: colors.foreground }]}>{block.card.title}</Text>

                                            {block.card.text ? (
                                                <Text style={[styles.profileInfoText, { color: colors.mutedForeground }]}>{block.card.text}</Text>
                                            ) : null}

                                            {block.card.chips && block.card.chips.length > 0 ? (
                                                <View style={styles.profileChipWrap}>
                                                    {block.card.chips.map((chip, chipIndex) => (
                                                        <View
                                                            key={`${chip}-${chipIndex}`}
                                                            style={[
                                                                styles.profileChip,
                                                                {
                                                                    borderColor: colors.border,
                                                                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.9)',
                                                                },
                                                            ]}
                                                        >
                                                            <Text style={[styles.profileChipText, { color: colors.foreground }]}>{chip}</Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            ) : null}

                                            {block.card.prompts && block.card.prompts.length > 0 ? (
                                                <View style={styles.promptListWrap}>
                                                    {block.card.prompts.map((prompt, promptIndex) => (
                                                        <View
                                                            key={`${prompt.promptId}-${promptIndex}`}
                                                            style={[
                                                                styles.promptCard,
                                                                {
                                                                    borderColor: colors.border,
                                                                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.9)',
                                                                },
                                                            ]}
                                                        >
                                                            <Text style={[styles.promptQuestion, { color: colors.mutedForeground }]}>{prompt.promptId}</Text>
                                                            <Text style={[styles.promptAnswer, { color: colors.foreground }]}>{prompt.response}</Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            ) : null}
                                        </View>
                                    );
                                }

                                return null;
                            })
                        )}
                    </ScrollView>
                </View>
            </Modal>

            {/* Reuse the existing Block/Report sheet */}
            {blockReportMode && match && (
                <BlockReportModal
                    visible={!!blockReportMode}
                    mode={blockReportMode}
                    userId={match.profile.userId}
                    userName={match.profile.firstName || 'User'}
                    onClose={() => setBlockReportMode(null)}
                    onSuccess={() => {
                        setBlockReportMode(null);
                    }}
                    onSwitchMode={() => setBlockReportMode(blockReportMode === 'block' ? 'report' : 'block')}
                />
            )}

            <Modal
                visible={!!selectedPhoto}
                transparent
                animationType="fade"
                onRequestClose={handleClosePhoto}
            >
                <View style={styles.fullscreenBackdrop}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={handleClosePhoto} />

                    <View style={styles.fullscreenHeader}>
                        <Pressable
                            onPress={handleClosePhoto}
                            style={styles.fullscreenCloseButton}
                        >
                            <X size={20} color="#fff" />
                        </Pressable>
                    </View>

                    {selectedPhoto ? (
                        <View style={styles.fullscreenImageWrap}>
                            <CachedImage uri={selectedPhoto} style={styles.fullscreenImage} contentFit="contain" />
                        </View>
                    ) : null}
                </View>
            </Modal>
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
        position: 'relative',
    },
    dragHandle: {
        position: 'absolute',
        top: 6,
        left: '50%',
        marginLeft: -20,
        width: 40,
        height: 4,
        borderRadius: 999,
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
    safetyRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 8,
    },
    safetyBtn: {
        flex: 1,
        borderRadius: 999,
        borderWidth: 1,
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    safetyBtnText: {
        fontSize: 12,
        fontWeight: '700',
    },
    footer: {
        borderTopWidth: 1,
        padding: 14,
    },
    footerRow: {
        flexDirection: 'row',
        gap: 10,
    },
    footerButton: {
        flex: 1,
    },
    viewProfileButton: {
        borderRadius: 14,
        borderWidth: 1,
        paddingVertical: 13,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 46,
    },
    viewProfileButtonText: {
        fontSize: 15,
        fontWeight: '700',
    },
    fullProfileScreen: {
        flex: 1,
    },
    fullProfileHeader: {
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 12,
        borderBottomWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fullProfileTitle: {
        fontSize: 17,
        fontWeight: '700',
    },
    headerSpacer: {
        width: 34,
        height: 34,
    },
    fullProfileContent: {
        paddingHorizontal: 14,
        paddingVertical: 14,
        gap: 14,
        paddingBottom: 40,
    },
    fullPhotoCard: {
        borderRadius: 24,
        overflow: 'hidden',
    },
    fullPhoto: {
        width: '100%',
        height: 420,
    },
    fullPhotoNameOverlay: {
        position: 'absolute',
        left: 14,
        bottom: 14,
        backgroundColor: 'rgba(0,0,0,0.42)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
    },
    fullPhotoNameText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '700',
    },
    profileInfoCard: {
        borderRadius: 22,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 14,
        gap: 10,
    },
    profileInfoTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    profileInfoText: {
        fontSize: 14,
        lineHeight: 20,
    },
    profileChipWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    profileChip: {
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    profileChipText: {
        fontSize: 14,
        fontWeight: '500',
    },
    promptListWrap: {
        gap: 8,
    },
    promptCard: {
        borderRadius: 14,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 4,
    },
    promptQuestion: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    promptAnswer: {
        fontSize: 14,
        lineHeight: 20,
    },
    emptyProfileCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
    },
    emptyProfileText: {
        fontSize: 14,
    },
    fullscreenBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.96)',
    },
    fullscreenHeader: {
        position: 'absolute',
        top: 56,
        right: 16,
        zIndex: 2,
    },
    fullscreenCloseButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    fullscreenImageWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
        paddingVertical: 20,
    },
    fullscreenImage: {
        width: '100%',
        height: '100%',
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
