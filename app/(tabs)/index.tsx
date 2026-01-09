import React, { useRef, useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  ScrollView,
  RefreshControl,
  Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { useDiscoverSections } from '@/hooks/use-discover-sections';
import { useProfile } from '@/hooks/use-profile';
import { MatchModal, DiscoverSectionView, DiscoverProfileModal } from '@/components/discover';
import { Question, Clock, ArrowClockwise } from 'phosphor-react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DiscoverProfile } from '@/types/discover';

export default function DiscoverScreen() {
  const { colors, colorScheme } = useTheme();
  const { data: currentUserProfile } = useProfile();

  // Use modular sections hook
  const {
    sections,
    isLoading,
    isError,
    refetch,
  } = useDiscoverSections();

  const [selectedProfile, setSelectedProfile] = useState<DiscoverProfile | null>(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<DiscoverProfile | null>(null);

  const handleProfilePress = useCallback((profile: DiscoverProfile) => {
    setSelectedProfile(profile);
    setProfileModalVisible(true);
  }, []);

  const handleLikeProfile = useCallback((profile: DiscoverProfile) => {
    // TODO: Integrate with swipe API to record like
    console.log('Liked:', profile.firstName);
    // Could trigger match check here
  }, []);

  const handlePassProfile = useCallback((profile: DiscoverProfile) => {
    // TODO: Integrate with swipe API to record pass
    console.log('Passed:', profile.firstName);
  }, []);

  const handleCloseModal = useCallback(() => {
    setProfileModalVisible(false);
    setSelectedProfile(null);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const isEmpty = !isLoading && sections.length === 0;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Discover</Text>
          <Pressable style={styles.helpButton}>
            <Question size={24} color={colors.mutedForeground} />
          </Pressable>
        </View>

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
          {isLoading && (
            <View style={styles.centerState}>
              <Text style={{ color: colors.mutedForeground }}>Finding people for you...</Text>
            </View>
          )}

          {/* Error State */}
          {isError && !isLoading && (
            <View style={styles.centerState}>
              <Text style={{ color: colors.foreground, fontWeight: '600' }}>
                Couldn't load profiles
              </Text>
              <Pressable
                onPress={() => refetch()}
                style={[styles.retryButton, { backgroundColor: colors.primary }]}
              >
                <ArrowClockwise size={18} color="#FFF" />
                <Text style={{ color: '#FFF', fontWeight: '600' }}>Try Again</Text>
              </Pressable>
            </View>
          )}

          {/* Empty State */}
          {isEmpty && !isLoading && !isError && (
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
          {!isLoading && !isError && sections.map(section => (
            <DiscoverSectionView
              key={section.id}
              section={section}
              onProfilePress={handleProfilePress}
              onLikePress={handleLikeProfile}
            />
          ))}
        </ScrollView>

        {/* Full Profile Modal */}
        <DiscoverProfileModal
          visible={profileModalVisible}
          profile={selectedProfile}
          onClose={handleCloseModal}
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
});
