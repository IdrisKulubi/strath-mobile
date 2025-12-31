import React from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    Image,
    Dimensions,
    Pressable,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { DiscoverProfile } from '@/hooks/use-discover';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { GraduationCap, MapPin, CalendarBlank, User, X } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { forwardRef, useCallback, useMemo } from 'react';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_SIZE = SCREEN_WIDTH - 40;

interface ProfileDetailSheetProps {
    profile: DiscoverProfile | null;
    onClose: () => void;
}

export const ProfileDetailSheet = forwardRef<BottomSheetModal, ProfileDetailSheetProps>(
    ({ profile, onClose }, ref) => {
        const { colors } = useTheme();
        const insets = useSafeAreaInsets();

        const snapPoints = useMemo(() => ['85%'], []);

        const handleSheetChanges = useCallback((index: number) => {
            if (index === -1) {
                onClose();
            }
        }, [onClose]);

        if (!profile) return null;

        // Get all photos
        const allPhotos: string[] = [];
        if (profile.profilePhoto) allPhotos.push(profile.profilePhoto);
        if (profile.photos) allPhotos.push(...profile.photos.filter(p => p && p !== profile.profilePhoto));
        if (profile.user?.image && !allPhotos.includes(profile.user.image)) {
            allPhotos.unshift(profile.user.image);
        }

        const displayName = profile.firstName
            ? `${profile.firstName}${profile.lastName ? ' ' + profile.lastName : ''}`
            : profile.user?.name || 'User';
        const interests = profile.interests || [];

        return (
            <BottomSheetModal
                ref={ref}
                index={0}
                snapPoints={snapPoints}
                onChange={handleSheetChanges}
                backgroundStyle={{ backgroundColor: colors.card }}
                handleIndicatorStyle={{ backgroundColor: colors.mutedForeground }}
            >
                <View style={styles.header}>
                    <Text style={[styles.headerTitle, { color: colors.foreground }]}>
                        Profile
                    </Text>
                    <Pressable onPress={onClose} hitSlop={10}>
                        <X size={24} color={colors.foreground} />
                    </Pressable>
                </View>

                <BottomSheetScrollView
                    contentContainerStyle={[
                        styles.scrollContent,
                        { paddingBottom: insets.bottom + 20 },
                    ]}
                >
                    {/* Photos */}
                    {allPhotos.length > 0 && (
                        <ScrollView
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            style={styles.photosScroll}
                        >
                            {allPhotos.map((photo, index) => (
                                <Image
                                    key={index}
                                    source={{ uri: photo }}
                                    style={styles.photo}
                                    resizeMode="cover"
                                />
                            ))}
                        </ScrollView>
                    )}

                    {/* Name & Age */}
                    <View style={styles.section}>
                        <Text style={[styles.name, { color: colors.foreground }]}>
                            {displayName}{profile.age ? `, ${profile.age}` : ''}
                        </Text>
                    </View>

                    {/* Details */}
                    <View style={[styles.detailsCard, { backgroundColor: colors.background }]}>
                        {profile.university && (
                            <View style={styles.detailRow}>
                                <GraduationCap size={20} color={colors.primary} />
                                <Text style={[styles.detailText, { color: colors.foreground }]}>
                                    {profile.university}
                                </Text>
                            </View>
                        )}
                        {profile.course && (
                            <View style={styles.detailRow}>
                                <CalendarBlank size={20} color={colors.primary} />
                                <Text style={[styles.detailText, { color: colors.foreground }]}>
                                    {profile.course}
                                    {profile.yearOfStudy ? ` • Year ${profile.yearOfStudy}` : ''}
                                </Text>
                            </View>
                        )}
                        {profile.gender && (
                            <View style={styles.detailRow}>
                                <User size={20} color={colors.primary} />
                                <Text style={[styles.detailText, { color: colors.foreground }]}>
                                    {profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Bio */}
                    {profile.bio && (
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                                About
                            </Text>
                            <Text style={[styles.bioText, { color: colors.mutedForeground }]}>
                                {profile.bio}
                            </Text>
                        </View>
                    )}

                    {/* Interests */}
                    {interests.length > 0 && (
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                                Interests
                            </Text>
                            <View style={styles.interestsGrid}>
                                {interests.map((interest, index) => (
                                    <View
                                        key={index}
                                        style={[styles.interestChip, { backgroundColor: colors.primary + '20' }]}
                                    >
                                        <Text style={[styles.interestText, { color: colors.primary }]}>
                                            {interest}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}
                </BottomSheetScrollView>
            </BottomSheetModal>
        );
    }
);

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    scrollContent: {
        paddingHorizontal: 20,
    },
    photosScroll: {
        marginTop: 16,
        marginHorizontal: -20,
    },
    photo: {
        width: PHOTO_SIZE,
        height: PHOTO_SIZE,
        marginHorizontal: 20,
        borderRadius: 12,
    },
    section: {
        marginTop: 20,
    },
    name: {
        fontSize: 28,
        fontWeight: '700',
    },
    detailsCard: {
        marginTop: 16,
        padding: 16,
        borderRadius: 12,
        gap: 12,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    detailText: {
        fontSize: 15,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 10,
    },
    bioText: {
        fontSize: 15,
        lineHeight: 22,
    },
    interestsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    interestChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
    },
    interestText: {
        fontSize: 14,
        fontWeight: '500',
    },
});
