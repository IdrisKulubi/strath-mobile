import React, { useState, useCallback } from 'react';
import {
    View,
    StyleSheet,
    Dimensions,
    Image,
    Pressable,
} from 'react-native';
import Animated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { DiscoverProfile } from '@/hooks/use-discover';
import { LinearGradient } from 'expo-linear-gradient';
import { Info, GraduationCap } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 24;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.65;

interface SwipeCardProps {
    profile: DiscoverProfile;
    onInfoPress: () => void;
    isTop?: boolean;
    likeOpacity?: SharedValue<number>;
    nopeOpacity?: SharedValue<number>;
}

export function SwipeCard({
    profile,
    onInfoPress,
    isTop = false,
    likeOpacity,
    nopeOpacity,
}: SwipeCardProps) {
    const { colors } = useTheme();
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

    // Get all photos (profile photo + photos array)
    const allPhotos: string[] = [];
    if (profile.profilePhoto) allPhotos.push(profile.profilePhoto);
    if (profile.photos) allPhotos.push(...profile.photos.filter(p => p && p !== profile.profilePhoto));
    if (profile.user?.image && !allPhotos.includes(profile.user.image)) {
        allPhotos.unshift(profile.user.image);
    }
    // Fallback if no photos
    if (allPhotos.length === 0) {
        allPhotos.push('https://via.placeholder.com/400x600?text=No+Photo');
    }

    const displayName = profile.firstName || profile.user?.name?.split(' ')[0] || 'User';
    const age = profile.age;
    const interests = profile.interests?.slice(0, 5) || [];

    // Handle photo tap to navigate carousel
    const handlePhotoTap = useCallback((event: any) => {
        const tapX = event.nativeEvent.locationX;
        const halfWidth = CARD_WIDTH / 2;

        if (tapX < halfWidth - 40) {
            // Tap on left side - previous photo
            if (currentPhotoIndex > 0) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setCurrentPhotoIndex(prev => prev - 1);
            }
        } else if (tapX > halfWidth + 40) {
            // Tap on right side - next photo
            if (currentPhotoIndex < allPhotos.length - 1) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setCurrentPhotoIndex(prev => prev + 1);
            }
        }
    }, [currentPhotoIndex, allPhotos.length]);

    // Animated styles for stamps
    const likeStampStyle = useAnimatedStyle(() => {
        if (!likeOpacity) return { opacity: 0 };
        return { opacity: likeOpacity.value };
    });

    const nopeStampStyle = useAnimatedStyle(() => {
        if (!nopeOpacity) return { opacity: 0 };
        return { opacity: nopeOpacity.value };
    });

    return (
        <View style={[styles.card, { backgroundColor: colors.card }]}>
            {/* Photo */}
            <Pressable onPress={handlePhotoTap} style={styles.photoContainer}>
                <Image
                    source={{ uri: allPhotos[currentPhotoIndex] }}
                    style={styles.photo}
                    resizeMode="cover"
                />

                {/* Photo indicators */}
                {allPhotos.length > 1 && (
                    <View style={styles.photoIndicators}>
                        {allPhotos.map((_, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.photoIndicator,
                                    {
                                        backgroundColor: index === currentPhotoIndex
                                            ? '#FFFFFF'
                                            : 'rgba(255,255,255,0.4)',
                                    },
                                ]}
                            />
                        ))}
                    </View>
                )}

                {/* Like stamp */}
                {isTop && (
                    <Animated.View style={[styles.likeStamp, likeStampStyle]}>
                        <Text style={[styles.stampText, { color: '#34C759' }]}>LIKE</Text>
                    </Animated.View>
                )}

                {/* Nope stamp */}
                {isTop && (
                    <Animated.View style={[styles.nopeStamp, nopeStampStyle]}>
                        <Text style={[styles.stampText, { color: '#FF3B30' }]}>NOPE</Text>
                    </Animated.View>
                )}

                {/* Gradient overlay */}
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.8)']}
                    style={styles.gradient}
                />

                {/* Profile info overlay */}
                <View style={styles.infoOverlay}>
                    <View style={styles.nameRow}>
                        <Text style={styles.name}>
                            {displayName}{age ? `, ${age}` : ''}
                        </Text>
                        <Pressable
                            onPress={onInfoPress}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            style={styles.infoButton}
                        >
                            <Info size={24} color="#FFFFFF" weight="bold" />
                        </Pressable>
                    </View>

                    {/* University & Course */}
                    {(profile.university || profile.course) && (
                        <View style={styles.detailRow}>
                            <GraduationCap size={16} color="rgba(255,255,255,0.8)" />
                            <Text style={styles.detailText}>
                                {[profile.university, profile.course].filter(Boolean).join(' • ')}
                            </Text>
                        </View>
                    )}

                    {/* Interests */}
                    {interests.length > 0 && (
                        <View style={styles.interestsRow}>
                            {interests.map((interest, index) => (
                                <View key={index} style={styles.interestChip}>
                                    <Text style={styles.interestText}>{interest}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    photoContainer: {
        flex: 1,
    },
    photo: {
        width: '100%',
        height: '100%',
    },
    photoIndicators: {
        position: 'absolute',
        top: 12,
        left: 12,
        right: 12,
        flexDirection: 'row',
        gap: 4,
    },
    photoIndicator: {
        flex: 1,
        height: 3,
        borderRadius: 2,
    },
    gradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: '40%',
    },
    infoOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        padding: 16,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    name: {
        fontSize: 28,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    infoButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 6,
    },
    detailText: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
    },
    interestsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 10,
        gap: 6,
    },
    interestChip: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 12,
    },
    interestText: {
        fontSize: 12,
        color: '#FFFFFF',
        fontWeight: '500',
    },
    likeStamp: {
        position: 'absolute',
        top: 50,
        left: 20,
        borderWidth: 4,
        borderColor: '#34C759',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        transform: [{ rotate: '-15deg' }],
    },
    nopeStamp: {
        position: 'absolute',
        top: 50,
        right: 20,
        borderWidth: 4,
        borderColor: '#FF3B30',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        transform: [{ rotate: '15deg' }],
    },
    stampText: {
        fontSize: 24,
        fontWeight: '800',
    },
});
