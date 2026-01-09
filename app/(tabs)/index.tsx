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
import { MatchModal, ProfileDetailSheet, DiscoverSectionView } from '@/components/discover';
import { BottomSheetModal, BottomSheetModalProvider } from '@gorhom/bottom-sheet';
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
    refreshAt,
  } = useDiscoverSections();

  const profileSheetRef = useRef<BottomSheetModal>(null);
  const [selectedProfile, setSelectedProfile] = useState<DiscoverProfile | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<DiscoverProfile | null>(null);

  const handleProfilePress = useCallback((profile: DiscoverProfile) => {
    setSelectedProfile(profile);
    profileSheetRef.current?.present();
  }, []);

  const handleLikePress = useCallback((profile: DiscoverProfile) => {
    // Future: integrate with swipe/like API
    console.log('Like pressed for:', profile.firstName);
  }, []);

  const handleCloseSheet = useCallback(() => {
    profileSheetRef.current?.dismiss();
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
      <BottomSheetModalProvider>
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
              <Clock size={14} color="#000" weight="bold" />
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
                onLikePress={handleLikePress}
              />
            ))}
          </ScrollView>

          {/* Match Modal */}
          <MatchModal
            visible={!!matchedProfile}
            profile={matchedProfile}
            currentUserImage={currentUserProfile?.profilePhoto || currentUserProfile?.photos?.[0]}
            onClose={() => setMatchedProfile(null)}
          />

          {/* Profile Detail Sheet */}
          <ProfileDetailSheet
            ref={profileSheetRef}
            profile={selectedProfile}
            onClose={handleCloseSheet}
          />
        </SafeAreaView>
      </BottomSheetModalProvider>
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
    color: '#000',
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
