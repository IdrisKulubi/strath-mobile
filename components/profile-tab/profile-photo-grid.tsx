import React from 'react';
import { View, StyleSheet, Dimensions, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { CachedImage } from '@/components/ui/cached-image';
import { RADIUS, SPACING } from '@/lib/design-tokens';
import { useTheme } from '@/hooks/use-theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PADDING = SPACING.screenX;
const GAP = SPACING.tight;
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
    const { colors } = useTheme();
    const validPhotos = photos.filter(Boolean) as string[];
    const heroPhoto = validPhotos[0];
    const gridPhotos = validPhotos.slice(1, 5);

    return (
        <Animated.View entering={FadeInDown.duration(280)} style={styles.container}>
            <View style={styles.grid}>
                <Pressable
                    onPress={() => (heroPhoto ? onPhotoPress?.(heroPhoto, 0) : onEditPress?.())}
                    style={styles.heroWrap}
                >
                    <View style={[styles.heroCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                        {heroPhoto ? (
                            <CachedImage uri={heroPhoto} style={styles.heroImage} contentFit="cover" />
                        ) : (
                            <View style={styles.heroPlaceholder}>
                                <Ionicons name="camera-outline" size={36} color={colors.mutedForeground} />
                            </View>
                        )}
                    </View>
                </Pressable>

                <View style={styles.smallGrid}>
                    {gridPhotos.slice(0, 4).map((uri, i) => (
                        <Pressable
                            key={`grid-photo-${i}`}
                            onPress={() => onPhotoPress?.(uri, i + 1)}
                            style={[styles.smallWrap, { backgroundColor: colors.muted, borderColor: colors.border }]}
                        >
                            <CachedImage uri={uri} style={styles.smallImage} contentFit="cover" />
                        </Pressable>
                    ))}
                    {gridPhotos.length < 4 && onEditPress && (
                        <Pressable
                            onPress={onEditPress}
                            style={[styles.addSlot, { borderColor: colors.border, backgroundColor: colors.muted }]}
                            accessibilityLabel="Add photo"
                        >
                            <Ionicons name="add" size={24} color={colors.mutedForeground} />
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
        marginBottom: SPACING.section,
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
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        overflow: 'hidden',
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    heroPlaceholder: {
        flex: 1,
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
        borderRadius: RADIUS.md,
        borderWidth: 1,
        overflow: 'hidden',
    },
    smallImage: {
        width: '100%',
        height: '100%',
    },
    addSlot: {
        width: SMALL_SIZE,
        height: SMALL_HEIGHT,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
