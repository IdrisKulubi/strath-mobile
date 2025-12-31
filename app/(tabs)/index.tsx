import React, { useRef, useCallback, useState } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { useDiscover, DiscoverProfile } from '@/hooks/use-discover';
import { useProfile } from '@/hooks/use-profile';
import { CardStack, SwipeButtons, MatchModal, ProfileDetailSheet, VibeSwitcher, VibeType } from '@/components/discover';
import { BottomSheetModal, BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { ArrowCounterClockwise, SlidersHorizontal, Sparkle } from 'phosphor-react-native';
import { GestureHandlerRootView, Pressable as GesturePressable } from 'react-native-gesture-handler';

export default function DiscoverScreen() {
  const { colors, colorScheme } = useTheme();
  const { data: currentUserProfile } = useProfile();
  const [activeVibe, setActiveVibe] = useState<VibeType>('all');

  const {
    currentProfile,
    upcomingProfiles,
    matchedProfile,
    handleSwipe,
    undoSwipe,
    clearMatch,
    isLoading,
    isEmpty,
    isComplete,
    canUndo,
  } = useDiscover(activeVibe);

  const profileSheetRef = useRef<BottomSheetModal>(null);
  const [selectedProfile, setSelectedProfile] = useState<DiscoverProfile | null>(null);

  const handleInfoPress = useCallback((profile: DiscoverProfile) => {
    setSelectedProfile(profile);
    profileSheetRef.current?.present();
  }, []);

  const handleCloseSheet = useCallback(() => {
    profileSheetRef.current?.dismiss();
    setSelectedProfile(null);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
          <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

          {/* Header */}
          <View style={styles.header}>
            <GesturePressable
              onPress={undoSwipe}
              disabled={!canUndo}
              style={({ pressed }: any) => [styles.headerButton, { opacity: !canUndo ? 0.3 : pressed ? 0.6 : 1 }]}
            >
              <ArrowCounterClockwise size={26} color={colors.foreground} weight="bold" />
            </GesturePressable>

            <View style={styles.titleContainer}>
              <Sparkle size={20} color={colors.primary} weight="fill" />
              <Text style={[styles.headerTitle, { color: colors.foreground }]}>Lounge</Text>
            </View>

            <GesturePressable style={styles.headerButton}>
              <SlidersHorizontal size={26} color={colors.foreground} weight="bold" />
            </GesturePressable>
          </View>

          {/* Vibe Switcher - The Lounge Entry */}
          <VibeSwitcher
            activeVibe={activeVibe}
            onVibeChange={setActiveVibe}
          />

          {/* Discovery Card Stack */}
          <View style={styles.cardWrapper}>
            <CardStack
              profiles={upcomingProfiles}
              onSwipe={handleSwipe}
              onInfoPress={handleInfoPress}
              showAura={true} // High energy discovery mode
            />

            <SwipeButtons
              onPass={() => handleSwipe('pass')}
              onLike={() => handleSwipe('like')}
              disabled={!currentProfile || isLoading}
            />

            {/* Empty/Loading States overlaying the content area */}
            {(isEmpty || isComplete) && !isLoading && (
              <View style={styles.emptyOverlay}>
                <Text className="text-foreground text-xl font-bold">Lounge is quiet...</Text>
                <Text className="text-muted-foreground text-center mt-2 px-8">
                  {isEmpty ? 'No one is vibing here right now.' : "You've met everyone in this room!"}
                </Text>
              </View>
            )}
          </View>

          {/* Match Modal */}
          <MatchModal
            visible={!!matchedProfile}
            profile={matchedProfile}
            currentUserImage={currentUserProfile?.profilePhoto || currentUserProfile?.photos?.[0]}
            onClose={clearMatch}
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
    paddingHorizontal: 16,
    height: 50,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  emptyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)', // Dim background to focus on text
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    margin: 8,
  },
});
