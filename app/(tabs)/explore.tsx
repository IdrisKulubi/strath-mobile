import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { useProfile } from '@/hooks/use-profile';
import { WingmanSearchBar, WingmanResults, VoiceRecordingOverlay, WingmanMatchDetail, ConnectionSentPopup, DropNotification, WeeklyDrop, WeeklyDropStrip } from '@/components/wingman';
import { useAgent, AgentMatch } from '@/hooks/use-agent';
import { useVoiceInput } from '@/hooks/use-voice-input';
import { useWeeklyDrop, WeeklyDropMatch } from '@/hooks/use-weekly-drop';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

export default function ExploreScreen() {
  const router = useRouter();
  const { colors, colorScheme } = useTheme();
  useProfile(); // Pre-fetch profile for later use
  const scrollRef = useRef<ScrollView>(null);

  // ===== Wingman (AI Agent) state =====
  const agent = useAgent();
  const weeklyDrop = useWeeklyDrop();
  const voice = useVoiceInput();
  const { transcript, clearTranscript, error: voiceError } = voice;
  const [selectedMatch, setSelectedMatch] = React.useState<AgentMatch | null>(null);
  const [connectionSentFor, setConnectionSentFor] = React.useState<string | null>(null);
  const [showDropBanner, setShowDropBanner] = React.useState(false);

  // Stable references — avoid depending on the whole `agent` / `voice` objects
  const agentSearchRef = useRef(agent.search);
  agentSearchRef.current = agent.search;
  const agentFeedbackRef = useRef(agent.submitFeedback);
  agentFeedbackRef.current = agent.submitFeedback;
  const voiceToggleRef = useRef(voice.toggleRecording);
  voiceToggleRef.current = voice.toggleRecording;

  // Track which transcript we already consumed to avoid re-triggering
  const lastConsumedTranscript = useRef<string | null>(null);

  const handleWingmanSearch = useCallback((query: string) => {
    console.log('[Explore] Searching:', query);
    agentSearchRef.current(query);
  }, []);

  const handleVoicePress = useCallback(() => {
    voiceToggleRef.current();
  }, []);

  // When voice transcript is ready, trigger search ONCE then clear it
  useEffect(() => {
    if (
      transcript &&
      transcript.length > 0 &&
      transcript !== lastConsumedTranscript.current
    ) {
      console.log('[Explore] Voice transcript:', transcript);
      lastConsumedTranscript.current = transcript;
      handleWingmanSearch(transcript);
      // Clear transcript so it doesn't re-fire
      clearTranscript();
    }
  }, [transcript, clearTranscript, handleWingmanSearch]);

  // Show voice errors to user
  useEffect(() => {
    if (voiceError) {
      Alert.alert('Voice Input', voiceError);
    }
  }, [voiceError]);

  // Show search errors to user
  useEffect(() => {
    if (agent.searchError) {
      Alert.alert('Search Error', agent.searchError);
    }
  }, [agent.searchError]);

  useEffect(() => {
    if (weeklyDrop.currentDrop?.justOpened) {
      setShowDropBanner(true);
    }
  }, [weeklyDrop.currentDrop?.id, weeklyDrop.currentDrop?.justOpened]);

  const handleMatchPress = useCallback((_match: AgentMatch) => {
    setSelectedMatch(_match);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const handleMatchLike = useCallback((match: AgentMatch) => {
    agentFeedbackRef.current(match.profile.userId, 'amazing');
  }, []);

  const handleRefineSearch = useCallback((query: string) => {
    agent.refine(query);
  }, [agent]);

  const handleCloseDetail = useCallback(() => {
    setSelectedMatch(null);
  }, []);

  const handleConnectFromDetail = useCallback(async (match: AgentMatch, introMessage: string) => {
    const result = await agent.connectWithIntro(match.profile.userId, introMessage);

    if (result.matched && result.matchId) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSelectedMatch(null);
      router.push({ pathname: '/chat/[matchId]', params: { matchId: result.matchId } });
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMatch(null);
    setConnectionSentFor(match.profile.firstName || 'They');
  }, [agent, router]);

  const handleCloseConnectionPopup = useCallback(() => {
    setConnectionSentFor(null);
  }, []);

  const handleOpenDrop = useCallback(() => {
    setShowDropBanner(false);
    router.push('/(tabs)/drops');
  }, [router]);

  const handleTalkToAgent = useCallback(() => {
    setShowDropBanner(false);
    agent.clear();
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [agent]);

  const handleDropMatchPress = useCallback((dropMatch: WeeklyDropMatch) => {
    const mappedMatch: AgentMatch = {
      profile: {
        userId: dropMatch.userId,
        firstName: dropMatch.profile?.firstName || null,
        lastName: dropMatch.profile?.lastName || null,
        bio: null,
        age: dropMatch.profile?.age || null,
        gender: null,
        university: null,
        course: dropMatch.profile?.course || null,
        yearOfStudy: dropMatch.profile?.yearOfStudy || null,
        interests: null,
        photos: dropMatch.profile?.photos || null,
        profilePhoto: dropMatch.profile?.profilePhoto || null,
        qualities: null,
        prompts: null,
        aboutMe: null,
        personalitySummary: null,
        personalityType: null,
        communicationStyle: null,
        loveLanguage: null,
        lookingFor: null,
        religion: null,
        lastActive: null,
      },
      explanation: {
        tagline: 'Weekly drop pick',
        summary: dropMatch.reasons.join(' • '),
        conversationStarters: dropMatch.starters,
        vibeEmoji: '🎯',
        matchPercentage: dropMatch.score,
      },
      scores: {
        total: dropMatch.score,
        vector: dropMatch.score,
        preference: dropMatch.score,
        filterMatch: true,
      },
    };

    setSelectedMatch(mappedMatch);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            
            <Text style={[styles.headerTitle, { color: colors.primary }]}>Strathspace</Text>
          </View>
        </View>

        {/* Wingman AI Search */}
        <View style={styles.wingmanContainer}>
          <DropNotification
            visible={showDropBanner}
            onOpen={handleOpenDrop}
            onDismiss={() => setShowDropBanner(false)}
          />

          {!agent.currentQuery && weeklyDrop.currentDrop && (
            <WeeklyDropStrip
              drop={weeklyDrop.currentDrop}
              onOpen={handleOpenDrop}
            />
          )}

          <WingmanSearchBar
            onSearch={handleWingmanSearch}
            onVoicePress={handleVoicePress}
            isSearching={agent.isSearching}
            isRecording={voice.isRecording}
            initialQuery={voice.transcript || undefined}
          />
          <ScrollView
            ref={scrollRef}
            style={styles.wingmanScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.wingmanScrollContent}
          >
            {!agent.currentQuery && (
              <WeeklyDrop
                currentDrop={weeklyDrop.currentDrop}
                history={weeklyDrop.dropHistory}
                isLoading={weeklyDrop.isCurrentLoading}
                showCurrent={false}
                onRefresh={() => {
                  weeklyDrop.refetchCurrent();
                  weeklyDrop.refetchHistory();
                }}
                onTalkToAgent={handleTalkToAgent}
                onMatchPress={handleDropMatchPress}
                onViewHistory={() => router.push('/weekly-drop-history')}
              />
            )}

            <WingmanResults
              matches={agent.matches}
              commentary={agent.commentary}
              refinementHints={agent.refinementHints}
              intent={agent.intent}
              meta={agent.meta}
              isSearching={agent.isSearching}
              searchError={agent.searchError}
              currentQuery={agent.currentQuery}
              onLoadMore={agent.loadMore}
              onMatchPress={handleMatchPress}
              onMatchLike={handleMatchLike}
              onRefine={handleRefineSearch}
              isRefining={agent.isRefining}
            />
          </ScrollView>

          {/* Voice recording overlay */}
          <VoiceRecordingOverlay
            isRecording={voice.isRecording}
            isTranscribing={voice.isTranscribing}
            liveTranscript={voice.liveTranscript}
            volume={voice.volume}
            onStop={voice.toggleRecording}
            onCancel={voice.cancelRecording}
          />

          <WingmanMatchDetail
            visible={!!selectedMatch}
            match={selectedMatch}
            isConnecting={agent.isConnecting}
            onClose={handleCloseDetail}
            onConnect={handleConnectFromDetail}
          />

          <ConnectionSentPopup
            visible={!!connectionSentFor}
            firstName={connectionSentFor}
            onClose={handleCloseConnectionPopup}
          />
        </View>
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
    paddingVertical: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
    paddingTop: 1,
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
