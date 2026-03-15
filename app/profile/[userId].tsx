import React, { useCallback, useState } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    StatusBar,
    Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useMarkRequestSent } from '@/hooks/use-daily-matches';
import { CachedImage } from '@/components/ui/cached-image';
import { ProfilePhotos } from '@/components/profile-view/profile-photos';
import { ProfilePhotoViewer } from '@/components/profile-view/profile-photo-viewer';
import { CompatibilityBlock } from '@/components/profile-view/compatibility-block';
import { InterestsChips } from '@/components/profile-view/interests-chips';
import { PersonalityTags } from '@/components/profile-view/personality-tags';
import { WingmanQuotes } from '@/components/profile-view/wingman-quotes';
import { ProfileViewCta } from '@/components/profile-view/profile-view-cta';
import { DateRequestSheet } from '@/components/date-request/date-request-sheet';
import { Skeleton } from '@/components/ui/skeleton';

function ProfileSkeleton() {
    return (
        <View style={{ gap: 16 }}>
            <Skeleton style={{ height: 420 }} />
            <View style={{ paddingHorizontal: 20, gap: 12 }}>
                <Skeleton style={{ height: 28, width: '60%', borderRadius: 8 }} />
                <Skeleton style={{ height: 100, borderRadius: 16 }} />
                <Skeleton style={{ height: 80, borderRadius: 12 }} />
                <Skeleton style={{ height: 60, borderRadius: 12 }} />
            </View>
        </View>
    );
}

function InlinePhotoBreak({
    uri,
    label,
    variant = 'full',
    onPhotoPress,
}: {
    uri?: string;
    label: string;
    variant?: 'full' | 'left' | 'right';
    onPhotoPress?: (uri: string) => void;
}) {
    const { colors, isDark } = useTheme();

    if (!uri) return null;

    const isFull = variant === 'full';
    const isRight = variant === 'right';

    return (
        <View
            style={[
                styles.photoBreakWrap,
                !isFull && styles.photoBreakWrapSplit,
                isRight && styles.photoBreakWrapRight,
            ]}
        >
            <View
                style={[
                    styles.photoBreakCard,
                    !isFull && styles.photoBreakCardSplit,
                    isRight && styles.photoBreakCardRight,
                    {
                        backgroundColor: isDark ? colors.card : '#fff',
                        borderColor: colors.border,
                    },
                ]}
            >
                <Pressable style={styles.photoBreakImage} onPress={() => onPhotoPress?.(uri)}>
                    <CachedImage uri={uri} style={styles.photoBreakImage} contentFit="cover" />
                </Pressable>
                <View
                    style={[
                        styles.photoBreakLabel,
                        isRight && styles.photoBreakLabelRight,
                    ]}
                >
                    <Ionicons name="images-outline" size={14} color="#fff" />
                    <Text style={styles.photoBreakLabelText}>{label}</Text>
                </View>
            </View>
        </View>
    );
}

function ProfileSectionCard({
    children,
}: {
    children: React.ReactNode;
}) {
    const { colors, isDark } = useTheme();

    return (
        <View
            style={[
                styles.sectionCard,
                {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                    borderColor: colors.border,
                },
            ]}
        >
            {children}
        </View>
    );
}

export default function ProfileViewScreen() {
    const { userId } = useLocalSearchParams<{ userId: string }>();
    const router = useRouter();
    const { colors, colorScheme } = useTheme();
    const isDark = colorScheme === 'dark';

    const { data: profile, isLoading } = useUserProfile(userId ?? '');
    const markRequestSent = useMarkRequestSent();

    const [sheetVisible, setSheetVisible] = useState(false);
    const [requestSent, setRequestSent] = useState(false);
    const [fullScreenPhotoUri, setFullScreenPhotoUri] = useState<string | null>(null);

    const handleBack = useCallback(() => {
        router.back();
    }, [router]);

    const handleAskForDate = useCallback(() => {
        setSheetVisible(true);
    }, []);

    const handleSheetClose = useCallback(() => {
        setSheetVisible(false);
    }, []);

    const handleRequestSuccess = useCallback(() => {
        setRequestSent(true);
        setSheetVisible(false);
        if (userId) {
            markRequestSent(userId);
        }
    }, [userId, markRequestSent]);

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
                <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
                <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                    <ProfileSkeleton />
                </ScrollView>
            </SafeAreaView>
        );
    }

    if (!profile) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
                <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
                <View style={styles.errorState}>
                    <Text style={[styles.errorTitle, { color: colors.foreground }]}>Profile not found</Text>
                    <Text style={[styles.errorSubtitle, { color: colors.mutedForeground }]}>
                        This profile may no longer be available.
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    const allPhotos = [
        profile.profilePhoto,
        ...(profile.photos ?? []),
    ].filter(Boolean) as string[];
    const galleryPhotos = allPhotos.slice(1);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle="light-content" />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Photos with back button */}
                <ProfilePhotos
                    photos={allPhotos.length > 0 ? allPhotos : [undefined]}
                    onBack={handleBack}
                    onPhotoPress={(uri) => setFullScreenPhotoUri(uri)}
                />

                {/* Content */}
                <View style={styles.content}>
                    {/* Name + age + course */}
                    <View style={styles.nameSection}>
                        <Text style={[styles.name, { color: colors.foreground }]}>
                            {profile.firstName}, {profile.age}
                        </Text>
                        {(profile.course || profile.university) && (
                            <Text style={[styles.courseLine, { color: colors.mutedForeground }]}>
                                {[profile.course, profile.university].filter(Boolean).join(' · ')}
                            </Text>
                        )}
                    </View>

                    {/* Compatibility block */}
                    <CompatibilityBlock
                        score={profile.compatibilityScore}
                        reasons={profile.reasons}
                    />

                    {/* Bio */}
                    {profile.bio && (
                        <ProfileSectionCard>
                            <View style={styles.bioSection}>
                                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>About</Text>
                                <Text style={[styles.bio, { color: colors.foreground }]}>{profile.bio}</Text>
                            </View>
                        </ProfileSectionCard>
                    )}

                    <InlinePhotoBreak
                        uri={galleryPhotos[0]}
                        label="A little more of their vibe"
                        variant="full"
                        onPhotoPress={(uri) => setFullScreenPhotoUri(uri)}
                    />

                    {/* Interests */}
                    {profile.interests && profile.interests.length > 0 && (
                        <ProfileSectionCard>
                            <InterestsChips interests={profile.interests} />
                        </ProfileSectionCard>
                    )}

                    <InlinePhotoBreak
                        uri={galleryPhotos[1]}
                        label="More than just the headline"
                        variant="right"
                        onPhotoPress={(uri) => setFullScreenPhotoUri(uri)}
                    />

                    {/* Personality */}
                    {profile.personalityTags && profile.personalityTags.length > 0 && (
                        <ProfileSectionCard>
                            <PersonalityTags tags={profile.personalityTags} />
                        </ProfileSectionCard>
                    )}

                    <InlinePhotoBreak
                        uri={galleryPhotos[2]}
                        label="How their energy feels"
                        variant="left"
                        onPhotoPress={(uri) => setFullScreenPhotoUri(uri)}
                    />

                    {/* Wingman quotes */}
                    {profile.wingmanQuotes && profile.wingmanQuotes.length > 0 && (
                        <ProfileSectionCard>
                            <WingmanQuotes quotes={profile.wingmanQuotes} />
                        </ProfileSectionCard>
                    )}

                    <InlinePhotoBreak
                        uri={galleryPhotos[3]}
                        label="One last glance"
                        variant="full"
                        onPhotoPress={(uri) => setFullScreenPhotoUri(uri)}
                    />
                </View>
            </ScrollView>

            {/* Sticky CTA */}
            <ProfileViewCta
                onAskForDate={handleAskForDate}
                requestSent={requestSent || (profile?.requestSent ?? false)}
            />

            {/* Full-screen photo viewer */}
            <ProfilePhotoViewer
                visible={!!fullScreenPhotoUri}
                uri={fullScreenPhotoUri}
                onClose={() => setFullScreenPhotoUri(null)}
            />

            {/* Date request sheet */}
            <DateRequestSheet
                visible={sheetVisible}
                toUserId={profile.userId}
                toUserName={profile.firstName}
                onClose={handleSheetClose}
                onSuccess={handleRequestSuccess}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 16,
    },
    content: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 28,
        gap: 24,
    },
    nameSection: {
        gap: 4,
    },
    name: {
        fontSize: 26,
        fontWeight: '700',
        letterSpacing: -0.3,
        lineHeight: 32,
        paddingTop: 2,
    },
    courseLine: {
        fontSize: 15,
        fontWeight: '400',
    },
    bioSection: {
        gap: 6,
    },
    sectionCard: {
        borderRadius: 22,
        borderWidth: 1,
        padding: 16,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    bio: {
        fontSize: 15,
        lineHeight: 22,
    },
    photoBreakWrap: {
        marginTop: -2,
    },
    photoBreakWrapSplit: {
        width: '100%',
    },
    photoBreakWrapRight: {},
    photoBreakCard: {
        height: 480,
        borderRadius: 28,
        borderWidth: 1,
        overflow: 'hidden',
        position: 'relative',
    },
    photoBreakCardSplit: {
        height: 480,
        borderRadius: 28,
    },
    photoBreakCardRight: {
        borderTopRightRadius: 28,
        borderBottomLeftRadius: 28,
    },
    photoBreakImage: {
        width: '100%',
        height: '100%',
    },
    photoBreakLabel: {
        position: 'absolute',
        left: 14,
        bottom: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(0,0,0,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
    },
    photoBreakLabelRight: {
        left: undefined,
        right: 14,
    },
    photoBreakLabelText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    errorState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        gap: 8,
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'center',
    },
    errorSubtitle: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
    },
});
