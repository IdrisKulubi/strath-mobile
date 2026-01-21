import React from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    Pressable,
    Image,
    Dimensions,
    Share,
    Linking,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { useEvent, useRsvpEvent, useEventAttendees } from '@/hooks/use-events';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
    X,
    CalendarBlank,
    MapPin,
    Users,
    ShareNetwork,
    Link as LinkIcon,
    CheckCircle,
    Star,
} from 'phosphor-react-native';
import { getCategoryInfo, formatEventTime } from '@/types/events';
import * as Haptics from 'expo-haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface EventDetailSheetProps {
    eventId: string | null;
    visible: boolean;
    onClose: () => void;
}

export function EventDetailSheet({ eventId, visible, onClose }: EventDetailSheetProps) {
    const { colors, isDark } = useTheme();
    const { data, isLoading } = useEvent(eventId);
    const { data: attendeesData } = useEventAttendees(eventId, 'going');
    const rsvpMutation = useRsvpEvent();

    const event = data?.event;
    const attendees = attendeesData?.going?.slice(0, 8) || [];

    if (!visible || !eventId) return null;

    const categoryInfo = event ? getCategoryInfo(event.category) : null;

    const handleRsvp = (status: "going" | "interested" | null) => {
        if (!eventId) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        // If already this status, toggle off
        const newStatus = event?.userRsvpStatus === status ? null : status;
        rsvpMutation.mutate({ eventId, status: newStatus });
    };

    const handleShare = async () => {
        if (!event) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        
        try {
            await Share.share({
                message: `Check out this event: ${event.title}\n📍 ${event.location || 'TBD'}\n📅 ${formatEventTime(event.startTime)}`,
                title: event.title,
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    const handleOpenLink = () => {
        if (event?.virtualLink) {
            Linking.openURL(event.virtualLink);
        }
    };

    return (
        <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <Pressable style={styles.backdrop} onPress={onClose} />
            
            <Animated.View 
                entering={FadeInUp.springify()}
                style={[
                    styles.sheet,
                    { backgroundColor: isDark ? colors.card : '#fff' }
                ]}
            >
                {/* Header with Cover Image */}
                <View style={styles.headerContainer}>
                    {event?.coverImage ? (
                        <Image source={{ uri: event.coverImage }} style={styles.coverImage} />
                    ) : (
                        <LinearGradient
                            colors={categoryInfo ? [categoryInfo.color, categoryInfo.color + '80'] : ['#ec4899', '#f43f5e']}
                            style={styles.coverImage}
                        >
                            <Text style={styles.coverEmoji}>{categoryInfo?.icon || '📅'}</Text>
                        </LinearGradient>
                    )}
                    
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.7)']}
                        style={styles.headerGradient}
                    />

                    {/* Close Button */}
                    <Pressable
                        onPress={onClose}
                        style={styles.closeButton}
                    >
                        <BlurView intensity={80} style={styles.closeButtonBlur}>
                            <X size={20} color="#fff" weight="bold" />
                        </BlurView>
                    </Pressable>

                    {/* Share Button */}
                    <Pressable
                        onPress={handleShare}
                        style={styles.shareButton}
                    >
                        <BlurView intensity={80} style={styles.closeButtonBlur}>
                            <ShareNetwork size={20} color="#fff" weight="bold" />
                        </BlurView>
                    </Pressable>

                    {/* Category Badge */}
                    {categoryInfo && (
                        <View style={[styles.categoryBadge, { backgroundColor: categoryInfo.color }]}>
                            <Text style={styles.categoryText}>{categoryInfo.label}</Text>
                        </View>
                    )}
                </View>

                <ScrollView 
                    style={styles.content}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {isLoading ? (
                        <View style={styles.loadingContainer}>
                            <Text style={{ color: colors.mutedForeground }}>Loading...</Text>
                        </View>
                    ) : event ? (
                        <>
                            {/* Title & Organizer */}
                            <Animated.View entering={FadeInDown.delay(100)}>
                                <Text style={[styles.title, { color: colors.foreground }]}>
                                    {event.title}
                                </Text>
                                {event.organizerName && (
                                    <Text style={[styles.organizer, { color: colors.mutedForeground }]}>
                                        by {event.organizerName}
                                    </Text>
                                )}
                            </Animated.View>

                            {/* Quick Stats */}
                            <Animated.View 
                                entering={FadeInDown.delay(150)}
                                style={[styles.statsRow, { backgroundColor: colors.muted }]}
                            >
                                <View style={styles.statItem}>
                                    <Users size={20} color={colors.primary} weight="fill" />
                                    <Text style={[styles.statNumber, { color: colors.foreground }]}>
                                        {event.goingCount}
                                    </Text>
                                    <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                                        Going
                                    </Text>
                                </View>
                                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                                <View style={styles.statItem}>
                                    <Star size={20} color="#FFD700" weight="fill" />
                                    <Text style={[styles.statNumber, { color: colors.foreground }]}>
                                        {event.interestedCount}
                                    </Text>
                                    <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                                        Interested
                                    </Text>
                                </View>
                            </Animated.View>

                            {/* Details */}
                            <Animated.View entering={FadeInDown.delay(200)} style={styles.detailsSection}>
                                <View style={styles.detailRow}>
                                    <View style={[styles.detailIcon, { backgroundColor: colors.primary + '20' }]}>
                                        <CalendarBlank size={20} color={colors.primary} weight="fill" />
                                    </View>
                                    <View style={styles.detailContent}>
                                        <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>
                                            Date & Time
                                        </Text>
                                        <Text style={[styles.detailValue, { color: colors.foreground }]}>
                                            {formatEventTime(event.startTime)}
                                        </Text>
                                    </View>
                                </View>

                                {event.location && (
                                    <View style={styles.detailRow}>
                                        <View style={[styles.detailIcon, { backgroundColor: '#10b981' + '20' }]}>
                                            <MapPin size={20} color="#10b981" weight="fill" />
                                        </View>
                                        <View style={styles.detailContent}>
                                            <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>
                                                Location
                                            </Text>
                                            <Text style={[styles.detailValue, { color: colors.foreground }]}>
                                                {event.location}
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                {event.isVirtual && event.virtualLink && (
                                    <Pressable onPress={handleOpenLink} style={styles.detailRow}>
                                        <View style={[styles.detailIcon, { backgroundColor: '#3b82f6' + '20' }]}>
                                            <LinkIcon size={20} color="#3b82f6" weight="fill" />
                                        </View>
                                        <View style={styles.detailContent}>
                                            <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>
                                                Virtual Link
                                            </Text>
                                            <Text style={[styles.detailValue, { color: '#3b82f6' }]}>
                                                Tap to open
                                            </Text>
                                        </View>
                                    </Pressable>
                                )}
                            </Animated.View>

                            {/* Description */}
                            {event.description && (
                                <Animated.View entering={FadeInDown.delay(250)} style={styles.descriptionSection}>
                                    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                                        About
                                    </Text>
                                    <Text style={[styles.description, { color: colors.foreground }]}>
                                        {event.description}
                                    </Text>
                                </Animated.View>
                            )}

                            {/* Attendees Preview */}
                            {attendees.length > 0 && (
                                <Animated.View entering={FadeInDown.delay(300)} style={styles.attendeesSection}>
                                    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                                        Who&apos;s Going
                                    </Text>
                                    <View style={styles.attendeesList}>
                                        {attendees.map((attendee, index) => (
                                            <View 
                                                key={attendee.id} 
                                                style={[
                                                    styles.attendeeAvatar,
                                                    { 
                                                        marginLeft: index > 0 ? -12 : 0,
                                                        zIndex: attendees.length - index,
                                                        borderColor: isDark ? colors.card : '#fff',
                                                    }
                                                ]}
                                            >
                                                {attendee.image ? (
                                                    <Image 
                                                        source={{ uri: attendee.image }} 
                                                        style={styles.attendeeImage}
                                                    />
                                                ) : (
                                                    <View style={[styles.attendeePlaceholder, { backgroundColor: colors.primary }]}>
                                                        <Text style={styles.attendeeInitial}>
                                                            {attendee.name?.[0] || '?'}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        ))}
                                        {event.goingCount > 8 && (
                                            <View style={[styles.moreAttendees, { backgroundColor: colors.muted }]}>
                                                <Text style={[styles.moreAttendeesText, { color: colors.foreground }]}>
                                                    +{event.goingCount - 8}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </Animated.View>
                            )}

                            {/* Spacer for buttons */}
                            <View style={{ height: 100 }} />
                        </>
                    ) : null}
                </ScrollView>

                {/* RSVP Buttons */}
                {event && (
                    <View style={[styles.buttonContainer, { backgroundColor: isDark ? colors.card : '#fff' }]}>
                        <Pressable
                            onPress={() => handleRsvp('interested')}
                            style={[
                                styles.rsvpButton,
                                styles.interestedBtn,
                                { 
                                    backgroundColor: event.userRsvpStatus === 'interested' 
                                        ? '#FFD700' 
                                        : isDark ? colors.muted : '#f1f5f9',
                                },
                            ]}
                        >
                            <Star 
                                size={20} 
                                color={event.userRsvpStatus === 'interested' ? '#000' : colors.foreground}
                                weight={event.userRsvpStatus === 'interested' ? 'fill' : 'regular'}
                            />
                            <Text style={[
                                styles.rsvpButtonText,
                                { color: event.userRsvpStatus === 'interested' ? '#000' : colors.foreground }
                            ]}>
                                Interested
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={() => handleRsvp('going')}
                            style={[
                                styles.rsvpButton,
                                styles.goingBtn,
                                { 
                                    backgroundColor: event.userRsvpStatus === 'going' 
                                        ? colors.primary 
                                        : colors.primary,
                                },
                            ]}
                        >
                            <CheckCircle 
                                size={20} 
                                color="#fff"
                                weight={event.userRsvpStatus === 'going' ? 'fill' : 'regular'}
                            />
                            <Text style={styles.goingButtonText}>
                                {event.userRsvpStatus === 'going' ? "I'm Going!" : 'Going'}
                            </Text>
                        </Pressable>
                    </View>
                )}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-end',
        zIndex: 1000,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    sheet: {
        height: SCREEN_HEIGHT * 0.85,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
    },
    headerContainer: {
        height: 200,
        position: 'relative',
    },
    coverImage: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    coverEmoji: {
        fontSize: 64,
    },
    headerGradient: {
        ...StyleSheet.absoluteFillObject,
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        left: 16,
        zIndex: 10,
    },
    shareButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 10,
    },
    closeButtonBlur: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    categoryBadge: {
        position: 'absolute',
        bottom: 16,
        left: 16,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    categoryText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 4,
    },
    organizer: {
        fontSize: 14,
        marginBottom: 16,
    },
    statsRow: {
        flexDirection: 'row',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 20,
        fontWeight: '700',
        marginTop: 4,
    },
    statLabel: {
        fontSize: 12,
    },
    statDivider: {
        width: 1,
        marginHorizontal: 16,
    },
    detailsSection: {
        marginBottom: 20,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    detailIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    detailContent: {
        flex: 1,
    },
    detailLabel: {
        fontSize: 12,
        marginBottom: 2,
    },
    detailValue: {
        fontSize: 15,
        fontWeight: '600',
    },
    descriptionSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 8,
    },
    description: {
        fontSize: 15,
        lineHeight: 22,
    },
    attendeesSection: {
        marginBottom: 20,
    },
    attendeesList: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    attendeeAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        overflow: 'hidden',
    },
    attendeeImage: {
        width: '100%',
        height: '100%',
    },
    attendeePlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    attendeeInitial: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    moreAttendees: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: -12,
    },
    moreAttendeesText: {
        fontSize: 12,
        fontWeight: '600',
    },
    buttonContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        padding: 16,
        paddingBottom: 32,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    rsvpButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 24,
        gap: 8,
    },
    interestedBtn: {},
    goingBtn: {},
    rsvpButtonText: {
        fontSize: 15,
        fontWeight: '600',
    },
    goingButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
});
