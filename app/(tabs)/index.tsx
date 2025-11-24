import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { useFeed, FeedProfile } from '@/hooks/use-feed';
import { ProfileView } from '@/components/feed/profile-view';

// Dummy data for fallback/demo
const DUMMY_PROFILES: FeedProfile[] = [
  {
    id: '1',
    userId: 'u1',
    firstName: 'Nellee',
    lastName: 'Joy',
    age: 21,
    bio: 'Here for a good time not a long time 🌸\nStudent at Strathmore University.\nLoves coffee and coding.',
    photos: ['https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=687&q=80'],
    interests: ['Coffee', 'Coding', 'Music', 'Travel'],
    university: 'Strathmore',
    course: 'Computer Science',
    yearOfStudy: 3,
  },
  {
    id: '2',
    userId: 'u2',
    firstName: 'James',
    lastName: 'Bond',
    age: 23,
    bio: 'Just looking for my study buddy 📚\nLaw student.',
    photos: ['https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=687&q=80'],
    interests: ['Law', 'Debate', 'Rugby'],
    university: 'Strathmore',
    course: 'Law',
    yearOfStudy: 4,
  }
];

export default function DiscoverScreen() {
  const { colors } = useTheme();
  const { data: serverProfiles, isLoading, error } = useFeed();
  const [profiles, setProfiles] = useState<FeedProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Sync server data to local state when loaded
  useEffect(() => {
    if (serverProfiles && serverProfiles.length > 0) {
      setProfiles(serverProfiles);
    } else if (!isLoading && (!serverProfiles || serverProfiles.length === 0)) {
      // Fallback to dummy if no server data or error
      setProfiles(DUMMY_PROFILES);
    }
  }, [serverProfiles, isLoading]);

  const handleNext = () => {
    if (currentIndex < profiles.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // End of list, reset for demo
      setCurrentIndex(0);
    }
  };

  const handleLike = () => {
    console.log("Liked profile:", profiles[currentIndex].id);
    handleNext();
  };

  const handlePass = () => {
    console.log("Passed profile:", profiles[currentIndex].id);
    handleNext();
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const currentProfile = profiles[currentIndex];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Strathspace</Text>
      </View>

      {/* Main Content */}
      {currentProfile ? (
        <ProfileView
          profile={currentProfile}
          onLike={handleLike}
          onPass={handlePass}
        />
      ) : (
        <View style={styles.center}>
          <Text style={{ color: colors.foreground }}>No profiles found.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
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
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF', // Or theme color
    letterSpacing: 0.5,
  },
  profileIcon: {
    padding: 4,
  },
});
