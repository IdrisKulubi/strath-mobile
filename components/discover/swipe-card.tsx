import React, { useEffect, useState } from 'react';
import {
    View,
    StyleSheet,
    Dimensions,
    Image,
    Pressable,
    ScrollView,
} from 'react-native';
import Animated, {
    SharedValue,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
    Easing
} from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { DiscoverProfile } from '@/hooks/use-discover';
import { LinearGradient } from 'expo-linear-gradient';
import {
    GraduationCap,
    MapPin,
    User,
    Heart,
    Wine,
    Smiley,
    Buildings,
    WarningCircle,
    Prohibit
} from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { BlockReportModal } from './block-report-modal';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 16;
const CARD_HEIGHT = SCREEN_HEIGHT - 200; // Leave room for header and tab bar

interface SwipeCardProps {
    profile: DiscoverProfile;
    onInfoPress?: () => void;
    onBlock?: (profile: DiscoverProfile) => void;
    onReport?: (profile: DiscoverProfile) => void;
    isTop?: boolean;
    showAura?: boolean;
    likeOpacity?: SharedValue<number>;
    nopeOpacity?: SharedValue<number>;
}

interface TagProps {
    icon: React.ReactNode;
    label: string;
    colors: any;
}

function Tag({ icon, label, colors }: TagProps) {
    return (
        <View style={[styles.tag, { backgroundColor: colors.background, borderColor: colors.border }]}>
            {icon}
            <Text style={[styles.tagText, { color: colors.foreground }]}>{label}</Text>
        </View>
    );
}

export function SwipeCard({
    profile,
    onInfoPress,
    onBlock,
    onReport,
    isTop = false,
    showAura = false,
    likeOpacity,
    nopeOpacity,
}: SwipeCardProps) {
    const { colors } = useTheme();
    const [blockReportMode, setBlockReportMode] = useState<"block" | "report" | null>(null);

    // Get all photos
    const allPhotos: string[] = [];
    if (profile.profilePhoto) allPhotos.push(profile.profilePhoto);
    if (profile.photos) allPhotos.push(...profile.photos.filter(p => p && p !== profile.profilePhoto));

    if (allPhotos.length === 0) {
        allPhotos.push('https://via.placeholder.com/400x600?text=No+Photo');
    }

    const displayName = profile.firstName || profile.user?.name?.split(' ')[0] || 'User';
    const age = profile.age;
    const interests = profile.interests || [];

    // Vibe Aura Logic
    const auraOpacity = useSharedValue(0.4);

    useEffect(() => {
        auraOpacity.value = withRepeat(
            withTiming(0.7, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
            -1,
            true
        );
    }, []);

    const getAuraColor = () => {
        const keywords: Record<string, { color: string, keys: string[] }> = {
            music: { color: '#007AFF', keys: ['Music', 'Spotify', 'Concerts', 'Guitar', 'Singing', 'Afrobeats'] },
            hustle: { color: '#34C759', keys: ['Coding', 'Startups', 'Entrepreneurship', 'Business', 'Freelancing', 'Tech'] },
            chill: { color: '#FF9500', keys: ['Coffee', 'Reading', 'Netflix', 'Relaxing', 'Sleep', 'Peace'] },
            gaming: { color: '#5856D6', keys: ['Gaming', 'PlayStation', 'Xbox', 'PC', 'E-sports', 'Twitch'] },
            night: { color: '#AF52DE', keys: ['Party', 'Clubbing', 'Late Night', 'Night Owl', 'Dancing'] },
            creative: { color: '#FF2D55', keys: ['Art', 'Design', 'Photography', 'Painting', 'Content Creation'] },
        };

        for (const [vibe, data] of Object.entries(keywords)) {
            if (interests.some(i => data.keys.some(k => i.toLowerCase().includes(k.toLowerCase())))) {
                return data.color;
            }
        }
        return colors.primary; // Fallback to brand pink
    };

    const auraColor = getAuraColor();

    const auraStyle = useAnimatedStyle(() => ({
        opacity: showAura ? auraOpacity.value : 1,
        shadowColor: showAura ? auraColor : 'transparent',
        backgroundColor: colors.card,
    }));

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
        <Animated.View style={[styles.card, auraStyle, showAura && styles.auraContainer]}>
            {showAura && <View style={[styles.auraBackground, { backgroundColor: auraColor, opacity: 0.15 }]} />}
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                bounces={true}
            >
                {/* Hero Photo Section - Just the image and gradient/stamps */}
                <View style={styles.heroContainer}>
                    <Image
                        source={{ uri: allPhotos[0] }}
                        style={styles.heroPhoto}
                        resizeMode="cover"
                    />

                    {/* Bottom Gradient - Sits below the profile info layer */}
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.8)']}
                        style={styles.gradient}
                    />

                    {/* Name & Info - Moves with the image */}
                    <View style={styles.heroInfo}>
                        <Text style={styles.heroName} numberOfLines={1}>
                            {displayName}, {age || '?'}
                        </Text>
                        {profile.university && (
                            <View style={styles.heroDetail}>
                                <GraduationCap size={16} color="#FFFFFF" weight="fill" />
                                <Text style={styles.heroDetailText}>{profile.university}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* About Me Section */}
                <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>About me</Text>
                    <View style={styles.tagsContainer}>
                        <Tag icon={<User size={16} color={colors.foreground} />} label={profile.gender || "Not specified"} colors={colors} />
                        <Tag icon={<Buildings size={16} color={colors.foreground} />} label={profile.university || "University"} colors={colors} />
                        <Tag icon={<Wine size={16} color={colors.foreground} />} label="Socially" colors={colors} />
                        <Tag icon={<Smiley size={16} color={colors.foreground} />} label="Christian" colors={colors} />
                    </View>
                    {profile.bio && (
                        <Text style={[styles.bioText, { color: colors.foreground }]}>{profile.bio}</Text>
                    )}
                </View>

                {/* Second Photo */}
                {allPhotos.length > 1 && (
                    <View style={styles.photoContainer}>
                        <Image source={{ uri: allPhotos[1] }} style={styles.photo} resizeMode="cover" />
                    </View>
                )}

                {/* Looking For - COMMENTED OUT FOR APP STORE REVIEW (uncomment after approval)
                <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>I'm looking for</Text>
                    <View style={styles.tagsContainer}>
                        <Tag icon={<Heart size={16} color={colors.foreground} />} label="A long-term relationship" colors={colors} />
                    </View>
                </View>
                */}

                {/* Interests */}
                {interests.length > 0 && (
                    <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>My interests</Text>
                        <View style={styles.tagsContainer}>
                            {interests.map((interest, index) => (
                                <View key={index} style={[styles.tag, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                    <Text style={[styles.tagText, { color: colors.foreground }]}>{interest}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Third Photo */}
                {allPhotos.length > 2 && (
                    <View style={styles.photoContainer}>
                        <Image source={{ uri: allPhotos[2] }} style={styles.photo} resizeMode="cover" />
                    </View>
                )}

                {/* Location & Actions */}
                <View style={[styles.section, styles.lastSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>My location</Text>
                    <View style={styles.locationRow}>
                        <MapPin size={20} color={colors.foreground} weight="bold" />
                        <View>
                            <Text style={[styles.locationMain, { color: colors.foreground }]}>Nairobi, Kenya</Text>
                            <Text style={[styles.locationSub, { color: colors.mutedForeground }]}>Strathmore University</Text>
                        </View>
                    </View>
                    <View style={styles.actionButtons}>
                        <Pressable 
                            style={styles.actionButton}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                setBlockReportMode("block");
                            }}
                        >
                            <Prohibit size={20} color={colors.foreground} />
                            <Text style={[styles.actionButtonText, { color: colors.foreground }]}>Block {displayName}</Text>
                        </Pressable>
                        <Pressable 
                            style={styles.actionButton}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                setBlockReportMode("report");
                            }}
                        >
                            <WarningCircle size={20} color="#FF3B30" />
                            <Text style={[styles.actionButtonText, { color: '#FF3B30' }]}>Report {displayName}</Text>
                        </Pressable>
                    </View>
                </View>
            </ScrollView>

            {/* Block/Report Modal */}
            {blockReportMode && (
                <BlockReportModal
                    visible={!!blockReportMode}
                    mode={blockReportMode}
                    userId={profile.userId}
                    userName={displayName}
                    onClose={() => setBlockReportMode(null)}
                    onSuccess={() => {
                        const wasBlock = blockReportMode === "block";
                        setBlockReportMode(null);
                        if (wasBlock) {
                            onBlock?.(profile);
                        } else {
                            onReport?.(profile);
                        }
                    }}
                    onSwitchMode={() => setBlockReportMode(blockReportMode === "block" ? "report" : "block")}
                />
            )}

            {/* FIXED LAYER: CONNECT/PASS Stamps - Sits on top of everything, centered */}
            {isTop && (
                <View style={styles.stampOverlay} pointerEvents="none">
                    <Animated.View style={[styles.likeStamp, likeStampStyle]}>
                        <Text style={[styles.stampText, { color: '#34C759' }]}>CONNECT</Text>
                    </Animated.View>
                    <Animated.View style={[styles.nopeStamp, nopeStampStyle]}>
                        <Text style={[styles.stampText, { color: '#FF3B30' }]}>PASS</Text>
                    </Animated.View>
                </View>
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    card: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        borderRadius: 12,
        overflow: 'hidden',
    },
    auraContainer: {
        // Glow effect
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 15,
        elevation: 10,
    },
    auraBackground: {
        ...StyleSheet.absoluteFillObject,
        zIndex: -1,
    },
    scrollContent: {
        paddingBottom: 100,
    },
    heroContainer: {
        width: '100%',
        height: CARD_HEIGHT, // Full card height for hero
        position: 'relative',
    },
    heroPhoto: {
        width: '100%',
        height: '100%',
    },
    gradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 180, // Slightly taller gradient for visibility
    },
    heroInfo: {
        position: 'absolute',
        bottom: 20, // Positioned at the bottom of the photo
        left: 20,
        right: 80, // Space for floating buttons
        zIndex: 20,
    },
    heroName: {
        fontSize: 32,
        fontWeight: '800',
        color: '#FFFFFF',
        lineHeight: 40, // Increased line height to prevent letter cutoff
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 10,
        letterSpacing: -0.5,
    },
    heroDetail: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 6,
    },
    heroDetailText: {
        fontSize: 15,
        color: '#FFFFFF',
        fontWeight: '500',
    },
    section: {
        padding: 20,
        marginHorizontal: 12,
        borderRadius: 16,
        marginTop: 12,
        borderWidth: 1,
    },
    lastSection: {
        paddingBottom: 40,
        marginBottom: 40, // Space for buttons
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 12,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        gap: 6,
    },
    tagText: {
        fontSize: 14,
        fontWeight: '500',
    },
    bioText: {
        fontSize: 16,
        lineHeight: 24,
        marginTop: 12,
    },
    photoContainer: {
        width: '100%',
        height: 550,
        paddingHorizontal: 12,
        marginTop: 12,
    },
    photo: {
        width: '100%',
        height: '100%',
        borderRadius: 12,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    locationMain: {
        fontSize: 16,
        fontWeight: '600',
    },
    locationSub: {
        fontSize: 14,
        marginTop: 2,
    },
    actionButtons: {
        marginTop: 32,
        gap: 16,
        alignItems: 'center',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    actionButtonText: {
        fontSize: 15,
        fontWeight: '600',
    },
    stampOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 200, // Above all content and name overlay
    },
    likeStamp: {
        position: 'absolute',
        top: '25%',
        left: 20,
        borderWidth: 4,
        borderColor: '#34C759',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
        transform: [{ rotate: '-15deg' }],
        minHeight: 50, // Ensure height for text
    },
    nopeStamp: {
        position: 'absolute',
        top: '25%',
        right: 30,
        borderWidth: 4,
        borderColor: '#FF3B30',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
        transform: [{ rotate: '15deg' }],
        minHeight: 50, // Ensure height for text
    },
    stampText: {
        fontSize: 28,
        fontWeight: '900',
        lineHeight: 36, // Increased to prevent clipping
        textAlign: 'center',
    },
});
