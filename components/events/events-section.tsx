import React, { useState } from 'react';
import { 
    View, 
    StyleSheet, 
    ScrollView, 
    Pressable, 
    ActivityIndicator,
    FlatList,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { useEvents, useRsvpEvent } from '@/hooks/use-events';
import { EventCard } from './event-card';
import { CalendarBlank, Plus, ArrowRight, ArrowClockwise } from 'phosphor-react-native';
import { CampusEvent, EVENT_CATEGORIES, EventCategory } from '@/types/events';
import * as Haptics from 'expo-haptics';

interface EventsSectionProps {
    onEventPress: (event: CampusEvent) => void;
    onCreatePress?: () => void;
    onSeeAllPress?: () => void;
}

export function EventsSection({ 
    onEventPress, 
    onCreatePress,
    onSeeAllPress,
}: EventsSectionProps) {
    const { colors, isDark } = useTheme();
    const [selectedCategory, setSelectedCategory] = useState<EventCategory | null>(null);
    
    const { data, isLoading, isError, refetch } = useEvents({
        category: selectedCategory,
        time: 'week',
    });
    
    const rsvpMutation = useRsvpEvent();

    const events = data?.events || [];

    const handleCategoryPress = (category: EventCategory | null) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedCategory(category);
    };

    const handleRsvp = (eventId: string, status: "going" | "interested") => {
        rsvpMutation.mutate({ eventId, status });
    };

    return (
        <Animated.View 
            entering={FadeInDown.delay(200).springify()}
            style={styles.container}
        >
            {/* Section Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <CalendarBlank size={24} color={colors.primary} weight="fill" />
                    <View>
                        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
                            Campus Events
                        </Text>
                        <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
                            See what&apos;s happening
                        </Text>
                    </View>
                </View>
                
                <View style={styles.headerRight}>
                    {onCreatePress && (
                        <Pressable
                            onPress={onCreatePress}
                            style={[styles.createButton, { backgroundColor: colors.primary }]}
                        >
                            <Plus size={16} color="#fff" weight="bold" />
                        </Pressable>
                    )}
                    {onSeeAllPress && (
                        <Pressable
                            onPress={onSeeAllPress}
                            style={styles.seeAllButton}
                        >
                            <Text style={[styles.seeAllText, { color: colors.primary }]}>
                                See all
                            </Text>
                            <ArrowRight size={16} color={colors.primary} />
                        </Pressable>
                    )}
                </View>
            </View>

            {/* Category Filters */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesContainer}
            >
                <Pressable
                    onPress={() => handleCategoryPress(null)}
                    style={[
                        styles.categoryChip,
                        {
                            backgroundColor: selectedCategory === null 
                                ? colors.primary 
                                : isDark ? colors.card : colors.muted,
                            borderColor: selectedCategory === null 
                                ? colors.primary 
                                : colors.border,
                        },
                    ]}
                >
                    <Text style={[
                        styles.categoryChipText,
                        { color: selectedCategory === null ? '#fff' : colors.foreground }
                    ]}>
                        All
                    </Text>
                </Pressable>

                {EVENT_CATEGORIES.map((cat) => (
                    <Pressable
                        key={cat.value}
                        onPress={() => handleCategoryPress(cat.value)}
                        style={[
                            styles.categoryChip,
                            {
                                backgroundColor: selectedCategory === cat.value 
                                    ? cat.color 
                                    : isDark ? colors.card : colors.muted,
                                borderColor: selectedCategory === cat.value 
                                    ? cat.color 
                                    : colors.border,
                            },
                        ]}
                    >
                        <Text style={styles.categoryEmoji}>{cat.icon}</Text>
                        <Text style={[
                            styles.categoryChipText,
                            { color: selectedCategory === cat.value ? '#fff' : colors.foreground }
                        ]}>
                            {cat.label.split(' ')[0]}
                        </Text>
                    </Pressable>
                ))}
            </ScrollView>

            {/* Content */}
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
                        Loading events...
                    </Text>
                </View>
            ) : isError ? (
                <View style={styles.errorContainer}>
                    <Text style={[styles.errorText, { color: colors.foreground }]}>
                        Couldn&apos;t load events
                    </Text>
                    <Pressable
                        onPress={() => refetch()}
                        style={[styles.retryButton, { backgroundColor: colors.primary }]}
                    >
                        <ArrowClockwise size={16} color="#fff" />
                        <Text style={styles.retryText}>Try again</Text>
                    </Pressable>
                </View>
            ) : events.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <CalendarBlank size={48} color={colors.mutedForeground} />
                    <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                        No events yet
                    </Text>
                    <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                        Be the first to create an event!
                    </Text>
                    {onCreatePress && (
                        <Pressable
                            onPress={onCreatePress}
                            style={[styles.createFirstButton, { backgroundColor: colors.primary }]}
                        >
                            <Plus size={18} color="#fff" weight="bold" />
                            <Text style={styles.createFirstText}>Create Event</Text>
                        </Pressable>
                    )}
                </View>
            ) : (
                <FlatList
                    data={events.slice(0, 5)}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.eventsListContent}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item, index }) => (
                        <EventCard
                            event={item}
                            onPress={() => onEventPress(item)}
                            onRsvp={(status) => handleRsvp(item.id, status)}
                            variant="compact"
                            index={index}
                        />
                    )}
                />
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 16,
        paddingBottom: 8,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    headerSubtitle: {
        fontSize: 13,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    createButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    seeAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    seeAllText: {
        fontSize: 14,
        fontWeight: '600',
    },
    
    // Categories
    categoriesContainer: {
        paddingHorizontal: 16,
        paddingBottom: 12,
        gap: 8,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: 8,
        gap: 6,
    },
    categoryEmoji: {
        fontSize: 14,
    },
    categoryChipText: {
        fontSize: 13,
        fontWeight: '500',
    },

    // Events List
    eventsListContent: {
        paddingHorizontal: 16,
        paddingVertical: 4,
    },

    // Loading
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
    },

    // Error
    errorContainer: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    errorText: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
    },
    retryText: {
        color: '#fff',
        fontWeight: '600',
    },

    // Empty
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginTop: 12,
    },
    emptySubtitle: {
        fontSize: 14,
        marginTop: 4,
    },
    createFirstButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 24,
        marginTop: 16,
    },
    createFirstText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 15,
    },
});
