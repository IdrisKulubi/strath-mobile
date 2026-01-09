import React, { useEffect } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    Pressable,
    Image,
    Dimensions
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSpring,
    FadeInRight
} from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { DiscoverSection, DiscoverProfile } from '@/types/discover';
import { Heart } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FEATURED_WIDTH = SCREEN_WIDTH - 100;
const SMALL_CARD_WIDTH = 140;
const HORIZONTAL_CARD_WIDTH = 150;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface DiscoverSectionViewProps {
    section: DiscoverSection;
    onProfilePress: (profile: DiscoverProfile) => void;
    onLikePress?: (profile: DiscoverProfile) => void;
}

/**
 * DiscoverSectionView - Renders a discover section with animated cards
 */
export function DiscoverSectionView({
    section,
    onProfilePress,
    onLikePress
}: DiscoverSectionViewProps) {
    const { colors } = useTheme();

    const handlePress = (profile: DiscoverProfile) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onProfilePress(profile);
    };

    const handleLike = (profile: DiscoverProfile, e: any) => {
        e.stopPropagation();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onLikePress?.(profile);
    };

    const renderProfileCard = (
        profile: DiscoverProfile,
        size: 'large' | 'small' | 'horizontal',
        index: number
    ) => {
        const photo = profile.profilePhoto || profile.photos?.[0] || profile.user?.image;
        const name = profile.firstName || profile.user?.name?.split(' ')[0] || 'User';

        const cardStyle = {
            large: styles.featuredCard,
            small: styles.smallCard,
            horizontal: styles.horizontalCard,
        }[size];

        const nameStyle = size === 'large' ? styles.featuredName : styles.cardName;
        const delay = index * 100; // Staggered animation

        return (
            <AnimatedPressable
                key={profile.id}
                entering={FadeInRight.delay(delay).springify()}
                onPress={() => handlePress(profile)}
                style={[
                    cardStyle,
                    { backgroundColor: colors.card },
                ]}
            >
                {photo ? (
                    <Image source={{ uri: photo }} style={styles.cardImage} resizeMode="cover" />
                ) : (
                    <View style={[styles.cardImage, styles.placeholder, { backgroundColor: colors.muted }]}>
                        <Heart size={size === 'large' ? 48 : 24} color={colors.mutedForeground} />
                    </View>
                )}

                <View style={styles.cardOverlay}>
                    <View style={styles.cardInfo}>
                        <Text style={nameStyle} numberOfLines={1}>
                            {name}{profile.age ? `, ${profile.age}` : ''}
                        </Text>
                        {(profile.sharedInterests || 0) > 0 && (
                            <Text style={styles.sharedText}>
                                {profile.sharedInterests} shared
                            </Text>
                        )}
                    </View>
                    <Pressable
                        style={styles.heartButton}
                        onPress={(e) => handleLike(profile, e)}
                    >
                        <Heart size={size === 'large' ? 22 : 18} color="#333" />
                    </Pressable>
                </View>
            </AnimatedPressable>
        );
    };

    // Empty state
    if (section.profiles.length === 0) {
        return null;
    }

    return (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                {section.title}
            </Text>

            {/* Featured layout: large card + small cards */}
            {section.type === 'featured' && (
                <>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.horizontalScroll}
                    >
                        {section.profiles[0] && renderProfileCard(section.profiles[0], 'large', 0)}

                        <View style={styles.smallCardsColumn}>
                            {section.profiles.slice(1, 3).map((p, i) => renderProfileCard(p, 'small', i + 1))}
                        </View>

                        {section.profiles.slice(3, 5).map((p, i) => renderProfileCard(p, 'small', i + 3))}
                    </ScrollView>

                    {section.subtitle && (
                        <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>
                            ⓘ {section.subtitle}
                        </Text>
                    )}
                </>
            )}

            {/* Horizontal layout: scrollable row */}
            {section.type === 'horizontal' && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalScroll}
                >
                    {section.profiles.map((p, i) => renderProfileCard(p, 'horizontal', i))}
                </ScrollView>
            )}

            {/* Grid layout: 2 column grid */}
            {section.type === 'grid' && (
                <View style={styles.grid}>
                    {section.profiles.slice(0, 4).map((p, i) => renderProfileCard(p, 'small', i))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        marginBottom: 28,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        paddingHorizontal: 20,
        marginBottom: 14,
    },
    sectionSubtitle: {
        fontSize: 12,
        paddingHorizontal: 20,
        marginTop: 10,
    },
    horizontalScroll: {
        paddingHorizontal: 20,
        gap: 12,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 20,
        gap: 12,
    },
    featuredCard: {
        width: FEATURED_WIDTH,
        height: FEATURED_WIDTH * 1.2,
        borderRadius: 16,
        overflow: 'hidden',
    },
    smallCard: {
        width: SMALL_CARD_WIDTH,
        height: SMALL_CARD_WIDTH * 1.3,
        borderRadius: 12,
        overflow: 'hidden',
    },
    horizontalCard: {
        width: HORIZONTAL_CARD_WIDTH,
        height: HORIZONTAL_CARD_WIDTH * 1.4,
        borderRadius: 12,
        overflow: 'hidden',
    },
    smallCardsColumn: {
        gap: 12,
    },
    cardImage: {
        width: '100%',
        height: '100%',
    },
    placeholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        padding: 10,
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    cardInfo: {
        flex: 1,
    },
    cardName: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    featuredName: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '700',
    },
    sharedText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 11,
        marginTop: 2,
    },
    heartButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
