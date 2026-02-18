import React from 'react';
import {
    ScrollView,
    View,
    Pressable,
    StyleSheet,
    Platform,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { CachedImage } from '@/components/ui/cached-image';
import { useTheme } from '@/hooks/use-theme';
import { useAllMissions, type Mission } from '@/hooks/use-missions';
import { formatTimeLeft } from '@/components/matches/mission-card';
import { type Match } from '@/hooks/use-matches';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Target } from 'phosphor-react-native';

interface ActiveMissionsStripProps {
    /** Map of matchId → Mission coming from useAllMissions(). Pass down to avoid double-fetch. */
    byMatchId?: Record<string, Mission>;
    /** All matches so we can look up partner info */
    matches: Match[];
    /** Optional override – the strip can call useAllMissions() itself when byMatchId is absent */
    selfFetch?: boolean;
}

interface MissionChipProps {
    mission: Mission;
    match: Match;
    onPress: (matchId: string) => void;
}

function MissionChip({ mission, match, onPress }: MissionChipProps) {
    const { isDark } = useTheme();

    const partnerName =
        match.partner.name ||
        (match.partner.profile?.firstName
            ? `${match.partner.profile.firstName} ${match.partner.profile.lastName || ''}`.trim()
            : 'Them');

    const avatarUri =
        match.partner.image ||
        match.partner.profile?.profilePhoto ||
        match.partner.profile?.photos?.[0];

    const timeLeft = formatTimeLeft(mission.deadline);
    const isInProgress = mission.status === 'accepted';

    return (
        <Pressable
            onPress={() => onPress(mission.matchId)}
            style={({ pressed }) => [styles.chip, { opacity: pressed ? 0.85 : 1 }]}
        >
            <LinearGradient
                colors={
                    isInProgress
                        ? ['rgba(139, 92, 246, 0.25)', 'rgba(109, 40, 217, 0.25)']
                        : ['rgba(139, 92, 246, 0.12)', 'rgba(109, 40, 217, 0.12)']
                }
                style={[
                    styles.chipInner,
                    {
                        borderColor: isInProgress
                            ? 'rgba(139, 92, 246, 0.5)'
                            : isDark
                                ? 'rgba(139, 92, 246, 0.25)'
                                : 'rgba(139, 92, 246, 0.3)',
                    },
                ]}
            >
                {/* Avatar */}
                <View style={styles.chipAvatar}>
                    {avatarUri ? (
                        <CachedImage
                            uri={avatarUri}
                            style={styles.chipAvatarImage}
                        />
                    ) : (
                        <View style={[styles.chipAvatarFallback, { backgroundColor: 'rgba(139, 92, 246, 0.3)' }]}>
                            <Text style={styles.chipAvatarInitial}>
                                {partnerName.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                    )}
                    {/* Status dot */}
                    <View
                        style={[
                            styles.statusDot,
                            { backgroundColor: isInProgress ? '#10b981' : '#8b5cf6' },
                        ]}
                    />
                </View>

                {/* Text */}
                <View style={styles.chipText}>
                    <Text style={styles.chipName} numberOfLines={1}>
                        {partnerName.split(' ')[0]}
                    </Text>
                    <Text style={styles.chipMission} numberOfLines={1}>
                        {mission.emoji} {mission.title}
                    </Text>
                    <Text style={styles.chipTime}>{timeLeft}</Text>
                </View>
            </LinearGradient>
        </Pressable>
    );
}

export function ActiveMissionsStrip({ byMatchId, matches, selfFetch = false }: ActiveMissionsStripProps) {
    const { isDark } = useTheme();
    const router = useRouter();

    // Self-fetch mode for when strip is used standalone
    const { byMatchId: fetchedByMatchId } = useAllMissions();
    const missionsMap = byMatchId ?? fetchedByMatchId;

    const activeMissions = matches
        .map((match) => ({ match, mission: missionsMap[match.id] }))
        .filter(
            ({ mission }) =>
                mission &&
                mission.status !== 'completed' &&
                mission.status !== 'expired' &&
                mission.status !== 'skipped'
        ) as { match: Match; mission: Mission }[];

    if (activeMissions.length === 0) return null;

    const handlePress = (matchId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push({ pathname: '/chat/[matchId]', params: { matchId } } as any);
    };

    return (
        <View style={styles.container}>
            {/* Section label */}
            <View style={styles.header}>
                <Target size={16} color="#8b5cf6" weight="fill" />
                <Text style={[styles.headerText, { color: isDark ? '#94a3b8' : '#6b7280' }]}>
                    Active Missions · {activeMissions.length}
                </Text>
            </View>

            {/* Horizontal scroll */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                decelerationRate="fast"
                snapToAlignment="start"
            >
                {activeMissions.map(({ match, mission }) => (
                    <MissionChip
                        key={mission.id}
                        mission={mission}
                        match={match}
                        onPress={handlePress}
                    />
                ))}
            </ScrollView>

            {/* Divider */}
            <View
                style={[
                    styles.divider,
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' },
                ]}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 4,
        marginBottom: 4,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    headerText: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.3,
        textTransform: 'uppercase',
    },
    scrollContent: {
        paddingHorizontal: 16,
        gap: 10,
    },
    chip: {
        borderRadius: 18,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#8b5cf6',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 6,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    chipInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderRadius: 18,
    },
    chipAvatar: {
        position: 'relative',
    },
    chipAvatarImage: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    chipAvatarFallback: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    chipAvatarInitial: {
        fontSize: 16,
        fontWeight: '700',
        color: '#8b5cf6',
    },
    statusDot: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    chipText: {
        gap: 1,
        maxWidth: 120,
    },
    chipName: {
        fontSize: 13,
        fontWeight: '700',
        color: '#8b5cf6',
    },
    chipMission: {
        fontSize: 12,
        fontWeight: '500',
        color: '#a78bfa',
    },
    chipTime: {
        fontSize: 11,
        color: '#94a3b8',
        fontWeight: '400',
    },
    divider: {
        height: 1,
        marginHorizontal: 16,
        marginTop: 14,
    },
});
