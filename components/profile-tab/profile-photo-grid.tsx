import React from 'react';
import { View, StyleSheet, Dimensions, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { CachedImage } from '@/components/ui/cached-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PADDING = 20;
const GAP = 10;
const CONTENT_WIDTH = SCREEN_WIDTH - PADDING * 2;
const HERO_WIDTH = (CONTENT_WIDTH - GAP) * 0.58;
const HERO_HEIGHT = 220;
const SMALL_GRID_WIDTH = CONTENT_WIDTH - HERO_WIDTH - GAP;
const SMALL_SIZE = (SMALL_GRID_WIDTH - GAP) / 2;
const SMALL_HEIGHT = (HERO_HEIGHT - GAP) / 2;

interface ProfilePhotoGridProps {
    photos: (string | undefined | null)[];
    onPhotoPress?: (uri: string, index: number) => void;
    onEditPress?: () => void;
}

export function ProfilePhotoGrid({ photos, onPhotoPress, onEditPress }: ProfilePhotoGridProps) {
    const { colors, isDark } = useTheme();
    const validPhotos = photos.filter(Boolean) as string[];
    const heroPhoto = validPhotos[0];
    const gridPhotos = validPhotos.slice(1, 5);

    return (
        <Animated.View entering={FadeInDown.delay(220).springify().damping(14)} style={styles.container}>
            <View style={styles.grid}>
                {/* Hero image - dominant */}
                <Pressable
                    onPress={() => heroPhoto ? onPhotoPress?.(heroPhoto, 0) : onEditPress?.()}
                    style={styles.heroWrap}
                >
                    <View style={[styles.heroCard, { backgroundColor: isDark ? colors.muted : '#f3f4f6' }]}>
                        {heroPhoto ? (
                            <CachedImage uri={heroPhoto} style={styles.heroImage} contentFit="cover" />
                        ) : (
                            <View style={[styles.heroPlaceholder, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                                <Ionicons name="camera" size={40} color={colors.mutedForeground} />
                            </View>
                        )}
                        {heroPhoto && (
                            <LinearGradient
                                colors={['transparent', 'rgba(0,0,0,0.4)']}
                                style={styles.heroGradient}
                            />
                        )}
                        {onEditPress && heroPhoto && (
                            <Pressable
                                onPress={onEditPress}
                                style={[styles.editBadge, { backgroundColor: 'rgba(0,0,0,0.4)' }]}
                            >
                                <Ionicons name="pencil" size={14} color="#fff" />
                            </Pressable>
                        )}
                    </View>
                </Pressable>

                {/* Small grid */}
                <View style={styles.smallGrid}>
                    {gridPhotos.slice(0, 4).map((uri, i) => (
                        <Pressable
                            key={i}
                            onPress={() => onPhotoPress?.(uri, i + 1)}
                            style={[styles.smallWrap, { backgroundColor: isDark ? colors.muted : '#f3f4f6' }]}
                        >
                            <CachedImage uri={uri} style={styles.smallImage} contentFit="cover" />
                        </Pressable>
                    ))}
                    {gridPhotos.length < 4 && onEditPress && (
                        <Pressable
                            onPress={onEditPress}
                            style={[styles.addSlot, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: colors.border }]}
                        >
                            <Ionicons name="add" size={28} color={colors.mutedForeground} />
                        </Pressable>
                    )}
                </View>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: PADDING,
        marginBottom: 24,
    },
    grid: {
        flexDirection: 'row',
        gap: GAP,
    },
    heroWrap: {
        width: HERO_WIDTH,
    },
    heroCard: {
        width: '100%',
        height: HERO_HEIGHT,
        borderRadius: 20,
        overflow: 'hidden',
        position: 'relative',
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    heroPlaceholder: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 60,
    },
    editBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    smallGrid: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: GAP,
    },
    smallWrap: {
        width: SMALL_SIZE,
        height: SMALL_HEIGHT,
        borderRadius: 14,
        overflow: 'hidden',
    },
    smallImage: {
        width: '100%',
        height: '100%',
    },
    addSlot: {
        width: SMALL_SIZE,
        height: SMALL_HEIGHT,
        borderRadius: 14,
        borderWidth: 2,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
