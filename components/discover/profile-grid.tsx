import React from 'react';
import { View, StyleSheet, Pressable, Dimensions } from 'react-native';
import { Text } from '@/components/ui/text';
import { CachedImage } from '@/components/ui/cached-image';
import { useTheme } from '@/hooks/use-theme';
import { DiscoverProfile } from '@/hooks/use-discover';
import { Heart } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2; // 16px padding + 16px gap

interface ProfileGridProps {
    profiles: DiscoverProfile[];
    onProfilePress: (profile: DiscoverProfile) => void;
    currentUserInterests?: string[];
}

export function ProfileGrid({ profiles, onProfilePress, currentUserInterests = [] }: ProfileGridProps) {
    const { colors } = useTheme();

    const getSharedInterests = (profileInterests: string[] = []) => {
        return profileInterests.filter(i => currentUserInterests.includes(i)).length;
    };

    const handlePress = (profile: DiscoverProfile) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onProfilePress(profile);
    };

    return (
        <View style={styles.grid}>
            {profiles.slice(0, 4).map((profile) => {
                const photo = profile.profilePhoto || profile.photos?.[0] || profile.user?.image;
                const name = profile.firstName || profile.user?.name?.split(' ')[0] || 'User';
                const sharedCount = getSharedInterests(profile.interests || []);

                return (
                    <Pressable
                        key={profile.id}
                        onPress={() => handlePress(profile)}
                        style={({ pressed }) => [
                            styles.card,
                            { backgroundColor: colors.card, borderColor: colors.border },
                            pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
                        ]}
                    >
                        {photo ? (
                            <CachedImage uri={photo} style={styles.photo} fallbackType="avatar" />
                        ) : (
                            <View style={[styles.photo, styles.placeholder, { backgroundColor: colors.muted }]}>
                                <Heart size={32} color={colors.mutedForeground} />
                            </View>
                        )}

                        <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
                            <Text style={styles.name} numberOfLines={1}>
                                {name}{profile.age ? `, ${profile.age}` : ''}
                            </Text>
                            {sharedCount > 0 && (
                                <Text style={styles.shared}>
                                    {sharedCount} shared interest{sharedCount > 1 ? 's' : ''}
                                </Text>
                            )}
                        </View>
                    </Pressable>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        paddingHorizontal: 16,
    },
    card: {
        width: CARD_WIDTH,
        height: CARD_WIDTH * 1.3,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
    },
    photo: {
        width: '100%',
        height: '100%',
    },
    placeholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 12,
    },
    name: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    shared: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        marginTop: 2,
    },
});
