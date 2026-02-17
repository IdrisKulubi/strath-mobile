import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { useProfile } from '@/hooks/use-profile';
import { WingmanSearchBar, WingmanResults, VoiceRecordingOverlay, WingmanMatchDetail, ConnectionSentPopup } from '@/components/wingman';
import { useAgent, AgentMatch } from '@/hooks/use-agent';
import { useVoiceInput } from '@/hooks/use-voice-input';
import { Question, Sparkle } from 'phosphor-react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

export default function ExploreScreen() {
  const router = useRouter();
  const { colors, colorScheme } = useTheme();
  useProfile(); // Pre-fetch profile for later use

  // ===== Wingman (AI Agent) state =====
  const agent = useAgent();
  const voice = useVoiceInput();
  const [selectedMatch, setSelectedMatch] = React.useState<AgentMatch | null>(null);
  const [connectionSentFor, setConnectionSentFor] = React.useState<string | null>(null);

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
      voice.transcript &&
      voice.transcript.length > 0 &&
      voice.transcript !== lastConsumedTranscript.current
    ) {
      console.log('[Explore] Voice transcript:', voice.transcript);
      lastConsumedTranscript.current = voice.transcript;
      handleWingmanSearch(voice.transcript);
      // Clear transcript so it doesn't re-fire
      voice.clearTranscript();
    }
  }, [voice.transcript, voice.clearTranscript, handleWingmanSearch]);

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

  const handleMatchPress = useCallback((_match: AgentMatch) => {
    setSelectedMatch(_match);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const handleMatchLike = useCallback((match: AgentMatch) => {
    agentFeedbackRef.current(match.profile.userId, 'amazing');
  }, []);

  const handleRefineSearch = useCallback((query: string) => {
    agentSearchRef.current(query);
  }, []);

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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Sparkle size={24} weight="fill" color={colors.primary} />
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Wingman</Text>
          </View>
          <Pressable style={styles.helpButton}>
            <Question size={24} color={colors.mutedForeground} />
          </Pressable>
        </View>

        {/* Wingman AI Search */}
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
  },
  helpButton: {
    padding: 8,
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
