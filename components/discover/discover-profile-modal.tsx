import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    Modal,
    ScrollView,
    Image,
    Pressable,
    Dimensions,
    StatusBar,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { DiscoverProfile } from '@/types/discover';
import { X, Heart, GraduationCap, Sparkle, DotsThreeVertical, Shield, Flag } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { BlockReportModal } from './block-report-modal';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface DiscoverProfileModalProps {
    visible: boolean;
    profile: DiscoverProfile | null;
    onClose: () => void;
    onLike: (profile: DiscoverProfile) => void;
    onPass: (profile: DiscoverProfile) => void;
    onBlock?: (profile: DiscoverProfile) => void;
    onReport?: (profile: DiscoverProfile) => void;
}

/**
 * DiscoverProfileModal - Full screen profile view with Like/Pass buttons
 * Similar to People page swipe card but in modal format
 */
export function DiscoverProfileModal({
    visible,
    profile,
    onClose,
    onLike,
    onPass,
    onBlock,
    onReport
}: DiscoverProfileModalProps) {
    const { colors } = useTheme();
    const [showMenu, setShowMenu] = useState(false);
    const [blockReportMode, setBlockReportMode] = useState<"block" | "report" | null>(null);

    if (!profile) return null;

    const photo = profile.profilePhoto || profile.photos?.[0] || profile.user?.image;
    const name = profile.firstName || profile.user?.name?.split(' ')[0] || 'User';
    const allPhotos = [
        profile.profilePhoto,
        ...(profile.photos || []),
    ].filter(Boolean) as string[];

    const handleLike = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onLike(profile);
        onClose();
    };

    const handlePass = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPass(profile);
        onClose();
    };

    const handleSuperLike = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onLike(profile);
        onClose();
    };

    const handleOpenMenu = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowMenu(true);
    };

    const handleOpenBlockSheet = () => {
        setShowMenu(false);
        setBlockReportMode("block");
    };

    const handleOpenReportSheet = () => {
        setShowMenu(false);
        setBlockReportMode("report");
    };

    const handleBlockReportSuccess = () => {
        setBlockReportMode(null);
        onBlock?.(profile);
        onClose();
        Alert.alert(
            blockReportMode === "block" ? 'User Blocked' : 'Report Submitted',
            blockReportMode === "block" 
                ? `You won't see ${name} anymore.`
                : 'Thank you for helping keep our community safe. We\'ll review this report within 24 hours.',
            [{ text: 'OK' }]
        );
    };

    const handleSwitchMode = () => {
        setBlockReportMode(blockReportMode === "block" ? "report" : "block");
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={onClose}
        >
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <StatusBar barStyle="light-content" />

                {/* Header */}
                <SafeAreaView edges={['top']} style={styles.header}>
                    <Pressable onPress={onClose} style={styles.closeButton}>
                        <X size={28} color={colors.foreground} weight="bold" />
                    </Pressable>
                    <Text style={[styles.headerTitle, { color: colors.foreground }]}>
                        {name}, {profile.age || '?'}
                    </Text>
                    <Pressable onPress={handleOpenMenu} style={styles.closeButton}>
                        <DotsThreeVertical size={28} color={colors.foreground} weight="bold" />
                    </Pressable>
                </SafeAreaView>

                {/* Menu Dropdown */}
                {showMenu && (
                    <Pressable 
                        style={styles.menuOverlay} 
                        onPress={() => setShowMenu(false)}
                    >
                        <View style={[styles.menuContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Pressable 
                                style={styles.menuItem} 
                                onPress={handleOpenBlockSheet}
                            >
                                <Shield size={20} color={colors.foreground} />
                                <Text style={[styles.menuItemText, { color: colors.foreground }]}>
                                    Block {name}
                                </Text>
                            </Pressable>
                            <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
                            <Pressable 
                                style={styles.menuItem} 
                                onPress={handleOpenReportSheet}
                            >
                                <Flag size={20} color="#ef4444" />
                                <Text style={[styles.menuItemText, { color: '#ef4444' }]}>
                                    Report {name}
                                </Text>
                            </Pressable>
                        </View>
                    </Pressable>
                )}

                {/* Scrollable Content */}
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Main Photo */}
                    <View style={styles.photoContainer}>
                        {photo ? (
                            <Image source={{ uri: photo }} style={styles.mainPhoto} />
                        ) : (
                            <View style={[styles.mainPhoto, styles.placeholder, { backgroundColor: colors.muted }]}>
                                <Heart size={64} color={colors.mutedForeground} />
                            </View>
                        )}

                        {/* Badges overlay */}
                        <View style={styles.badgesContainer}>
                            {profile.yearOfStudy === 1 && (
                                <View style={[styles.badge, { backgroundColor: colors.card }]}>
                                    <Text style={styles.badgeText}>New here</Text>
                                </View>
                            )}
                        </View>

                        {/* Name overlay */}
                        <View style={styles.nameOverlay}>
                            <Text
                                style={styles.overlayName}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                minimumFontScale={0.8}
                            >
                                {name}, {profile.age || '?'}
                            </Text>
                        </View>
                    </View>

                    {/* Bio Section */}
                    {profile.bio && (
                        <View style={[styles.section, { backgroundColor: colors.card }]}>
                            <Text style={[styles.sectionText, { color: colors.foreground }]}>
                                {profile.bio}
                            </Text>
                        </View>
                    )}

                    {/* Details */}
                    <View style={[styles.section, { backgroundColor: colors.card }]}>
                        {profile.university && (
                            <View style={styles.detailRow}>
                                <GraduationCap size={20} color={colors.mutedForeground} />
                                <Text style={[styles.detailText, { color: colors.foreground }]}>
                                    {profile.university}
                                </Text>
                            </View>
                        )}
                        {profile.course && (
                            <View style={styles.detailRow}>
                                <Sparkle size={20} color={colors.mutedForeground} />
                                <Text style={[styles.detailText, { color: colors.foreground }]}>
                                    {profile.course}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Interests */}
                    {profile.interests && profile.interests.length > 0 && (
                        <View style={[styles.section, { backgroundColor: colors.card }]}>
                            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Interests</Text>
                            <View style={styles.interestsContainer}>
                                {profile.interests.map((interest, i) => (
                                    <View
                                        key={i}
                                        style={[styles.interestChip, { backgroundColor: colors.muted }]}
                                    >
                                        <Text style={[styles.interestText, { color: colors.foreground }]}>
                                            {interest}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Additional Photos */}
                    {allPhotos.length > 1 && (
                        <View style={styles.photosGrid}>
                            {allPhotos.slice(1, 5).map((p, i) => (
                                <Image key={i} source={{ uri: p }} style={styles.gridPhoto} />
                            ))}
                        </View>
                    )}

                    <View style={{ height: 120 }} />
                </ScrollView>

                {/* Fixed Action Buttons */}
                <SafeAreaView edges={['bottom']} style={[styles.actionsContainer, { backgroundColor: colors.background }]}>
                    <Pressable
                        style={[styles.actionButton, styles.passButton, { borderColor: colors.border }]}
                        onPress={handlePass}
                    >
                        <Text style={[styles.passButtonText, { color: colors.foreground }]}>Not for me</Text>
                    </Pressable>

                    <Pressable
                        style={[styles.actionButton, styles.likeButton]}
                        onPress={handleLike}
                    >
                        <Text style={styles.likeButtonText}>Like</Text>
                    </Pressable>
                </SafeAreaView>

                {/* Block/Report Modal */}
                {blockReportMode && (
                    <BlockReportModal
                        visible={!!blockReportMode}
                        mode={blockReportMode}
                        userId={profile.userId}
                        userName={name}
                        onClose={() => setBlockReportMode(null)}
                        onSuccess={handleBlockReportSuccess}
                        onSwitchMode={handleSwitchMode}
                    />
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
        minHeight: 56,
    },
    closeButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        lineHeight: 24,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
    },
    photoContainer: {
        width: '100%',
        height: SCREEN_HEIGHT * 0.55,
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 16,
    },
    mainPhoto: {
        width: '100%',
        height: '100%',
    },
    placeholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgesContainer: {
        position: 'absolute',
        bottom: 80,
        left: 16,
    },
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    badgeText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#000',
    },
    nameOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        padding: 16,
    },
    overlayName: {
        fontSize: 28,
        fontWeight: '700',
        color: '#FFFFFF',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    superLikeButton: {
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
    },
    section: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 12,
    },
    sectionText: {
        fontSize: 15,
        lineHeight: 22,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
    },
    detailText: {
        fontSize: 15,
    },
    interestsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    interestChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
    },
    interestText: {
        fontSize: 14,
    },
    photosGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    gridPhoto: {
        width: (SCREEN_WIDTH - 48) / 2,
        height: (SCREEN_WIDTH - 48) / 2,
        borderRadius: 12,
    },
    actionsContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 8,
        gap: 12,
    },
    actionButton: {
        flex: 1,
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
    },
    passButton: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
    },
    passButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    likeButton: {
        backgroundColor: '#1a1a1a',
    },
    likeButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    menuOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
    },
    menuContainer: {
        position: 'absolute',
        top: 100,
        right: 16,
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
        minWidth: 180,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        gap: 12,
    },
    menuItemText: {
        fontSize: 15,
        fontWeight: '500',
    },
    menuDivider: {
        height: 1,
    },
});
