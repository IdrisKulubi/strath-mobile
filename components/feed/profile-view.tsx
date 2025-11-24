import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { FeedProfile } from '@/hooks/use-feed';
import { useTheme } from '@/hooks/use-theme';

const { width, height } = Dimensions.get('window');
const CARD_HEIGHT = height * 0.75;

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
        : require('@/assets/images/react-logo.png'); // Placeholder

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
            <View style={styles.imageContainer}>
                <Image source={mainPhoto} style={styles.image} resizeMode="cover" />

                {/* Vibe Check Badge */}
                <View style={styles.vibeBadge}>
                    <Text style={styles.vibeText}>Vibe Check: 85%</Text>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: '85%' }]} />
                    </View>
                </View>

                {/* Gradient Overlay */}
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.8)']}
                    style={styles.gradient}
                >
                    <View style={styles.infoContainer}>
                        <Text style={styles.name}>
                            {profile.firstName}, {profile.age}
                        </Text>

                        <View style={styles.actionsContainer}>
                            <TouchableOpacity style={[styles.actionButton, styles.nopeButton]} onPress={onPass}>
                                <Ionicons name="close" size={30} color="#FFF" />
                                <Text style={styles.actionText}>NOPE</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.actionButton, styles.likeButton]} onPress={onLike}>
                                <Ionicons name="heart" size={30} color="#FFF" />
                                <Text style={styles.actionText}>LIKE</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.swipeIndicator}>
                        <Ionicons name="chevron-up" size={24} color="#FFF" />
                        <Text style={styles.swipeText}>Swipe to Vibe!</Text>
                    </View>
                </LinearGradient>
            </View>

            {/* Details Section */}
            <View style={styles.detailsContainer}>
                {profile.bio && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>About Me</Text>
                        <Text style={[styles.bioText, { color: colors.foreground }]}>{profile.bio}</Text>
                    </View>
                )}

                {profile.interests && profile.interests.length > 0 && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Interests</Text>
                        <View style={styles.interestsContainer}>
                            {profile.interests.map((interest, index) => (
                                <View key={index} style={[styles.interestChip, { borderColor: colors.primary }]}>
                                    <Text style={[styles.interestText, { color: colors.foreground }]}>{interest}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Placeholder for more photos */}
                {profile.photos && profile.photos.length > 1 && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>More Photos</Text>
                        {profile.photos.slice(1).map((photo, index) => (
                            <Image key={index} source={{ uri: photo }} style={styles.secondaryPhoto} />
                        ))}
                    </View>
                )}
            </View>

            <View style={{ height: 100 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    imageContainer: {
        width: width,
        height: CARD_HEIGHT,
        position: 'relative',
        borderRadius: 20,
        overflow: 'hidden',
        marginTop: 10,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    vibeBadge: {
        position: 'absolute',
        top: 20,
        alignSelf: 'center',
        backgroundColor: '#e91e8c',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        alignItems: 'center',
        width: '60%',
        zIndex: 10,
    },
    vibeText: {
        color: '#FFF',
        fontWeight: 'bold',
        marginBottom: 4,
    },
    progressBar: {
        width: '100%',
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 2,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#FFF',
        borderRadius: 2,
    },
    gradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '40%',
        justifyContent: 'flex-end',
        paddingBottom: 20,
        paddingHorizontal: 20,
    },
    infoContainer: {
        marginBottom: 20,
    },
    name: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 20,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    actionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 30,
        width: '45%',
    },
    nopeButton: {
        backgroundColor: '#e91e8c', // Pink
    },
    likeButton: {
        backgroundColor: '#e91e8c', // Pink
    },
    actionText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
        marginLeft: 8,
    },
    swipeIndicator: {
        alignItems: 'center',
    },
    swipeText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    detailsContainer: {
        padding: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    bioText: {
        fontSize: 16,
        lineHeight: 24,
        opacity: 0.8,
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
    },
    secondaryPhoto: {
        width: '100%',
        height: 300,
        borderRadius: 12,
        marginBottom: 10,
    }
});
