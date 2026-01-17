import React, { useEffect } from 'react';
import { 
    View, 
    ScrollView, 
    Pressable, 
    StyleSheet, 
    Linking,
    Share,
    Platform,
    Dimensions,
    useColorScheme 
} from 'react-native';
import { Colors } from '@/constants/theme';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { type Opportunity, CATEGORY_CONFIG } from '@/types/opportunities';
import { formatDistanceToNow, format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import Animated, { 
    FadeInDown, 
    SlideOutRight,
    useSharedValue, 
    useAnimatedStyle, 
    withSpring,
    runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

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
    const colorScheme = useColorScheme() ?? 'dark';
    const isDark = colorScheme === 'dark';
    const colors = Colors[colorScheme];
    
    const translateX = useSharedValue(0);
    const opacity = useSharedValue(1);

    // Reset values when sheet becomes visible
    useEffect(() => {
        if (visible) {
            translateX.value = 0;
            opacity.value = 1;
        }
    }, [visible, translateX, opacity]);

    const animatedSheetStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
        opacity: opacity.value,
    }));

    // Early return AFTER hooks
    if (!opportunity || !visible) return null;

    const categoryConfig = CATEGORY_CONFIG[opportunity.category];

    const dismissSheet = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onClose();
    };

    const panGesture = Gesture.Pan()
        .activeOffsetX(20)
        .onUpdate((event) => {
            // Only allow right swipe (positive X)
            if (event.translationX > 0) {
                translateX.value = event.translationX;
                opacity.value = 1 - (event.translationX / SCREEN_WIDTH) * 0.5;
            }
        })
        .onEnd((event) => {
            // If swiped more than 100px or with velocity > 500, dismiss
            if (event.translationX > 100 || event.velocityX > 500) {
                translateX.value = withSpring(SCREEN_WIDTH);
                opacity.value = withSpring(0);
                runOnJS(dismissSheet)();
            } else {
                // Snap back
                translateX.value = withSpring(0);
                opacity.value = withSpring(1);
            }
        });

    const handleApply = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (opportunity?.applicationUrl) {
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
            <GestureDetector gesture={panGesture}>
                <Animated.View 
                    entering={FadeInDown.springify()}
                    exiting={SlideOutRight.springify()}
                    style={[styles.sheet, animatedSheetStyle, { backgroundColor: isDark ? colors.card : '#FFFFFF' }]}
                >
                    {/* Swipe Indicator */}
                    <View style={styles.swipeIndicator}>
                        <Ionicons name="chevron-back" size={16} color="rgba(255,255,255,0.5)" />
                        <Text style={styles.swipeHint}>Swipe to go back</Text>
                    </View>

                    {/* Handle */}
                    <View style={styles.handleContainer}>
                        <View style={[styles.handle, { backgroundColor: isDark ? colors.border : '#D1D5DB' }]} />
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
                                    color={opportunity.isSaved ? colors.primary : colors.mutedForeground} 
                                />
                            </Pressable>
                            <Pressable onPress={handleShare} style={styles.iconButton}>
                                <Ionicons name="share-outline" size={24} color={colors.mutedForeground} />
                            </Pressable>
                            <Pressable onPress={onClose} style={styles.iconButton}>
                                <Ionicons name="close" size={24} color={colors.mutedForeground} />
                            </Pressable>
                        </View>
                    </View>

                    {/* Title & Organization */}
                    <Text style={[styles.title, { color: colors.foreground }]}>{opportunity.title}</Text>
                    <Text style={[styles.organization, { color: colors.mutedForeground }]}>{opportunity.organization}</Text>

                    {/* Quick Info Pills */}
                    <View style={styles.pillsContainer}>
                        {opportunity.location && (
                            <View style={[styles.pill, { backgroundColor: isDark ? colors.muted : '#F3F4F6' }]}>
                                <Ionicons name="location" size={14} color={colors.mutedForeground} />
                                <Text style={[styles.pillText, { color: isDark ? colors.mutedForeground : '#4B5563' }]}>{opportunity.location}</Text>
                            </View>
                        )}
                        {opportunity.locationType && (
                            <View style={[styles.pill, 
                                { backgroundColor: isDark ? colors.muted : '#F3F4F6' },
                                opportunity.locationType === 'remote' && (isDark ? { backgroundColor: 'rgba(59, 130, 246, 0.2)' } : styles.remotePill),
                                opportunity.locationType === 'hybrid' && (isDark ? { backgroundColor: 'rgba(139, 92, 246, 0.2)' } : styles.hybridPill)
                            ]}>
                                <Ionicons 
                                    name={opportunity.locationType === 'remote' ? 'globe-outline' : 'business-outline'} 
                                    size={14} 
                                    color={opportunity.locationType === 'remote' ? '#3B82F6' : '#8B5CF6'} 
                                />
                                <Text style={[styles.pillText,
                                    { color: isDark ? colors.mutedForeground : '#4B5563' },
                                    opportunity.locationType === 'remote' && styles.remoteText,
                                    opportunity.locationType === 'hybrid' && styles.hybridText
                                ]}>
                                    {opportunity.locationType.charAt(0).toUpperCase() + opportunity.locationType.slice(1)}
                                </Text>
                            </View>
                        )}
                        {opportunity.duration && (
                            <View style={[styles.pill, { backgroundColor: isDark ? colors.muted : '#F3F4F6' }]}>
                                <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
                                <Text style={[styles.pillText, { color: isDark ? colors.mutedForeground : '#4B5563' }]}>{opportunity.duration}</Text>
                            </View>
                        )}
                        {opportunity.slots && (
                            <View style={[styles.pill, { backgroundColor: isDark ? colors.muted : '#F3F4F6' }]}>
                                <Ionicons name="people-outline" size={14} color={colors.mutedForeground} />
                                <Text style={[styles.pillText, { color: isDark ? colors.mutedForeground : '#4B5563' }]}>{opportunity.slots} positions</Text>
                            </View>
                        )}
                    </View>

                    {/* Deadline Alert */}
                    {opportunity.deadline && (
                        <View style={[styles.deadlineCard, { backgroundColor: isDark ? 'rgba(220, 38, 38, 0.15)' : '#FEE2E2' }]}>
                            <Ionicons name="alarm" size={20} color="#DC2626" />
                            <View>
                                <Text style={[styles.deadlineLabel, { color: isDark ? '#FCA5A5' : '#991B1B' }]}>Application Deadline</Text>
                                <Text style={[styles.deadlineValue, { color: isDark ? '#F87171' : '#DC2626' }]}>{formatDeadline()}</Text>
                            </View>
                        </View>
                    )}

                    {/* Compensation */}
                    {(opportunity.salary || opportunity.stipend) && (
                        <View style={[styles.compensationCard, { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.15)' : '#D1FAE5' }]}>
                            <Ionicons name="cash" size={20} color="#059669" />
                            <View>
                                <Text style={[styles.compensationLabel, { color: isDark ? '#6EE7B7' : '#065F46' }]}>
                                    {opportunity.salary ? 'Salary' : 'Stipend'}
                                </Text>
                                <Text style={[styles.compensationValue, { color: isDark ? '#34D399' : '#059669' }]}>
                                    {opportunity.salary || opportunity.stipend}
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Description */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>About This Opportunity</Text>
                        <Text style={[styles.description, { color: isDark ? colors.mutedForeground : '#4B5563' }]}>{opportunity.description}</Text>
                    </View>

                    {/* Requirements */}
                    {opportunity.requirements && opportunity.requirements.length > 0 && (
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Requirements</Text>
                            {opportunity.requirements.map((req, index) => (
                                <View key={index} style={styles.requirementItem}>
                                    <View style={[styles.bulletPoint, { backgroundColor: colors.primary }]} />
                                    <Text style={[styles.requirementText, { color: isDark ? colors.mutedForeground : '#4B5563' }]}>{req}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Tags */}
                    {opportunity.tags && opportunity.tags.length > 0 && (
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Tags</Text>
                            <View style={styles.tagsContainer}>
                                {opportunity.tags.map((tag, index) => (
                                    <View key={index} style={[styles.tag, { backgroundColor: isDark ? colors.muted : '#F3F4F6' }]}>
                                        <Text style={[styles.tagText, { color: colors.mutedForeground }]}>#{tag}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Contact Info */}
                    {(opportunity.contactEmail || opportunity.contactPhone) && (
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Contact</Text>
                            <View style={styles.contactButtons}>
                                {opportunity.contactEmail && (
                                    <Pressable 
                                        onPress={() => handleContact('email')}
                                        style={[styles.contactButton, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF' }]}
                                    >
                                        <Ionicons name="mail-outline" size={18} color="#3B82F6" />
                                        <Text style={styles.contactButtonText}>Email</Text>
                                    </Pressable>
                                )}
                                {opportunity.contactPhone && (
                                    <Pressable 
                                        onPress={() => handleContact('phone')}
                                        style={[styles.contactButton, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF' }]}
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
                        <Text style={[styles.footerText, { color: isDark ? colors.mutedForeground : '#9CA3AF' }]}>
                            Posted {formatDistanceToNow(new Date(opportunity.postedAt), { addSuffix: true })}
                        </Text>
                        <Text style={[styles.footerText, { color: isDark ? colors.mutedForeground : '#9CA3AF' }]}>•</Text>
                        <Text style={[styles.footerText, { color: isDark ? colors.mutedForeground : '#9CA3AF' }]}>{opportunity.viewCount} views</Text>
                    </View>

                    {/* Bottom Padding for Apply Button */}
                    <View style={{ height: 120 }} />
                </ScrollView>

                {/* Apply Button */}
                {opportunity.applicationUrl && (
                    <View style={styles.applyContainer}>
                        <Pressable
                            onPress={handleApply}
                            style={styles.applyButton}
                        >
                            <Ionicons name="open-outline" size={20} color="#FFFFFF" />
                            <Text style={styles.applyButtonText}>Apply Now</Text>
                        </Pressable>
                    </View>
                )}
                </Animated.View>
            </GestureDetector>
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
    swipeIndicator: {
        position: 'absolute',
        top: -30,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    swipeHint: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.5)',
        fontWeight: '500',
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
        paddingTop: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
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
        fontSize: 26,
        fontWeight: '800',
        color: '#111827',
        lineHeight: 34,
    },
    organization: {
        fontSize: 16,
        color: '#6B7280',
        marginTop: 6,
        marginBottom: 20,
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
        bottom: Platform.OS === 'ios' ? 34 : 20,
        left: 20,
        right: 20,
    },
    applyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#EC4899',
        height: 56,
        borderRadius: 28,
        gap: 10,
        shadowColor: '#EC4899',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 12,
    },
    applyButtonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '700',
    },
});
