import React, { useRef, useCallback, useState } from 'react';
import { View, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { useDiscover, DiscoverProfile } from '@/hooks/use-discover';
import { useProfile } from '@/hooks/use-profile';
import { CardStack, SwipeButtons, MatchModal, ProfileDetailSheet } from '@/components/discover';
import { BottomSheetModal, BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Users } from 'phosphor-react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function PeopleScreen() {
    const { colors, colorScheme } = useTheme();
    const { data: currentUserProfile } = useProfile();
    const {
        currentProfile,
        upcomingProfiles,
        matchedProfile,
        handleSwipe,
        undoSwipe,
        clearMatch,
        isLoading,
        isError,
        isEmpty,
        isComplete,
        canUndo,
    } = useDiscover();

    const profileSheetRef = useRef<BottomSheetModal>(null);
    const [selectedProfile, setSelectedProfile] = useState<DiscoverProfile | null>(null);

    // Open profile detail sheet
    const handleInfoPress = useCallback((profile: DiscoverProfile) => {
        setSelectedProfile(profile);
        profileSheetRef.current?.present();
    }, []);

    // Close profile detail sheet
    const handleCloseSheet = useCallback(() => {
        profileSheetRef.current?.dismiss();
        setSelectedProfile(null);
    }, []);

    // Render loading state
    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text className="text-muted-foreground text-center mt-4">
                        Finding people near you...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    // Render empty state
    if (isEmpty || isComplete) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
                <View style={styles.header}>
                    <Text className="text-foreground text-[28px] font-bold">People</Text>
                </View>
                <View style={styles.emptyContainer}>
                    <View style={[styles.emptyIconContainer, { backgroundColor: colors.primary + '20' }]}>
                        <Users size={48} color={colors.primary} />
                    </View>
                    <Text className="text-foreground text-xl font-bold text-center mt-6">
                        {isEmpty ? 'No one around' : 'You\'ve seen everyone!'}
                    </Text>
                    <Text className="text-muted-foreground text-center mt-2 px-8">
                        {isEmpty
                            ? 'There are no new profiles to show right now. Check back later!'
                            : 'You\'ve swiped through all available profiles. Come back later for more!'}
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    // Render error state
    if (isError) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
                <View style={styles.emptyContainer}>
                    <Text className="text-foreground text-xl font-bold text-center">
                        Something went wrong
                    </Text>
                    <Text className="text-muted-foreground text-center mt-2">
                        Please try again later
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <BottomSheetModalProvider>
                <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                    <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

                    {/* Header */}
                    <View style={styles.header}>
                        <Text className="text-foreground text-[28px] font-bold">People</Text>
                    </View>

                    {/* Card Stack */}
                    <View style={styles.cardContainer}>
                        <CardStack
                            profiles={upcomingProfiles}
                            onSwipe={handleSwipe}
                            onInfoPress={handleInfoPress}
                        />
                    </View>

                    {/* Swipe Buttons */}
                    <SwipeButtons
                        onPass={() => handleSwipe('pass')}
                        onLike={() => handleSwipe('like')}
                        onUndo={undoSwipe}
                        canUndo={canUndo}
                        disabled={!currentProfile}
                    />

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
        paddingHorizontal: 20,
        paddingVertical: 10,
        marginTop: 10,
    },
    cardContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
