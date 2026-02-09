import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  RefreshControl,
  Pressable,
  FlatList,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { useProfile } from '@/hooks/use-profile';
import { useOpportunities, useToggleSaveOpportunity } from '@/hooks/use-opportunities';
import { useEvents, useRsvpEvent } from '@/hooks/use-events';
import { OpportunityCard, CategoryFilter, OpportunityDetailSheet, OpportunityListSkeleton } from '@/components/opportunities';
import { EventCard, EventDetailSheet, CreateEventSheet } from '@/components/events';
import { WingmanSearchBar, WingmanResults, VoiceRecordingOverlay } from '@/components/wingman';
import { useAgent, AgentMatch } from '@/hooks/use-agent';
import { useVoiceInput } from '@/hooks/use-voice-input';
import { Question, ArrowClockwise, Briefcase, CalendarBlank, Plus, Sparkle } from 'phosphor-react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { type Opportunity, type OpportunityCategory } from '@/types/opportunities';
import { type CampusEvent, type EventCategory, EVENT_CATEGORIES } from '@/types/events';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

type ExploreTab = 'wingman' | 'events' | 'opportunities';

export default function ExploreScreen() {
  const { colors, colorScheme } = useTheme();
  const router = useRouter();
  useProfile(); // Pre-fetch profile for later use

  // Tab state — Wingman is the default tab
  const [activeTab, setActiveTab] = useState<ExploreTab>('wingman');

  // ===== Wingman (AI Agent) state =====
  const agent = useAgent();
  const voice = useVoiceInput();

  const handleWingmanSearch = useCallback((query: string) => {
    console.log('[Explore] Searching:', query);
    agent.search(query);
  }, [agent]);

  const handleVoicePress = useCallback(() => {
    console.log('[Explore] Voice toggle, isRecording:', voice.isRecording);
    voice.toggleRecording();
  }, [voice]);

  // When voice transcript is ready, trigger search
  useEffect(() => {
    if (voice.transcript && voice.transcript.length > 0) {
      console.log('[Explore] Voice transcript:', voice.transcript);
      handleWingmanSearch(voice.transcript);
    }
  }, [voice.transcript, handleWingmanSearch]);

  // Show voice errors to user
  useEffect(() => {
    if (voice.error) {
      Alert.alert('Voice Input', voice.error);
    }
  }, [voice.error]);

  // Show search errors to user
  useEffect(() => {
    if (agent.searchError) {
      Alert.alert('Search Error', agent.searchError);
    }
  }, [agent.searchError]);

  const handleMatchPress = useCallback((match: AgentMatch) => {
    // TODO: Open profile detail sheet or navigate
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const handleMatchLike = useCallback((match: AgentMatch) => {
    agent.submitFeedback(match.profile.userId, 'amazing');
  }, [agent]);

  const handleRefineSearch = useCallback((query: string) => {
    agent.search(query);
  }, [agent]);

  // Events state
  const [selectedEventCategory, setSelectedEventCategory] = useState<EventCategory | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CampusEvent | null>(null);
  const [eventDetailVisible, setEventDetailVisible] = useState(false);
  const [createEventVisible, setCreateEventVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: eventsData,
    isLoading: isLoadingEvents,
    isError: isErrorEvents,
    refetch: refetchEvents,
  } = useEvents({ category: selectedEventCategory, time: 'week' });

  const rsvpMutation = useRsvpEvent();

  // Opportunities state
  const [selectedCategory, setSelectedCategory] = useState<OpportunityCategory | null>(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [opportunityDetailVisible, setOpportunityDetailVisible] = useState(false);

  const {
    data: opportunitiesData,
    isLoading: isLoadingOpportunities,
    isError: isErrorOpportunities,
    refetch: refetchOpportunities,
  } = useOpportunities(selectedCategory ? { category: selectedCategory } : {});

  const toggleSaveMutation = useToggleSaveOpportunity();

  // Tab change handler
  const handleTabChange = (tab: ExploreTab) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  };

  // Events handlers
  const handleEventPress = useCallback((event: CampusEvent) => {
    setSelectedEvent(event);
    setEventDetailVisible(true);
  }, []);

  const handleEventRsvp = useCallback((eventId: string, status: "going" | "interested") => {
    rsvpMutation.mutate({ eventId, status });
  }, [rsvpMutation]);

  const handleCloseEventDetail = useCallback(() => {
    setEventDetailVisible(false);
    setSelectedEvent(null);
  }, []);

  // Opportunities handlers
  const handleOpportunityPress = useCallback((opportunity: Opportunity) => {
    setSelectedOpportunity(opportunity);
    setOpportunityDetailVisible(true);
  }, []);

  const handleSaveOpportunity = useCallback((opportunity: Opportunity) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleSaveMutation.mutate({
      opportunityId: opportunity.id,
      isSaved: opportunity.isSaved || false,
    });
  }, [toggleSaveMutation]);

  const handleCloseOpportunityDetail = useCallback(() => {
    setOpportunityDetailVisible(false);
    setSelectedOpportunity(null);
  }, []);

  // Refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (activeTab === 'events') {
      await refetchEvents();
    } else {
      await refetchOpportunities();
    }
    setRefreshing(false);
  }, [activeTab, refetchEvents, refetchOpportunities]);

  const events = eventsData?.events || [];
  const isEmptyEvents = !isLoadingEvents && events.length === 0;
  const opportunities = opportunitiesData?.opportunities || [];
  const isEmptyOpportunities = !isLoadingOpportunities && opportunities.length === 0;

  // Event category filter items with "All" option
  const categoryFilterItems = [
    { value: null as EventCategory | null, label: 'All', icon: '🎯', color: colors.primary },
    ...EVENT_CATEGORIES,
  ];

  // Event category filter component
  const EventCategoryFilter = () => (
    <View style={styles.categoryFilterContainer}>
      <FlatList
        horizontal
        data={categoryFilterItems}
        keyExtractor={(item) => item.value || 'all'}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryFilterList}
        renderItem={({ item }) => {
          const isSelected = selectedEventCategory === item.value;
          return (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedEventCategory(item.value);
              }}
              style={[
                styles.categoryChip,
                { 
                  backgroundColor: isSelected ? colors.primary : colors.muted,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={styles.categoryEmoji}>{item.icon}</Text>
              <Text style={[
                styles.categoryLabel,
                { color: isSelected ? '#FFF' : colors.foreground },
              ]}>
                {item.label}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Explore</Text>
          <View style={styles.headerRight}>
            {activeTab === 'events' && (
              <Pressable 
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setCreateEventVisible(true);
                }}
                style={[styles.createButton, { backgroundColor: colors.primary }]}
              >
                <Plus size={18} color="#fff" weight="bold" />
              </Pressable>
            )}
            <Pressable style={styles.helpButton}>
              <Question size={24} color={colors.mutedForeground} />
            </Pressable>
          </View>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <View style={[styles.tabBar, { backgroundColor: colors.muted }]}>
            <Pressable
              onPress={() => handleTabChange('wingman')}
              style={[
                styles.tab,
                activeTab === 'wingman' && [styles.tabActive, { backgroundColor: colors.background }],
              ]}
            >
              <Sparkle 
                size={18} 
                weight={activeTab === 'wingman' ? 'fill' : 'regular'}
                color={activeTab === 'wingman' ? colors.primary : colors.mutedForeground} 
              />
              <Text style={[
                styles.tabText,
                { color: activeTab === 'wingman' ? colors.primary : colors.mutedForeground },
                activeTab === 'wingman' && styles.tabTextActive,
              ]}>
                Wingman
              </Text>
            </Pressable>
            <Pressable
              onPress={() => handleTabChange('events')}
              style={[
                styles.tab,
                activeTab === 'events' && [styles.tabActive, { backgroundColor: colors.background }],
              ]}
            >
              <CalendarBlank 
                size={18} 
                weight={activeTab === 'events' ? 'fill' : 'regular'}
                color={activeTab === 'events' ? colors.primary : colors.mutedForeground} 
              />
              <Text style={[
                styles.tabText,
                { color: activeTab === 'events' ? colors.primary : colors.mutedForeground },
                activeTab === 'events' && styles.tabTextActive,
              ]}>
                Events
              </Text>
            </Pressable>
            <Pressable
              onPress={() => handleTabChange('opportunities')}
              style={[
                styles.tab,
                activeTab === 'opportunities' && [styles.tabActive, { backgroundColor: colors.background }],
              ]}
            >
              <Briefcase 
                size={18} 
                weight={activeTab === 'opportunities' ? 'fill' : 'regular'}
                color={activeTab === 'opportunities' ? colors.primary : colors.mutedForeground} 
              />
              <Text style={[
                styles.tabText,
                { color: activeTab === 'opportunities' ? colors.primary : colors.mutedForeground },
                activeTab === 'opportunities' && styles.tabTextActive,
              ]}>
                Opportunities
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Content */}
        {activeTab === 'wingman' ? (
          // WINGMAN AI TAB
          <View style={styles.wingmanContainer}>
            <WingmanSearchBar
              onSearch={handleWingmanSearch}
              onVoicePress={handleVoicePress}
              isSearching={agent.isSearching}
              isRecording={voice.isRecording}
              initialQuery={voice.transcript || undefined}
            />
            <ScrollView
              style={styles.wingmanScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.wingmanScrollContent}
            >
              <WingmanResults
                matches={agent.matches}
                commentary={agent.commentary}
                intent={agent.intent}
                meta={agent.meta}
                isSearching={agent.isSearching}
                searchError={agent.searchError}
                currentQuery={agent.currentQuery}
                onLoadMore={agent.loadMore}
                onMatchPress={handleMatchPress}
                onMatchLike={handleMatchLike}
                onRefine={handleRefineSearch}
              />
            </ScrollView>

            {/* Voice recording overlay */}
            <VoiceRecordingOverlay
              isRecording={voice.isRecording}
              isTranscribing={voice.isTranscribing}
              onStop={voice.toggleRecording}
              onCancel={voice.cancelRecording}
            />
          </View>
        ) : activeTab === 'events' ? (
          // EVENTS TAB
          <View style={styles.eventsContainer}>
            {/* Category Filter */}
            <EventCategoryFilter />

            {/* Events List */}
            {isLoadingEvents ? (
              <View style={styles.centerState}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ color: colors.mutedForeground, marginTop: 12 }}>Loading events...</Text>
              </View>
            ) : isErrorEvents ? (
              <View style={styles.centerState}>
                <Text style={{ color: colors.foreground, fontWeight: '600' }}>
                  Couldn&apos;t load events
                </Text>
                <Pressable
                  onPress={() => refetchEvents()}
                  style={[styles.retryButton, { backgroundColor: colors.primary }]}
                >
                  <ArrowClockwise size={18} color="#FFF" />
                  <Text style={{ color: '#FFF', fontWeight: '600' }}>Try Again</Text>
                </Pressable>
              </View>
            ) : isEmptyEvents ? (
              <View style={styles.centerState}>
                <CalendarBlank size={48} color={colors.mutedForeground} />
                <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: 18, marginTop: 16 }}>
                  No events yet
                </Text>
                <Text style={{ color: colors.mutedForeground, textAlign: 'center', marginTop: 8 }}>
                  {selectedEventCategory 
                    ? 'Try selecting a different category' 
                    : 'Be the first to create an event!'}
                </Text>
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setCreateEventVisible(true);
                  }}
                  style={[styles.createEventButton, { backgroundColor: colors.primary }]}
                >
                  <Plus size={18} color="#FFF" weight="bold" />
                  <Text style={{ color: '#FFF', fontWeight: '600' }}>Create Event</Text>
                </Pressable>
              </View>
            ) : (
              <FlatList
                data={events}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <EventCard
                    event={item}
                    onPress={() => handleEventPress(item)}
                    onRsvp={(status) => handleEventRsvp(item.id, status)}
                  />
                )}
                contentContainerStyle={styles.eventsList}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={colors.primary}
                  />
                }
              />
            )}
          </View>
        ) : (
          // OPPORTUNITIES TAB
          <View style={styles.opportunitiesContainer}>
            {/* Category Filter */}
            <CategoryFilter
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />

            {/* Opportunities List */}
            {isLoadingOpportunities ? (
              <OpportunityListSkeleton count={4} />
            ) : isErrorOpportunities ? (
              <View style={styles.centerState}>
                <Text style={{ color: colors.foreground, fontWeight: '600' }}>
                  Couldn&apos;t load opportunities
                </Text>
                <Pressable
                  onPress={() => refetchOpportunities()}
                  style={[styles.retryButton, { backgroundColor: colors.primary }]}
                >
                  <ArrowClockwise size={18} color="#FFF" />
                  <Text style={{ color: '#FFF', fontWeight: '600' }}>Try Again</Text>
                </Pressable>
              </View>
            ) : isEmptyOpportunities ? (
              <View style={styles.centerState}>
                <Ionicons name="briefcase-outline" size={48} color={colors.mutedForeground} />
                <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: 18, marginTop: 16 }}>
                  No opportunities found
                </Text>
                <Text style={{ color: colors.mutedForeground, textAlign: 'center', marginTop: 8 }}>
                  {selectedCategory 
                    ? 'Try selecting a different category' 
                    : 'Check back soon for new opportunities!'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={opportunities}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <OpportunityCard
                    opportunity={item}
                    onPress={() => handleOpportunityPress(item)}
                    onSave={() => handleSaveOpportunity(item)}
                  />
                )}
                contentContainerStyle={styles.opportunitiesList}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={colors.primary}
                  />
                }
              />
            )}
          </View>
        )}

        {/* Event Detail Sheet */}
        <EventDetailSheet
          eventId={selectedEvent?.id || null}
          visible={eventDetailVisible}
          onClose={handleCloseEventDetail}
        />

        {/* Create Event Sheet */}
        <CreateEventSheet
          visible={createEventVisible}
          onClose={() => setCreateEventVisible(false)}
        />

        {/* Opportunity Detail Sheet */}
        <OpportunityDetailSheet
          opportunity={selectedOpportunity}
          visible={opportunityDetailVisible}
          onClose={handleCloseOpportunityDetail}
          onSave={() => selectedOpportunity && handleSaveOpportunity(selectedOpportunity)}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
    paddingVertical: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  createButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpButton: {
    padding: 8,
  },
  tabContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabTextActive: {
    fontWeight: '700',
  },
  eventsContainer: {
    flex: 1,
  },
  categoryFilterContainer: {
    paddingBottom: 8,
  },
  categoryFilterList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  categoryEmoji: {
    fontSize: 14,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  eventsList: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 100,
  },
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 16,
  },
  createEventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
    marginTop: 20,
  },
  opportunitiesContainer: {
    flex: 1,
  },
  opportunitiesList: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 100,
  },
  wingmanContainer: {
    flex: 1,
    position: 'relative',
  },
  wingmanScroll: {
    flex: 1,
  },
  wingmanScrollContent: {
    flexGrow: 1,
  },
});
