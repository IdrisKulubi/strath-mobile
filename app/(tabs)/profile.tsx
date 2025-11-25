import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useProfile } from '@/hooks/use-profile';
import { CompletionHalo } from '@/components/profile/completion-halo';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
    const { colors } = useTheme();
    const { data: profile, isLoading } = useProfile();
    const router = useRouter();

    const calculateCompletion = () => {
        if (!profile) return 0;
        let score = 0;

        // Basic Info (30%)
        if (profile.firstName && profile.lastName) score += 10;
        if (profile.bio) score += 10;
        if (profile.profilePhoto) score += 10;

        // Uni Life (20%)
        if (profile.university) score += 10;
        if (profile.course && profile.yearOfStudy) score += 10;

        // Vibe (30%)
        if (profile.interests && profile.interests.length > 0) score += 10;
        if (profile.zodiacSign) score += 5;
        if (profile.personalityType) score += 5;
        if (profile.loveLanguage) score += 5;
        if (profile.photos && profile.photos.length > 0) score += 5;

        // Socials (20%)
        if (profile.instagram) score += 10;
        if (profile.spotify || profile.snapchat) score += 10;

        return Math.min(score, 100);
    };

    const completion = calculateCompletion();

    if (isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: colors.foreground }}>Loading DNA...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header Actions */}
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.iconButton}>
                        <Ionicons name="settings-outline" size={24} color={colors.foreground} />
                    </TouchableOpacity>
                </View>

                {/* Hero Section */}
                <View style={styles.heroSection}>
                    <CompletionHalo percentage={completion} radius={70} strokeWidth={6}>
                        <Image
                            source={{ uri: profile?.profilePhoto || profile?.user?.image || 'https://via.placeholder.com/150' }}
                            style={styles.profileImage}
                        />
                    </CompletionHalo>

                    <View style={styles.identityContainer}>
                        <Text style={[styles.name, { color: colors.foreground }]}>
                            {profile?.firstName} {profile?.lastName}
                            {profile?.age ? `, ${profile.age}` : ''}
                        </Text>
                        <Text style={[styles.uniDetails, { color: colors.muted }]}>
                            {profile?.course} • Year {profile?.yearOfStudy}
                        </Text>
                        <Text style={[styles.uniName, { color: colors.primary }]}>
                            {profile?.university}
                        </Text>
                    </View>

                    {completion < 100 && (
                        <TouchableOpacity
                            style={styles.completeButton}
                            onPress={() => router.push('/edit-profile')}
                        >
                            <LinearGradient
                                colors={['rgba(0, 242, 255, 0.2)', 'rgba(255, 0, 85, 0.2)']}
                                style={styles.completeGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <Text style={styles.completeText}>⚡ Complete Your Profile ({completion}%)</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Photos Carousel */}
                {profile?.photos && profile.photos.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
                        {profile.photos.map((photo: any, index: React.Key | null | undefined) => (
                            <Image key={index} source={{ uri: photo }} style={styles.extraPhoto} />
                        ))}
                    </ScrollView>
                )}

                {/* Bio */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.muted }]}>ABOUT ME</Text>
                    <Text style={[styles.bioText, { color: colors.foreground }]}>
                        {profile?.bio || "No bio yet. Tap edit to add one!"}
                    </Text>
                </View>

                {/* Vibe Chips */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.muted }]}>THE VIBE</Text>
                    <View style={styles.chipContainer}>
                        {profile?.zodiacSign && (
                            <View style={[styles.chip, { borderColor: colors.border }]}>
                                <Text style={[styles.chipText, { color: colors.foreground }]}>✨ {profile.zodiacSign}</Text>
                            </View>
                        )}
                        {profile?.personalityType && (
                            <View style={[styles.chip, { borderColor: colors.border }]}>
                                <Text style={[styles.chipText, { color: colors.foreground }]}>🧠 {profile.personalityType}</Text>
                            </View>
                        )}
                        {profile?.interests?.map((interest: string, index: number) => (
                            <View key={index} style={[styles.chip, { borderColor: colors.border }]}>
                                <Text style={[styles.chipText, { color: colors.foreground }]}>{interest}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Socials */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.muted }]}>SOCIALS</Text>
                    <View style={styles.socialsRow}>
                        {profile?.instagram && <Ionicons name="logo-instagram" size={24} color="#E1306C" style={styles.socialIcon} />}
                        {profile?.spotify && <Ionicons name="musical-notes" size={24} color="#1DB954" style={styles.socialIcon} />}
                        {profile?.snapchat && <Ionicons name="logo-snapchat" size={24} color="#FFFC00" style={styles.socialIcon} />}
                    </View>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Fixed Footer */}
            <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
                <TouchableOpacity
                    style={[styles.editButton, { backgroundColor: colors.foreground }]}
                    onPress={() => router.push('/edit-profile')}
                >
                    <Text style={[styles.editButtonText, { color: colors.background }]}>EDIT PROFILE</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 20,
    },
    headerActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        padding: 16,
        paddingTop: 60,
    },
    iconButton: {
        padding: 8,
    },
    heroSection: {
        alignItems: 'center',
        marginBottom: 24,
    },
    profileImage: {
        width: 130,
        height: 130,
        borderRadius: 65,
    },
    identityContainer: {
        alignItems: 'center',
        marginTop: 16,
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    uniDetails: {
        fontSize: 14,
        marginTop: 4,
    },
    uniName: {
        fontSize: 14,
        fontWeight: '600',
        marginTop: 2,
    },
    completeButton: {
        marginTop: 16,
        borderRadius: 20,
        overflow: 'hidden',
    },
    completeGradient: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    completeText: {
        color: '#00f2ff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    photosScroll: {
        marginBottom: 24,
        paddingLeft: 16,
    },
    extraPhoto: {
        width: 120,
        height: 160,
        borderRadius: 12,
        marginRight: 12,
    },
    section: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 12,
        letterSpacing: 1,
    },
    bioText: {
        fontSize: 16,
        lineHeight: 24,
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    chipText: {
        fontSize: 14,
    },
    socialsRow: {
        flexDirection: 'row',
        gap: 16,
    },
    socialIcon: {
        opacity: 0.8,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        borderTopWidth: 1,
        paddingBottom: 30,
    },
    editButton: {
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    editButtonText: {
        fontWeight: 'bold',
        fontSize: 16,
    },
});
