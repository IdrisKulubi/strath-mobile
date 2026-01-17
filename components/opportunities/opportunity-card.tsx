import React from 'react';
import { View, Pressable, StyleSheet, Image } from 'react-native';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';
import { type Opportunity, CATEGORY_CONFIG } from '@/types/opportunities';
import { formatDistanceToNow, format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
    useAnimatedStyle, 
    withSpring,
    useSharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface OpportunityCardProps {
    opportunity: Opportunity;
    onPress: () => void;
    onSave?: () => void;
    compact?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function OpportunityCard({ 
    opportunity, 
    onPress, 
    onSave,
    compact = false 
}: OpportunityCardProps) {
    const { colors, colorScheme } = useTheme();
    const isDark = colorScheme === 'dark';
    const categoryConfig = CATEGORY_CONFIG[opportunity.category];
    const scale = useSharedValue(1);
    
    const handlePressIn = () => {
        scale.value = withSpring(0.98);
    };

    const handlePressOut = () => {
        scale.value = withSpring(1);
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handleSave = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSave?.();
    };

    const formatDeadline = () => {
        if (!opportunity.deadline) return null;
        const deadline = new Date(opportunity.deadline);
        const now = new Date();
        const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntil < 0) return { text: "Closed", isUrgent: true };
        if (daysUntil === 0) return { text: "Due today!", isUrgent: true };
        if (daysUntil === 1) return { text: "Tomorrow", isUrgent: true };
        if (daysUntil <= 7) return { text: `in ${daysUntil} days`, isUrgent: daysUntil <= 3 };
        return { text: `in ${format(deadline, 'MMM d')}`, isUrgent: false };
    };

    const deadline = formatDeadline();

    if (compact) {
        return (
            <Pressable 
                onPress={onPress}
                style={({ pressed }) => [
                    styles.compactCard,
                    { 
                        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
                        borderWidth: isDark ? 0 : 1,
                        borderColor: isDark ? 'transparent' : '#E5E7EB',
                    },
                    pressed && styles.cardPressed
                ]}
            >
                <View style={[styles.compactAccent, { backgroundColor: categoryConfig.color }]} />
                <View style={styles.compactContent}>
                    <Text style={[styles.compactTitle, { color: colors.foreground }]} numberOfLines={1}>
                        {opportunity.title}
                    </Text>
                    <Text style={[styles.compactOrg, { color: colors.mutedForeground }]} numberOfLines={1}>
                        {opportunity.organization}
                    </Text>
                </View>
                {deadline && (
                    <View style={[
                        styles.compactDeadlineBadge,
                        { backgroundColor: deadline.isUrgent ? '#FEE2E2' : (isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6') }
                    ]}>
                        <Text style={[
                            styles.compactDeadlineText,
                            { color: deadline.isUrgent ? '#DC2626' : colors.mutedForeground }
                        ]}>
                            {deadline.text}
                        </Text>
                    </View>
                )}
            </Pressable>
        );
    }

    return (
        <AnimatedPressable 
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={[animatedStyle, { marginBottom: 16 }]}
        >
            <View style={[
                styles.card,
                { 
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
                    borderWidth: isDark ? 0 : 1,
                    borderColor: isDark ? 'transparent' : '#E5E7EB',
                },
                opportunity.isFeatured && styles.featuredCard,
            ]}>
                {/* Featured Gradient Accent */}
                {opportunity.isFeatured && (
                    <LinearGradient
                        colors={[categoryConfig.color, adjustColor(categoryConfig.color, 40)]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.featuredAccent}
                    />
                )}

                {/* Top Row: Category + Featured + Save */}
                <View style={styles.topRow}>
                    <View style={[
                        styles.categoryPill,
                        { backgroundColor: isDark ? `${categoryConfig.color}20` : categoryConfig.bgColor }
                    ]}>
                        <Text style={styles.categoryEmoji}>{categoryConfig.emoji}</Text>
                        <Text style={[styles.categoryText, { color: categoryConfig.color }]}>
                            {categoryConfig.label}
                        </Text>
                    </View>
                    
                    {opportunity.isFeatured && (
                        <View style={styles.featuredPill}>
                            <Ionicons name="star" size={11} color="#F59E0B" />
                            <Text style={styles.featuredText}>Featured</Text>
                        </View>
                    )}
                    
                    <Pressable 
                        onPress={handleSave} 
                        style={styles.saveBtn}
                        hitSlop={12}
                    >
                        <Ionicons 
                            name={opportunity.isSaved ? "bookmark" : "bookmark-outline"} 
                            size={20} 
                            color={opportunity.isSaved ? colors.primary : colors.mutedForeground} 
                        />
                    </Pressable>
                </View>

                {/* Main Content */}
                <View style={styles.mainContent}>
                    {/* Logo */}
                    {opportunity.logo ? (
                        <Image 
                            source={{ uri: opportunity.logo }} 
                            style={styles.logo} 
                            resizeMode="cover"
                        />
                    ) : (
                        <LinearGradient
                            colors={[categoryConfig.color, adjustColor(categoryConfig.color, -20)]}
                            style={styles.logoPlaceholder}
                        >
                            <Text style={styles.logoLetter}>
                                {opportunity.organization.charAt(0).toUpperCase()}
                            </Text>
                        </LinearGradient>
                    )}

                    {/* Title & Org */}
                    <View style={styles.titleSection}>
                        <Text 
                            style={[styles.title, { color: colors.primary }]} 
                            numberOfLines={2}
                        >
                            {opportunity.title}
                        </Text>
                        <Text 
                            style={[styles.organization, { color: colors.mutedForeground }]} 
                            numberOfLines={1}
                        >
                            {opportunity.organization}
                        </Text>
                    </View>
                </View>

                {/* Location Row */}
                {(opportunity.location || opportunity.locationType) && (
                    <View style={styles.locationRow}>
                        {opportunity.location && (
                            <View style={styles.locationItem}>
                                <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
                                <Text style={[styles.locationText, { color: colors.mutedForeground }]} numberOfLines={1}>
                                    {opportunity.location}
                                </Text>
                            </View>
                        )}
                        {opportunity.locationType && (
                            <View style={[
                                styles.locationTypePill,
                                { 
                                    backgroundColor: opportunity.locationType === 'remote' 
                                        ? (isDark ? '#1E3A5F' : '#DBEAFE')
                                        : opportunity.locationType === 'hybrid'
                                        ? (isDark ? '#3D2E5F' : '#F3E8FF')
                                        : (isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6')
                                }
                            ]}>
                                <Text style={[
                                    styles.locationTypeText,
                                    { 
                                        color: opportunity.locationType === 'remote' 
                                            ? '#3B82F6'
                                            : opportunity.locationType === 'hybrid'
                                            ? '#8B5CF6'
                                            : colors.foreground
                                    }
                                ]}>
                                    {opportunity.locationType.charAt(0).toUpperCase() + opportunity.locationType.slice(1)}
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Compensation */}
                {(opportunity.salary || opportunity.stipend) && (
                    <View style={styles.compensationRow}>
                        <Ionicons name="cash-outline" size={15} color="#10B981" />
                        <Text style={styles.compensationText}>
                            {opportunity.salary || opportunity.stipend}
                        </Text>
                    </View>
                )}

                {/* Footer */}
                <View style={[styles.footer, { borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6' }]}>
                    <Text style={[styles.postedTime, { color: colors.mutedForeground }]}>
                        Posted {formatDistanceToNow(new Date(opportunity.postedAt), { addSuffix: true })}
                    </Text>
                    
                    {deadline && (
                        <View style={[
                            styles.deadlinePill,
                            { 
                                backgroundColor: deadline.isUrgent 
                                    ? (isDark ? '#5C2626' : '#FEE2E2')
                                    : (isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6')
                            }
                        ]}>
                            <Ionicons 
                                name="time-outline" 
                                size={12} 
                                color={deadline.isUrgent ? '#EF4444' : colors.mutedForeground} 
                            />
                            <Text style={[
                                styles.deadlineText,
                                { color: deadline.isUrgent ? '#EF4444' : colors.mutedForeground }
                            ]}>
                                {deadline.text}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </AnimatedPressable>
    );
}

// Helper to adjust color brightness
function adjustColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, Math.max(0, (num >> 16) + amt));
    const G = Math.min(255, Math.max(0, (num >> 8 & 0x00FF) + amt));
    const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 20,
        padding: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    featuredCard: {
        borderWidth: 0,
    },
    featuredAccent: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
    },
    cardPressed: {
        opacity: 0.9,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
    },
    categoryPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 5,
    },
    categoryEmoji: {
        fontSize: 13,
    },
    categoryText: {
        fontSize: 12,
        fontWeight: '700',
    },
    featuredPill: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: '#FEF3C7',
        borderRadius: 12,
        gap: 4,
    },
    featuredText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#D97706',
    },
    saveBtn: {
        marginLeft: 'auto',
        padding: 4,
    },
    mainContent: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 14,
        marginBottom: 12,
    },
    logo: {
        width: 50,
        height: 50,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
    },
    logoPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoLetter: {
        fontSize: 22,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    titleSection: {
        flex: 1,
        gap: 4,
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
        lineHeight: 22,
    },
    organization: {
        fontSize: 14,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 10,
    },
    locationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        flex: 1,
    },
    locationText: {
        fontSize: 13,
        flex: 1,
    },
    locationTypePill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    locationTypeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    compensationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 12,
    },
    compensationText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#10B981',
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 12,
        borderTopWidth: 1,
    },
    postedTime: {
        fontSize: 12,
    },
    deadlinePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
    },
    deadlineText: {
        fontSize: 12,
        fontWeight: '600',
    },
    // Compact Card Styles
    compactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    compactAccent: {
        width: 4,
        height: 36,
        borderRadius: 2,
        marginRight: 12,
    },
    compactContent: {
        flex: 1,
    },
    compactTitle: {
        fontSize: 15,
        fontWeight: '600',
    },
    compactOrg: {
        fontSize: 13,
        marginTop: 2,
    },
    compactDeadlineBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    compactDeadlineText: {
        fontSize: 11,
        fontWeight: '600',
    },
});
