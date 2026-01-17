import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  ScrollView,
  RefreshControl,
  Pressable,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { useDiscoverSections } from '@/hooks/use-discover-sections';
import { useProfile } from '@/hooks/use-profile';
import { useOpportunities, useToggleSaveOpportunity } from '@/hooks/use-opportunities';
import { MatchModal, DiscoverSectionView, DiscoverProfileModal } from '@/components/discover';
import { OpportunityCard, CategoryFilter, OpportunityDetailSheet, OpportunityListSkeleton } from '@/components/opportunities';
import { Question, Clock, ArrowClockwise, Briefcase, Users } from 'phosphor-react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DiscoverProfile } from '@/types/discover';
import { type Opportunity, type OpportunityCategory } from '@/types/opportunities';
import * as Haptics from 'expo-haptics';

type ExploreTab = 'people' | 'opportunities';

export default function ExploreScreen() {
  const { colors, colorScheme } = useTheme();
  const { data: currentUserProfile } = useProfile();

  // Tab state
  const [activeTab, setActiveTab] = useState<ExploreTab>('people');

  // People/Discover state
  const {
    sections,
    isLoading: isLoadingPeople,
    isError: isErrorPeople,
    refetch: refetchPeople,
  } = useDiscoverSections();

  const [selectedProfile, setSelectedProfile] = useState<DiscoverProfile | null>(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<DiscoverProfile | null>(null);

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

  // People handlers
  const handleProfilePress = useCallback((profile: DiscoverProfile) => {
    setSelectedProfile(profile);
    setProfileModalVisible(true);
  }, []);

  const handleLikeProfile = useCallback((profile: DiscoverProfile) => {
    console.log('Liked:', profile.firstName);
  }, []);

  const handlePassProfile = useCallback((profile: DiscoverProfile) => {
    console.log('Passed:', profile.firstName);
  }, []);

  const handleCloseProfileModal = useCallback(() => {
    setProfileModalVisible(false);
    setSelectedProfile(null);
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
    if (activeTab === 'people') {
      await refetchPeople();
    } else {
      await refetchOpportunities();
    }
    setRefreshing(false);
  }, [activeTab, refetchPeople, refetchOpportunities]);

  const isEmptyPeople = !isLoadingPeople && sections.length === 0;
  const opportunities = opportunitiesData?.opportunities || [];
  const isEmptyOpportunities = !isLoadingOpportunities && opportunities.length === 0;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Explore</Text>
          <Pressable style={styles.helpButton}>
            <Question size={24} color={colors.mutedForeground} />
          </Pressable>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <View style={[styles.tabBar, { backgroundColor: colors.muted }]}>
            <Pressable
              onPress={() => handleTabChange('people')}
              style={[
                styles.tab,
                activeTab === 'people' && [styles.tabActive, { backgroundColor: colors.background }],
              ]}
            >
              <Users 
                size={18} 
                weight={activeTab === 'people' ? 'fill' : 'regular'}
                color={activeTab === 'people' ? colors.primary : colors.mutedForeground} 
              />
              <Text style={[
                styles.tabText,
                { color: activeTab === 'people' ? colors.primary : colors.mutedForeground },
                activeTab === 'people' && styles.tabTextActive,
              ]}>
                People
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
        {activeTab === 'people' ? (
          // PEOPLE TAB
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
          >
            {/* Countdown Badge */}
            <View style={[styles.countdownBadge, { backgroundColor: colors.primary }]}>
              <Clock size={14} color="#FFF" weight="bold" />
              <Text style={styles.countdownText}>See new people in 24 hours</Text>
            </View>

            {/* Subtitle */}
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Connect over common ground with people who match your vibe, refreshed every day.
            </Text>

            {/* Loading State */}
            {isLoadingPeople && (
              <View style={styles.centerState}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ color: colors.mutedForeground, marginTop: 12 }}>Finding people for you...</Text>
              </View>
            )}

            {/* Error State */}
            {isErrorPeople && !isLoadingPeople && (
              <View style={styles.centerState}>
                <Text style={{ color: colors.foreground, fontWeight: '600' }}>
                  Couldn&apos;t load profiles
                </Text>
                <Pressable
                  onPress={() => refetchPeople()}
                  style={[styles.retryButton, { backgroundColor: colors.primary }]}
                >
                  <ArrowClockwise size={18} color="#FFF" />
                  <Text style={{ color: '#FFF', fontWeight: '600' }}>Try Again</Text>
                </Pressable>
              </View>
            )}

            {/* Empty State */}
            {isEmptyPeople && !isLoadingPeople && !isErrorPeople && (
              <View style={styles.centerState}>
                <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: 18 }}>
                  No profiles yet
                </Text>
                <Text style={{ color: colors.mutedForeground, textAlign: 'center', marginTop: 8 }}>
                  Check back soon as more students join!
                </Text>
              </View>
            )}

            {/* Render Sections */}
            {!isLoadingPeople && !isErrorPeople && sections.map(section => (
              <DiscoverSectionView
                key={section.id}
                section={section}
                onProfilePress={handleProfilePress}
                onLikePress={handleLikeProfile}
              />
            ))}
          </ScrollView>
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

        {/* Full Profile Modal - People */}
        <DiscoverProfileModal
          visible={profileModalVisible}
          profile={selectedProfile}
          onClose={handleCloseProfileModal}
          onLike={handleLikeProfile}
          onPass={handlePassProfile}
        />

        {/* Match Modal */}
        <MatchModal
          visible={!!matchedProfile}
          profile={matchedProfile}
          currentUserImage={currentUserProfile?.profilePhoto || currentUserProfile?.photos?.[0]}
          onClose={() => setMatchedProfile(null)}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginHorizontal: 20,
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  countdownText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 24,
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
  opportunitiesContainer: {
    flex: 1,
  },
  opportunitiesList: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
});
