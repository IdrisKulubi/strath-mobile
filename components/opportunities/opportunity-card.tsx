import React from 'react';
import { View, Pressable, StyleSheet, Image } from 'react-native';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { type Opportunity, CATEGORY_CONFIG } from '@/types/opportunities';
import { formatDistanceToNow } from 'date-fns';
import * as Haptics from 'expo-haptics';

interface OpportunityCardProps {
    opportunity: Opportunity;
    onPress: () => void;
    onSave?: () => void;
    compact?: boolean;
}

export function OpportunityCard({ 
    opportunity, 
    onPress, 
    onSave,
    compact = false 
}: OpportunityCardProps) {
    const categoryConfig = CATEGORY_CONFIG[opportunity.category];
    
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
        if (daysUntil === 0) return { text: "Due Today!", isUrgent: true };
        if (daysUntil <= 3) return { text: `${daysUntil}d left`, isUrgent: true };
        if (daysUntil <= 7) return { text: `${daysUntil} days left`, isUrgent: false };
        return { text: formatDistanceToNow(deadline, { addSuffix: true }), isUrgent: false };
    };

    const deadline = formatDeadline();

    if (compact) {
        return (
            <Pressable 
                onPress={onPress}
                style={({ pressed }) => [
                    styles.compactCard,
                    pressed && styles.cardPressed
                ]}
            >
                <View style={[styles.categoryDot, { backgroundColor: categoryConfig.color }]} />
                <View style={styles.compactContent}>
                    <Text style={styles.compactTitle} numberOfLines={1}>{opportunity.title}</Text>
                    <Text style={styles.compactOrg} numberOfLines={1}>{opportunity.organization}</Text>
                </View>
                {deadline && (
                    <Text style={[styles.compactDeadline, deadline.isUrgent && styles.urgentText]}>
                        {deadline.text}
                    </Text>
                )}
            </Pressable>
        );
    }

    return (
        <Pressable 
            onPress={onPress}
            style={({ pressed }) => [
                styles.card,
                opportunity.isFeatured && styles.featuredCard,
                pressed && styles.cardPressed
            ]}
        >
            {/* Header with Category Badge & Save */}
            <View style={styles.header}>
                <View style={[styles.categoryBadge, { backgroundColor: categoryConfig.bgColor }]}>
                    <Text style={styles.categoryEmoji}>{categoryConfig.emoji}</Text>
                    <Text style={[styles.categoryLabel, { color: categoryConfig.color }]}>
                        {categoryConfig.label}
                    </Text>
                </View>
                {opportunity.isFeatured && (
                    <View style={styles.featuredBadge}>
                        <Ionicons name="star" size={12} color="#F59E0B" />
                        <Text style={styles.featuredText}>Featured</Text>
                    </View>
                )}
                <Pressable onPress={handleSave} style={styles.saveButton} hitSlop={10}>
                    <Ionicons 
                        name={opportunity.isSaved ? "bookmark" : "bookmark-outline"} 
                        size={22} 
                        color={opportunity.isSaved ? "#E91E8C" : "#9CA3AF"} 
                    />
                </Pressable>
            </View>

            {/* Title & Organization */}
            <View style={styles.titleRow}>
                {opportunity.logo ? (
                    <Image 
                        source={{ uri: opportunity.logo }} 
                        style={styles.logo} 
                        resizeMode="contain"
                    />
                ) : (
                    <View style={[styles.logoPlaceholder, { backgroundColor: categoryConfig.bgColor }]}>
                        <Text style={styles.logoInitial}>
                            {opportunity.organization.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                )}
                <View style={styles.titleContent}>
                    <Text style={styles.title} numberOfLines={2}>{opportunity.title}</Text>
                    <Text style={styles.organization} numberOfLines={1}>{opportunity.organization}</Text>
                </View>
            </View>

            {/* Quick Info */}
            <View style={styles.infoRow}>
                {opportunity.location && (
                    <View style={styles.infoItem}>
                        <Ionicons name="location-outline" size={14} color="#6B7280" />
                        <Text style={styles.infoText} numberOfLines={1}>{opportunity.location}</Text>
                    </View>
                )}
                {opportunity.locationType && (
                    <View style={[styles.locationTypeBadge, 
                        opportunity.locationType === 'remote' && styles.remoteBadge,
                        opportunity.locationType === 'hybrid' && styles.hybridBadge
                    ]}>
                        <Text style={styles.locationTypeText}>
                            {opportunity.locationType.charAt(0).toUpperCase() + opportunity.locationType.slice(1)}
                        </Text>
                    </View>
                )}
            </View>

            {/* Salary/Stipend */}
            {(opportunity.salary || opportunity.stipend) && (
                <View style={styles.compensationRow}>
                    <Ionicons name="cash-outline" size={14} color="#059669" />
                    <Text style={styles.compensationText}>
                        {opportunity.salary || opportunity.stipend}
                    </Text>
                </View>
            )}

            {/* Footer with Deadline */}
            <View style={styles.footer}>
                <Text style={styles.postedAt}>
                    Posted {formatDistanceToNow(new Date(opportunity.postedAt), { addSuffix: true })}
                </Text>
                {deadline && (
                    <View style={[styles.deadlineBadge, deadline.isUrgent && styles.urgentBadge]}>
                        <Ionicons 
                            name="time-outline" 
                            size={12} 
                            color={deadline.isUrgent ? "#DC2626" : "#6B7280"} 
                        />
                        <Text style={[styles.deadlineText, deadline.isUrgent && styles.urgentText]}>
                            {deadline.text}
                        </Text>
                    </View>
                )}
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    featuredCard: {
        borderWidth: 1.5,
        borderColor: '#FEF3C7',
    },
    cardPressed: {
        opacity: 0.95,
        transform: [{ scale: 0.99 }],
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    categoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        gap: 4,
    },
    categoryEmoji: {
        fontSize: 12,
    },
    categoryLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    featuredBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 8,
        gap: 3,
    },
    featuredText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#F59E0B',
    },
    saveButton: {
        marginLeft: 'auto',
        padding: 4,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 10,
    },
    logo: {
        width: 44,
        height: 44,
        borderRadius: 10,
        backgroundColor: '#F3F4F6',
    },
    logoPlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoInitial: {
        fontSize: 18,
        fontWeight: '700',
        color: '#374151',
    },
    titleContent: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
        lineHeight: 22,
    },
    organization: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 2,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        flex: 1,
    },
    infoText: {
        fontSize: 13,
        color: '#6B7280',
        flex: 1,
    },
    locationTypeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        backgroundColor: '#F3F4F6',
    },
    remoteBadge: {
        backgroundColor: '#DBEAFE',
    },
    hybridBadge: {
        backgroundColor: '#F3E8FF',
    },
    locationTypeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#374151',
    },
    compensationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 10,
    },
    compensationText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#059669',
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    postedAt: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    deadlineBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        backgroundColor: '#F3F4F6',
    },
    urgentBadge: {
        backgroundColor: '#FEE2E2',
    },
    deadlineText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#6B7280',
    },
    urgentText: {
        color: '#DC2626',
    },
    // Compact styles
    compactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        gap: 10,
    },
    categoryDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    compactContent: {
        flex: 1,
    },
    compactTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
    },
    compactOrg: {
        fontSize: 12,
        color: '#6B7280',
    },
    compactDeadline: {
        fontSize: 11,
        color: '#6B7280',
        fontWeight: '500',
    },
});
