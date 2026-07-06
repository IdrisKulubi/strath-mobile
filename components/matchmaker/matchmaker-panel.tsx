import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Search, Sparkles, WandSparkles } from 'lucide-react-native';

import { MatchmakerCandidateCard } from '@/components/matchmaker/matchmaker-candidate-card';
import { Text } from '@/components/ui/text';
import { useMatchmakerSearch } from '@/hooks/use-matchmaker';
import { useTheme } from '@/hooks/use-theme';
import type { MatchmakerCandidate } from '@/types/matchmaker';

const QUICK_PROMPTS = [
  'Someone calm, consistent, and active today',
  'A serious person who likes deep conversations',
  'Someone social, funny, and easy to plan with',
];

interface MatchmakerPanelProps {
  onOpenProfile: (userId: string) => void;
}

export function MatchmakerPanel({ onOpenProfile }: MatchmakerPanelProps) {
  const { colors, isDark } = useTheme();
  const search = useMatchmakerSearch();
  const [intent, setIntent] = useState('');
  const [lastIntent, setLastIntent] = useState('');

  const result = search.data;
  const canSearch = intent.trim().length >= 3 && !search.isPending;
  const searchedCandidateCount = result?.meta.searchedCachedCandidates ?? 0;
  const traits = useMemo(() => result?.intent.traits.slice(0, 4) ?? [], [result?.intent.traits]);

  const runSearch = useCallback(async (nextIntent = intent) => {
    const cleaned = nextIntent.trim();
    if (cleaned.length < 3 || search.isPending) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIntent(cleaned);
    setLastIntent(cleaned);
    await search.mutateAsync({ intent: cleaned, limit: 5 });
  }, [intent, search]);

  const choosePrompt = useCallback((prompt: string) => {
    setIntent(prompt);
    runSearch(prompt).catch(() => undefined);
  }, [runSearch]);

  const openCandidate = useCallback((candidate: MatchmakerCandidate) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onOpenProfile(candidate.candidateUserId);
  }, [onOpenProfile]);

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.panel,
          {
            backgroundColor: isDark ? colors.card : '#fff',
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.headingRow}>
          <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
            <WandSparkles size={20} color={colors.primary} />
          </View>
          <View style={styles.headingCopy}>
            <Text style={[styles.kicker, { color: colors.primary }]}>AI Matchmaker</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>
              Tell me who feels right today.
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.inputWrap,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F7F6F9',
              borderColor: colors.border,
            },
          ]}
        >
          <TextInput
            value={intent}
            onChangeText={setIntent}
            multiline
            textAlignVertical="top"
            placeholder="Example: calm, ambitious, active today, and open to a real date"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { color: colors.foreground }]}
            returnKeyType="search"
          />
        </View>

        <View style={styles.quickRow}>
          {QUICK_PROMPTS.map((prompt) => (
            <Pressable
              key={prompt}
              accessibilityRole="button"
              accessibilityLabel={`Use prompt: ${prompt}`}
              onPress={() => choosePrompt(prompt)}
              disabled={search.isPending}
              style={({ pressed }) => [
                  styles.quickChip,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F3F0F5',
                    borderColor: colors.border,
                  },
                  pressed && !search.isPending && styles.pressedSecondary,
                ]}
            >
              <Text style={[styles.quickText, { color: colors.foreground }]}>
                {prompt}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Find my people"
          accessibilityHint="Searches matchmaker candidates from your typed preference."
          onPress={() => runSearch().catch(() => undefined)}
          disabled={!canSearch}
          style={({ pressed }) => [
              styles.searchButton,
              { backgroundColor: colors.primary },
              pressed && canSearch && styles.pressedPrimary,
              !canSearch && styles.disabled,
            ]}
        >
          {search.isPending ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Search size={18} color={colors.primaryForeground} />
          )}
          <Text style={[styles.searchText, { color: colors.primaryForeground }]}>
            {search.isPending ? 'Finding matches' : 'Find my people'}
          </Text>
        </Pressable>
      </View>

      {search.isError ? (
        <View style={[styles.messageBox, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
          <Text style={[styles.messageTitle, { color: colors.foreground }]}>Matchmaker could not search</Text>
          <Text style={[styles.messageBody, { color: colors.mutedForeground }]}>
            {search.error instanceof Error ? search.error.message : 'Try again in a moment.'}
          </Text>
        </View>
      ) : null}

      {result ? (
        <View style={styles.results}>
          <View style={styles.resultsHeader}>
            <View style={styles.resultsCopy}>
              <Text style={[styles.resultsTitle, { color: colors.foreground }]}>
                {result.candidates.length > 0 ? 'Best matches now' : 'No strong matches yet'}
              </Text>
              <Text style={[styles.resultsSub, { color: colors.mutedForeground }]}>
                {result.summary || `Searched ${searchedCandidateCount} profiles for "${lastIntent}".`}
              </Text>
            </View>
            <View style={[styles.countBadge, { backgroundColor: colors.secondary }]}>
              <Sparkles size={12} color={colors.primary} />
              <Text style={[styles.countText, { color: colors.primary }]}>
                {result.candidates.length}
              </Text>
            </View>
          </View>

          {traits.length > 0 ? (
            <View style={styles.traits}>
              {traits.map((trait) => (
                <View
                  key={trait}
                  style={[
                    styles.traitChip,
                    {
                      backgroundColor: isDark ? 'rgba(217,74,143,0.12)' : '#F8EAF2',
                      borderColor: isDark ? 'rgba(217,74,143,0.28)' : '#E9B8D2',
                    },
                  ]}
                >
                  <Text style={[styles.traitText, { color: colors.primary }]} numberOfLines={1}>
                    {trait}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.cards}>
            {result.candidates.map((candidate) => (
              <MatchmakerCandidateCard
                key={candidate.candidateUserId}
                candidate={candidate}
                onPress={openCandidate}
              />
            ))}
          </View>
        </View>
      ) : (
        <View style={[styles.messageBox, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
          <Text style={[styles.messageTitle, { color: colors.foreground }]}>Start with a real preference</Text>
          <Text style={[styles.messageBody, { color: colors.mutedForeground }]}>
            The matchmaker searches active, summarized profiles and explains why each person fits.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 14,
  },
  panel: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headingCopy: {
    flex: 1,
    minWidth: 0,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 2,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '800',
  },
  inputWrap: {
    minHeight: 104,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: {
    minHeight: 80,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '500',
  },
  quickRow: {
    gap: 8,
  },
  quickChip: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  quickText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  searchButton: {
    minHeight: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  disabled: {
    opacity: 0.55,
  },
  pressedPrimary: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  pressedSecondary: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
  searchText: {
    fontSize: 15,
    fontWeight: '800',
  },
  messageBox: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  messageTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  messageBody: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  results: {
    gap: 12,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  resultsCopy: {
    flex: 1,
    minWidth: 0,
  },
  resultsTitle: {
    fontSize: 19,
    fontWeight: '800',
  },
  resultsSub: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  countBadge: {
    minWidth: 40,
    height: 32,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  countText: {
    fontSize: 13,
    fontWeight: '800',
  },
  traits: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  traitChip: {
    maxWidth: '100%',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  traitText: {
    fontSize: 12,
    fontWeight: '800',
  },
  cards: {
    gap: 10,
  },
});
