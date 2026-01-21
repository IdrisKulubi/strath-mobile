import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Dimensions, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { FeedProfile } from '@/hooks/use-feed';
import { useTheme } from '@/hooks/use-theme';

const { width, height } = Dimensions.get('window');
const HEADER_HEIGHT = height * 0.75;

interface ProfileViewProps {
    profile: FeedProfile;
    onLike: () => void;
    onPass: () => void;
}

export function ProfileView({ profile, onLike, onPass }: ProfileViewProps) {
    const { colors } = useTheme();

    // Fallback image if no photos
    const mainPhoto = profile.photos && profile.photos.length > 0
        ? { uri: profile.photos[0] }
        : require('@/assets/images/react-logo.png');

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Main Header Image */}
                <View style={styles.imageContainer}>
                    <Image source={mainPhoto} style={styles.image} resizeMode="cover" />

                    {/* Gradient Overlay for Name/Age */}
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.9)']}
                        style={styles.gradient}
                    >
                        <View style={styles.headerInfo}>
                            <Text style={styles.name}>
                                {profile.firstName}{profile.age ? `, ${profile.age}` : ''}
                            </Text>
                            {profile.university && (
                                <View style={styles.headerBadge}>
                                    <Ionicons name="school-outline" size={16} color="#FFF" />
                                    <Text style={styles.headerBadgeText}>{profile.university}</Text>
                                </View>
                            )}
                        </View>
                    </LinearGradient>
                </View>

                {/* Profile Content */}
                <View style={styles.contentContainer}>

                    {/* About Me Section */}
                    {profile.bio && (
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>About Me</Text>
                            <Text style={[styles.bodyText, { color: colors.foreground }]}>{profile.bio}</Text>
                        </View>
                    )}

                    {/* Looking For Section - COMMENTED OUT FOR APP STORE REVIEW (uncomment after approval)
                    {profile.lookingFor && (
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Looking For</Text>
                            <View style={[styles.badge, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}>
                                <Ionicons name="heart-outline" size={18} color={colors.primary} />
                                <Text style={[styles.badgeText, { color: colors.primary }]}>{profile.lookingFor}</Text>
                            </View>
                        </View>
                    )}
                    */}

                    {/* Interests Section */}
                    {profile.interests && profile.interests.length > 0 && (
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Interests</Text>
                            <View style={styles.interestsContainer}>
                                {profile.interests.map((interest, index) => (
                                    <View key={index} style={[styles.interestChip, { borderColor: colors.border }]}>
                                        <Text style={[styles.interestText, { color: colors.foreground }]}>{interest}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* More Photos */}
                    {profile.photos && profile.photos.length > 1 && (
                        <View style={styles.section}>
                            {profile.photos.slice(1).map((photo, index) => (
                                <Image key={index} source={{ uri: photo }} style={styles.secondaryPhoto} />
                            ))}
                        </View>
                    )}

                    {/* Location Section */}
                    {profile.location && (
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Location</Text>
                            <View style={styles.locationRow}>
                                <Ionicons name="location-outline" size={20} color={colors.foreground} />
                                <Text style={[styles.bodyText, { color: colors.foreground, marginLeft: 8 }]}>
                                    {profile.location}
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Report / Block Actions */}
                    <View style={styles.footerActions}>
                        <TouchableOpacity style={styles.footerButton}>
                            <Text style={[styles.footerButtonText, { color: colors.foreground }]}>Block {profile.firstName}</Text>
                        </TouchableOpacity>
                        <View style={[styles.divider, { backgroundColor: colors.border }]} />
                        <TouchableOpacity style={styles.footerButton}>
                            <Text style={[styles.footerButtonText, { color: '#FF4444' }]}>Report {profile.firstName}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Spacer for fixed bottom buttons */}
                    <View style={{ height: 120 }} />
                </View>
            </ScrollView>

            {/* Fixed Bottom Actions */}
            <View style={styles.fixedActionsContainer}>
                <TouchableOpacity
                    style={[styles.actionButton, styles.passButton]}
                    onPress={onPass}
                    activeOpacity={0.8}
                >
                    <Ionicons name="close" size={40} color="#666" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, styles.likeButton, { backgroundColor: colors.primary }]}
                    onPress={onLike}
                    activeOpacity={0.8}
                >
                    <Ionicons name="heart" size={36} color="#FFF" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        overflow: 'hidden',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
    imageContainer: {
        width: width,
        height: HEADER_HEIGHT,
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    gradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '40%',
        justifyContent: 'flex-end',
        padding: 20,
    },
    headerInfo: {
        marginBottom: 20,
    },
    name: {
        fontSize: 36,
        fontWeight: '800',
        color: '#FFF',
        marginBottom: 8,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    headerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    headerBadgeText: {
        color: '#FFF',
        marginLeft: 6,
        fontWeight: '600',
    },
    contentContainer: {
        padding: 20,
        marginTop: -20, // Overlap slightly if needed, or just 0
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 12,
        letterSpacing: 0.5,
    },
    bodyText: {
        fontSize: 16,
        lineHeight: 24,
        opacity: 0.8,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        alignSelf: 'flex-start',
    },
    badgeText: {
        marginLeft: 8,
        fontWeight: '600',
    },
    interestsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    interestChip: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
    },
    interestText: {
        fontSize: 14,
        fontWeight: '500',
    },
    secondaryPhoto: {
        width: '100%',
        height: 400,
        borderRadius: 16,
        marginBottom: 16,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    footerActions: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 40,
    },
    footerButton: {
        paddingVertical: 16,
        width: '100%',
        alignItems: 'center',
    },
    footerButtonText: {
        fontSize: 16,
        fontWeight: '600',
        opacity: 0.7,
    },
    divider: {
        height: 1,
        width: '100%',
        opacity: 0.2,
    },
    fixedActionsContainer: {
        position: 'absolute',
        bottom: 30,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    actionButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    passButton: {
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#EEE',
    },
    likeButton: {
        transform: [{ scale: 1.1 }], // Make it slightly larger
    },
});
