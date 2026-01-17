import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function SkeletonBox({ 
    width, 
    height, 
    borderRadius = 8,
    style,
}: { 
    width: number | string; 
    height: number; 
    borderRadius?: number;
    style?: object;
}) {
    const { colorScheme } = useTheme();
    const shimmer = useSharedValue(0);

    useEffect(() => {
        shimmer.value = withRepeat(
            withTiming(1, { duration: 1200 }),
            -1,
            false
        );
    }, [shimmer]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            {
                translateX: interpolate(
                    shimmer.value,
                    [0, 1],
                    [-SCREEN_WIDTH, SCREEN_WIDTH]
                ),
            },
        ],
    }));

    const isDark = colorScheme === 'dark';
    const baseColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    const shimmerColor = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.8)';

    return (
        <View
            style={[
                {
                    width: width as any,
                    height,
                    borderRadius,
                    backgroundColor: baseColor,
                    overflow: 'hidden',
                },
                style,
            ]}
        >
            <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
                <LinearGradient
                    colors={['transparent', shimmerColor, 'transparent']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={StyleSheet.absoluteFill}
                />
            </Animated.View>
        </View>
    );
}

export function OpportunityCardSkeleton() {
    const { colorScheme } = useTheme();
    const isDark = colorScheme === 'dark';

    return (
        <View style={[
            styles.card, 
            { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF' }
        ]}>
            {/* Header */}
            <View style={styles.header}>
                <SkeletonBox width={100} height={28} borderRadius={14} />
                <SkeletonBox width={32} height={32} borderRadius={16} />
            </View>

            {/* Title */}
            <SkeletonBox width="90%" height={22} borderRadius={6} style={{ marginTop: 16 }} />
            
            {/* Organization */}
            <SkeletonBox width="60%" height={16} borderRadius={4} style={{ marginTop: 10 }} />

            {/* Description */}
            <View style={{ marginTop: 14, gap: 8 }}>
                <SkeletonBox width="100%" height={14} borderRadius={4} />
                <SkeletonBox width="85%" height={14} borderRadius={4} />
            </View>

            {/* Tags */}
            <View style={styles.tagsRow}>
                <SkeletonBox width={80} height={26} borderRadius={13} />
                <SkeletonBox width={70} height={26} borderRadius={13} />
                <SkeletonBox width={90} height={26} borderRadius={13} />
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <SkeletonBox width={100} height={16} borderRadius={4} />
                <SkeletonBox width={80} height={16} borderRadius={4} />
            </View>
        </View>
    );
}

export function OpportunityListSkeleton({ count = 4 }: { count?: number }) {
    return (
        <View style={styles.listContainer}>
            {Array.from({ length: count }).map((_, index) => (
                <OpportunityCardSkeleton key={index} />
            ))}
        </View>
    );
}

// Category filter skeleton
export function CategoryFilterSkeleton() {
    const { colorScheme } = useTheme();
    const isDark = colorScheme === 'dark';
    const shimmer = useSharedValue(0);

    useEffect(() => {
        shimmer.value = withRepeat(
            withTiming(1, { duration: 1200 }),
            -1,
            false
        );
    }, [shimmer]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            {
                translateX: interpolate(
                    shimmer.value,
                    [0, 1],
                    [-SCREEN_WIDTH, SCREEN_WIDTH]
                ),
            },
        ],
    }));

    const baseColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    const shimmerColor = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.8)';

    return (
        <View style={styles.filterContainer}>
            {[80, 100, 90, 85, 95].map((width, index) => (
                <View
                    key={index}
                    style={[
                        styles.filterChip,
                        { backgroundColor: baseColor },
                    ]}
                >
                    <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
                        <LinearGradient
                            colors={['transparent', shimmerColor, 'transparent']}
                            start={{ x: 0, y: 0.5 }}
                            end={{ x: 1, y: 0.5 }}
                            style={StyleSheet.absoluteFill}
                        />
                    </Animated.View>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    listContainer: {
        paddingHorizontal: 16,
        gap: 16,
        paddingBottom: 100,
    },
    card: {
        borderRadius: 20,
        padding: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    tagsRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 16,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    filterContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 16,
        gap: 10,
    },
    filterChip: {
        width: 90,
        height: 44,
        borderRadius: 24,
        overflow: 'hidden',
    },
});
