import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MessageCircle, Search, SlidersHorizontal, Sparkles } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { MatchmakerConversation } from '@/components/matchmaker/matchmaker-conversation';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';

export function MatchmakerHomeShell() {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      <Animated.View
        entering={FadeInDown.duration(260)}
        style={[styles.station, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <LinearGradient
          colors={['rgba(255,244,248,0.95)', 'rgba(253,228,238,0.78)', 'rgba(255,255,255,0.18)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.stationHeader}>
          <View style={styles.statusCopy}>
            <Text style={[styles.statusLabel, { color: colors.mutedForeground }]}>
              Today's matchmaker
            </Text>
            <Text style={[styles.statusTitle, { color: colors.foreground }]}>
              Your matchmaker is <Text style={[styles.statusEmphasis, { color: colors.primary }]}>tuning the room</Text>
            </Text>
            <Text style={[styles.statusBody, { color: colors.foreground }]}>
              I will learn what feels right, then find your best match.
            </Text>
            <View style={[styles.searchBadge, { backgroundColor: 'rgba(184,50,122,0.10)', borderColor: 'rgba(184,50,122,0.22)' }]}>
              <Sparkles size={14} color={colors.primary} />
              <Text style={[styles.searchBadgeText, { color: colors.primary }]}>3 searches left</Text>
            </View>
          </View>
          <View style={styles.matchmakerArt} pointerEvents="none">
            <View style={styles.artHalo} />
            <View style={styles.artHead} />
            <View style={styles.artBody} />
            <View style={styles.artBase} />
            <Text style={styles.artSparkleTop}>+</Text>
            <Text style={styles.artSparkleLeft}>+</Text>
          </View>
        </View>

        <View style={[styles.stageCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.stageStep}>
            <View style={[styles.stageIconActive, { borderColor: colors.primary }]}>
              <MessageCircle size={15} color={colors.primary} />
            </View>
            <Text style={[styles.stageTextActive, { color: colors.primary }]}>Tell me</Text>
          </View>
          <View style={styles.stageDash} />
          <View style={styles.stageStep}>
            <View style={[styles.stageIcon, { borderColor: colors.border }]}>
              <SlidersHorizontal size={15} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.stageText, { color: colors.mutedForeground }]}>Refine</Text>
          </View>
          <View style={styles.stageDash} />
          <View style={styles.stageStep}>
            <View style={[styles.stageIcon, { borderColor: colors.border }]}>
              <Search size={15} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.stageText, { color: colors.mutedForeground }]}>Search</Text>
          </View>
        </View>
      </Animated.View>

      <MatchmakerConversation />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: SPACING.comfortable,
  },
  station: {
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: 24,
    padding: SPACING.comfortable,
    gap: SPACING.comfortable,
  },
  stationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.compact,
  },
  statusCopy: {
    flex: 1,
    minWidth: 0,
  },
  statusLabel: {
    ...TYPOGRAPHY.label,
    fontWeight: '800',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  statusTitle: {
    marginTop: SPACING.tight,
    fontSize: 29,
    lineHeight: 34,
    fontWeight: '800',
  },
  statusEmphasis: {
    fontStyle: 'italic',
    fontWeight: '700',
  },
  statusBody: {
    marginTop: SPACING.tight,
    maxWidth: 230,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
  searchBadge: {
    alignSelf: 'flex-start',
    minHeight: 34,
    marginTop: SPACING.base,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.tight,
    paddingHorizontal: SPACING.compact,
  },
  searchBadgeText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
  },
  matchmakerArt: {
    width: 136,
    height: 164,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  artHalo: {
    position: 'absolute',
    top: 10,
    width: 116,
    height: 132,
    borderTopLeftRadius: 58,
    borderTopRightRadius: 58,
    backgroundColor: 'rgba(232,96,157,0.22)',
  },
  artHead: {
    position: 'absolute',
    top: 38,
    width: 38,
    height: 48,
    borderRadius: 22,
    backgroundColor: '#F4A86D',
  },
  artBody: {
    width: 92,
    height: 92,
    borderTopLeftRadius: 48,
    borderTopRightRadius: 48,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    backgroundColor: '#C32172',
  },
  artBase: {
    position: 'absolute',
    right: 4,
    bottom: 0,
    width: 52,
    height: 74,
    borderTopLeftRadius: 48,
    borderTopRightRadius: 48,
    backgroundColor: '#211431',
  },
  artSparkleTop: {
    position: 'absolute',
    right: 10,
    top: 12,
    color: 'rgba(255,255,255,0.95)',
    fontSize: 34,
    lineHeight: 34,
    fontWeight: '300',
  },
  artSparkleLeft: {
    position: 'absolute',
    left: 8,
    top: 68,
    color: 'rgba(255,255,255,0.95)',
    fontSize: 32,
    lineHeight: 32,
    fontWeight: '300',
  },
  stageCard: {
    minHeight: 76,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.base,
  },
  stageStep: {
    alignItems: 'center',
    gap: SPACING.micro,
  },
  stageIconActive: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageIcon: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageTextActive: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  stageText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  stageDash: {
    flex: 1,
    height: 1,
    marginHorizontal: SPACING.compact,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#6B6075',
  },
});
