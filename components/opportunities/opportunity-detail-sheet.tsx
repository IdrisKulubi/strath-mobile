import React from 'react';
import { 
    View, 
    ScrollView, 
    Pressable, 
    StyleSheet, 
    Linking,
    Share,
    Platform,
    Dimensions 
} from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Ionicons } from '@expo/vector-icons';
import { type Opportunity, CATEGORY_CONFIG } from '@/types/opportunities';
import { formatDistanceToNow, format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface OpportunityDetailSheetProps {
    opportunity: Opportunity | null;
    visible: boolean;
    onClose: () => void;
    onSave?: () => void;
}

export function OpportunityDetailSheet({ 
    opportunity, 
    visible, 
    onClose,
    onSave 
}: OpportunityDetailSheetProps) {
    if (!opportunity || !visible) return null;

    const categoryConfig = CATEGORY_CONFIG[opportunity.category];

    const handleApply = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (opportunity.applicationUrl) {
            await Linking.openURL(opportunity.applicationUrl);
        }
    };

    const handleShare = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            await Share.share({
                title: opportunity.title,
                message: `Check out this opportunity: ${opportunity.title} at ${opportunity.organization}${opportunity.applicationUrl ? `\n\nApply here: ${opportunity.applicationUrl}` : ''}`,
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    const handleContact = (type: 'email' | 'phone') => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (type === 'email' && opportunity.contactEmail) {
            Linking.openURL(`mailto:${opportunity.contactEmail}`);
        } else if (type === 'phone' && opportunity.contactPhone) {
            Linking.openURL(`tel:${opportunity.contactPhone}`);
        }
    };

    const formatDeadline = () => {
        if (!opportunity.deadline) return null;
        const deadline = new Date(opportunity.deadline);
        return format(deadline, "MMMM d, yyyy 'at' h:mm a");
    };

    return (
        <View style={styles.overlay}>
            <Pressable style={styles.backdrop} onPress={onClose} />
            <Animated.View 
                entering={FadeInDown.springify()}
                style={styles.sheet}
            >
                {/* Handle */}
                <View style={styles.handleContainer}>
                    <View style={styles.handle} />
                </View>

                <ScrollView 
                    style={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={[styles.categoryBadge, { backgroundColor: categoryConfig.bgColor }]}>
                            <Text style={styles.categoryEmoji}>{categoryConfig.emoji}</Text>
                            <Text style={[styles.categoryLabel, { color: categoryConfig.color }]}>
                                {categoryConfig.label}
                            </Text>
                        </View>
                        <View style={styles.headerActions}>
                            <Pressable onPress={onSave} style={styles.iconButton}>
                                <Ionicons 
                                    name={opportunity.isSaved ? "bookmark" : "bookmark-outline"} 
                                    size={24} 
                                    color={opportunity.isSaved ? "#E91E8C" : "#6B7280"} 
                                />
                            </Pressable>
                            <Pressable onPress={handleShare} style={styles.iconButton}>
                                <Ionicons name="share-outline" size={24} color="#6B7280" />
                            </Pressable>
                            <Pressable onPress={onClose} style={styles.iconButton}>
                                <Ionicons name="close" size={24} color="#6B7280" />
                            </Pressable>
                        </View>
                    </View>

                    {/* Title & Organization */}
                    <Text style={styles.title}>{opportunity.title}</Text>
                    <Text style={styles.organization}>{opportunity.organization}</Text>

                    {/* Quick Info Pills */}
                    <View style={styles.pillsContainer}>
                        {opportunity.location && (
                            <View style={styles.pill}>
                                <Ionicons name="location" size={14} color="#6B7280" />
                                <Text style={styles.pillText}>{opportunity.location}</Text>
                            </View>
                        )}
                        {opportunity.locationType && (
                            <View style={[styles.pill, 
                                opportunity.locationType === 'remote' && styles.remotePill,
                                opportunity.locationType === 'hybrid' && styles.hybridPill
                            ]}>
                                <Ionicons 
                                    name={opportunity.locationType === 'remote' ? 'globe-outline' : 'business-outline'} 
                                    size={14} 
                                    color={opportunity.locationType === 'remote' ? '#3B82F6' : '#8B5CF6'} 
                                />
                                <Text style={[styles.pillText,
                                    opportunity.locationType === 'remote' && styles.remoteText,
                                    opportunity.locationType === 'hybrid' && styles.hybridText
                                ]}>
                                    {opportunity.locationType.charAt(0).toUpperCase() + opportunity.locationType.slice(1)}
                                </Text>
                            </View>
                        )}
                        {opportunity.duration && (
                            <View style={styles.pill}>
                                <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                                <Text style={styles.pillText}>{opportunity.duration}</Text>
                            </View>
                        )}
                        {opportunity.slots && (
                            <View style={styles.pill}>
                                <Ionicons name="people-outline" size={14} color="#6B7280" />
                                <Text style={styles.pillText}>{opportunity.slots} positions</Text>
                            </View>
                        )}
                    </View>

                    {/* Deadline Alert */}
                    {opportunity.deadline && (
                        <View style={styles.deadlineCard}>
                            <Ionicons name="alarm" size={20} color="#DC2626" />
                            <View>
                                <Text style={styles.deadlineLabel}>Application Deadline</Text>
                                <Text style={styles.deadlineValue}>{formatDeadline()}</Text>
                            </View>
                        </View>
                    )}

                    {/* Compensation */}
                    {(opportunity.salary || opportunity.stipend) && (
                        <View style={styles.compensationCard}>
                            <Ionicons name="cash" size={20} color="#059669" />
                            <View>
                                <Text style={styles.compensationLabel}>
                                    {opportunity.salary ? 'Salary' : 'Stipend'}
                                </Text>
                                <Text style={styles.compensationValue}>
                                    {opportunity.salary || opportunity.stipend}
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Description */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>About This Opportunity</Text>
                        <Text style={styles.description}>{opportunity.description}</Text>
                    </View>

                    {/* Requirements */}
                    {opportunity.requirements && opportunity.requirements.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Requirements</Text>
                            {opportunity.requirements.map((req, index) => (
                                <View key={index} style={styles.requirementItem}>
                                    <View style={styles.bulletPoint} />
                                    <Text style={styles.requirementText}>{req}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Tags */}
                    {opportunity.tags && opportunity.tags.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Tags</Text>
                            <View style={styles.tagsContainer}>
                                {opportunity.tags.map((tag, index) => (
                                    <View key={index} style={styles.tag}>
                                        <Text style={styles.tagText}>#{tag}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Contact Info */}
                    {(opportunity.contactEmail || opportunity.contactPhone) && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Contact</Text>
                            <View style={styles.contactButtons}>
                                {opportunity.contactEmail && (
                                    <Pressable 
                                        onPress={() => handleContact('email')}
                                        style={styles.contactButton}
                                    >
                                        <Ionicons name="mail-outline" size={18} color="#3B82F6" />
                                        <Text style={styles.contactButtonText}>Email</Text>
                                    </Pressable>
                                )}
                                {opportunity.contactPhone && (
                                    <Pressable 
                                        onPress={() => handleContact('phone')}
                                        style={styles.contactButton}
                                    >
                                        <Ionicons name="call-outline" size={18} color="#3B82F6" />
                                        <Text style={styles.contactButtonText}>Call</Text>
                                    </Pressable>
                                )}
                            </View>
                        </View>
                    )}

                    {/* Footer Info */}
                    <View style={styles.footerInfo}>
                        <Text style={styles.footerText}>
                            Posted {formatDistanceToNow(new Date(opportunity.postedAt), { addSuffix: true })}
                        </Text>
                        <Text style={styles.footerText}>•</Text>
                        <Text style={styles.footerText}>{opportunity.viewCount} views</Text>
                    </View>

                    {/* Bottom Padding */}
                    <View style={{ height: 100 }} />
                </ScrollView>

                {/* Apply Button */}
                {opportunity.applicationUrl && (
                    <View style={styles.applyContainer}>
                        <Button
                            onPress={handleApply}
                            size="lg"
                            className="flex-1 h-14 rounded-full bg-pink-500"
                        >
                            <Ionicons name="open-outline" size={20} color="#FFFFFF" />
                            <Text className="text-white font-bold text-base ml-2">Apply Now</Text>
                        </Button>
                    </View>
                )}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: SCREEN_HEIGHT * 0.9,
    },
    handleContainer: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: '#D1D5DB',
        borderRadius: 2,
    },
    content: {
        paddingHorizontal: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    categoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    categoryEmoji: {
        fontSize: 14,
    },
    categoryLabel: {
        fontSize: 13,
        fontWeight: '600',
    },
    headerActions: {
        flexDirection: 'row',
        gap: 8,
    },
    iconButton: {
        padding: 8,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#111827',
        lineHeight: 32,
    },
    organization: {
        fontSize: 16,
        color: '#6B7280',
        marginTop: 4,
        marginBottom: 16,
    },
    pillsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    remotePill: {
        backgroundColor: '#DBEAFE',
    },
    hybridPill: {
        backgroundColor: '#F3E8FF',
    },
    pillText: {
        fontSize: 13,
        color: '#4B5563',
        fontWeight: '500',
    },
    remoteText: {
        color: '#3B82F6',
    },
    hybridText: {
        color: '#8B5CF6',
    },
    deadlineCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEE2E2',
        padding: 14,
        borderRadius: 12,
        gap: 12,
        marginBottom: 12,
    },
    deadlineLabel: {
        fontSize: 12,
        color: '#991B1B',
        fontWeight: '500',
    },
    deadlineValue: {
        fontSize: 14,
        color: '#DC2626',
        fontWeight: '700',
    },
    compensationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#D1FAE5',
        padding: 14,
        borderRadius: 12,
        gap: 12,
        marginBottom: 16,
    },
    compensationLabel: {
        fontSize: 12,
        color: '#065F46',
        fontWeight: '500',
    },
    compensationValue: {
        fontSize: 16,
        color: '#059669',
        fontWeight: '700',
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 10,
    },
    description: {
        fontSize: 15,
        color: '#4B5563',
        lineHeight: 24,
    },
    requirementItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
        gap: 10,
    },
    bulletPoint: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#E91E8C',
        marginTop: 8,
    },
    requirementText: {
        flex: 1,
        fontSize: 14,
        color: '#4B5563',
        lineHeight: 22,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tag: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    tagText: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
    },
    contactButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    contactButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        gap: 8,
    },
    contactButtonText: {
        fontSize: 14,
        color: '#3B82F6',
        fontWeight: '600',
    },
    footerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
    },
    footerText: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    applyContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 34 : 16,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
});
