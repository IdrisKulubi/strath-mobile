import React, { useRef, useCallback, useState } from 'react';
import { View, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { useDiscover, DiscoverProfile } from '@/hooks/use-discover';
import { useProfile } from '@/hooks/use-profile';
import { CardStack, SwipeButtons, MatchModal, ProfileDetailSheet } from '@/components/discover';
import { BottomSheetModal, BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Users, ArrowCounterClockwise, SlidersHorizontal } from 'phosphor-react-native';
import { GestureHandlerRootView, Pressable as GesturePressable } from 'react-native-gesture-handler';

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

    const handleInfoPress = useCallback((profile: DiscoverProfile) => {
        setSelectedProfile(profile);
        profileSheetRef.current?.present();
    }, []);

    const handleCloseSheet = useCallback(() => {
        profileSheetRef.current?.dismiss();
        setSelectedProfile(null);
    }, []);

    // Loading state
    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text className="text-muted-foreground text-center mt-4">Finding people near you...</Text>
                </View>
            </SafeAreaView>
        );
    }

    // Empty/Complete state
    if (isEmpty || isComplete) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
                <View style={styles.header}>
                    <View style={styles.headerButton} />
                    <Text style={[styles.logoText, { color: colors.primary }]}>StrathSpace</Text>
                    <View style={styles.headerButton} />
                </View>
                <View style={styles.centerContainer}>
                    <View style={[styles.emptyIcon, { backgroundColor: colors.primary + '20' }]}>
                        <Users size={48} color={colors.primary} />
                    </View>
                    <Text className="text-foreground text-xl font-bold text-center mt-6">
                        {isEmpty ? 'No one around' : 'You\'ve seen everyone!'}
                    </Text>
                    <Text className="text-muted-foreground text-center mt-2 px-8">
                        {isEmpty ? 'Check back later!' : 'Come back later for more!'}
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    // Error state
    if (isError) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
                <View style={styles.centerContainer}>
                    <Text className="text-foreground text-xl font-bold text-center">Something went wrong</Text>
                    <Text className="text-muted-foreground text-center mt-2">Please try again later</Text>
                </View>
            </SafeAreaView>
        );
    }

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

                        <Text style={[styles.logoText, { color: colors.primary }]}>StrathSpace</Text>

                        <GesturePressable style={styles.headerButton}>
                            <SlidersHorizontal size={26} color={colors.foreground} weight="bold" />
                        </GesturePressable>
                    </View>

                    {/* Card Stack - Fills remaining space */}
                    <View style={styles.cardWrapper}>
                        <CardStack
                            profiles={upcomingProfiles}
                            onSwipe={handleSwipe}
                            onInfoPress={handleInfoPress}
                        />

                        {/* Floating Buttons - Positioned over the card */}
                        <SwipeButtons
                            onPass={() => handleSwipe('pass')}
                            onLike={() => handleSwipe('like')}
                            disabled={!currentProfile}
                        />
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
    logoText: {
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
        justifyContent: 'flex-start',
        paddingTop: 4,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
