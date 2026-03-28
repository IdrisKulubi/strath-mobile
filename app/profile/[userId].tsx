import React, { useCallback, useState } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { Text } from '@/components/ui/text';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useTheme } from '@/hooks/use-theme';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useRespondToDailyPair } from '@/hooks/use-daily-matches';
import { DecisionInfoSheet, type DecisionSheetType } from '@/components/home/decision-info-sheet';
import { ProfilePhotos } from '@/components/profile-view/profile-photos';
import { ProfilePhotoViewer } from '@/components/profile-view/profile-photo-viewer';
import { CompatibilityBlock } from '@/components/profile-view/compatibility-block';
import { InterestsChips } from '@/components/profile-view/interests-chips';
import { PersonalityTags } from '@/components/profile-view/personality-tags';
import { WingmanQuotes } from '@/components/profile-view/wingman-quotes';
import { ProfileViewCta } from '@/components/profile-view/profile-view-cta';
import { QualityBadge } from '@/components/ui/quality-badge';
import {
    buildProfilePills,
    formatAboutPill,
    formatCampusPill,
    formatDisplayValue,
    formatLanguagePill,
    formatLifestylePill,
    formatLookingForPill,
    formatPersonalityPill,
    formatSocialPill,
    normalizeHandle,
    type ProfileSectionDefinition,
} from '@/components/profile-view/profile-view-formatters';
import {
    InlinePhotoBreak,
    PillCollection,
    ProfilePillSection,
    ProfileSectionCard,
    PromptResponseCard,
} from '@/components/profile-view/profile-view-sections';

const ALREADY_RESPONDED_MSG = 'You have already responded to this pair';

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

export default function ProfileViewScreen() {
    const { userId } = useLocalSearchParams<{ userId: string }>();
    const router = useRouter();
    const queryClient = useQueryClient();
    const toast = useToast();
    const { colors, colorScheme } = useTheme();
    const isDark = colorScheme === 'dark';

    const { data: profile, isLoading } = useUserProfile(userId ?? '');
    const respondToPair = useRespondToDailyPair();
    const [fullScreenPhotoUri, setFullScreenPhotoUri] = useState<string | null>(null);
    const [infoSheet, setInfoSheet] = useState<{ visible: boolean; type: DecisionSheetType }>({
        visible: false,
        type: 'open_to_meet',
    });

    const handleBack = useCallback(() => {
        router.back();
    }, [router]);

    const updateProfileDecision = useCallback(
        (decision: 'open_to_meet' | 'passed') => {
            if (!userId) return;
            queryClient.setQueryData(
                ['userProfile', userId],
                (old: { currentUserDecision?: string } | undefined) =>
                    old ? { ...old, currentUserDecision: decision } : old
            );
        },
        [queryClient, userId]
    );

    const handleOpenToMeet = useCallback(() => {
        if (!profile?.pairId) return;

        respondToPair.mutate(
            { pairId: profile.pairId, decision: 'open_to_meet' },
            {
                onSuccess: () => {
                    updateProfileDecision('open_to_meet');
                    setInfoSheet({ visible: true, type: 'open_to_meet' });
                },
                onError: (err) => {
                    if (err?.message?.includes(ALREADY_RESPONDED_MSG)) {
                        updateProfileDecision('open_to_meet');
                        setInfoSheet({ visible: true, type: 'already_responded' });
                        return;
                    }

                    toast.show({
                        message: 'Could not save your decision right now. Please try again.',
                        variant: 'danger',
                        position: 'bottom',
                    });
                },
            }
        );
    }, [profile?.pairId, respondToPair, toast, updateProfileDecision]);

    const handlePass = useCallback(() => {
        if (!profile?.pairId) return;

        respondToPair.mutate(
            { pairId: profile.pairId, decision: 'passed' },
            {
                onSuccess: () => {
                    setInfoSheet({ visible: true, type: 'pass' });
                },
                onError: () => {
                    toast.show({
                        message: 'Could not pass right now. Please try again.',
                        variant: 'danger',
                        position: 'bottom',
                    });
                },
            }
        );
    }, [profile?.pairId, respondToPair, toast]);

    const handleCloseInfoSheet = useCallback(() => {
        const wasPass = infoSheet.type === 'pass';
        setInfoSheet((state) => ({ ...state, visible: false }));
        if (wasPass) {
            router.back();
        }
    }, [infoSheet.type, router]);

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

    const allPhotos = [profile.profilePhoto, ...(profile.photos ?? [])].filter(Boolean) as string[];
    const galleryPhotos = allPhotos.slice(1);
    const aboutMe = profile.aboutMe?.trim();
    const bio = profile.bio?.trim();
    const secondaryAbout = aboutMe && aboutMe !== bio ? aboutMe : null;
    const musicGenres = (profile.personalityAnswers?.musicGenres ?? [])
        .map((genre) => formatDisplayValue(genre))
        .filter(Boolean) as string[];

    const aboutPills = buildProfilePills([
        { value: profile.height, format: (value) => formatAboutPill('height', value) },
        { value: profile.gender, format: (value) => formatAboutPill('gender', value) },
        { value: profile.religion, format: (value) => formatAboutPill('religion', value) },
        { value: profile.politics, format: (value) => formatAboutPill('politics', value) },
    ]);

    const personalityDetails = buildProfilePills([
        { value: profile.personalityType, format: (value) => formatPersonalityPill('personality_type', value) },
        { value: profile.loveLanguage, format: (value) => formatPersonalityPill('love_language', value) },
        { value: profile.communicationStyle, format: (value) => formatPersonalityPill('communication', value) },
        { value: profile.zodiacSign, format: (value) => formatPersonalityPill('zodiac', value) },
        { value: profile.personalityAnswers?.sleepSchedule, format: (value) => formatPersonalityPill('sleep', value) },
        { value: profile.personalityAnswers?.socialVibe, format: (value) => formatPersonalityPill('social_vibe', value) },
        { value: profile.personalityAnswers?.driveStyle, format: (value) => formatPersonalityPill('drive', value) },
        { value: profile.personalityAnswers?.convoStyle, format: (value) => formatPersonalityPill('convo', value) },
        { value: profile.personalityAnswers?.socialBattery, format: (value) => formatPersonalityPill('battery', value) },
    ]);

    const profileInfoSections: ProfileSectionDefinition[] = [
        {
            key: 'looking-for',
            title: 'Looking for',
            items: buildProfilePills([
                { value: profile.lookingFor, format: (value) => formatLookingForPill('looking_for', value) },
                { value: profile.lifestyleAnswers?.relationshipGoal, format: (value) => formatLookingForPill('relationship_goal', value) },
                { value: profile.personalityAnswers?.idealDateVibe, format: (value) => formatLookingForPill('date_vibe', value) },
            ]),
        },
        {
            key: 'campus-life',
            title: 'Campus life',
            items: buildProfilePills([
                { value: profile.course?.trim(), format: (value) => formatCampusPill('course', value) },
                { value: profile.university?.trim(), format: (value) => formatCampusPill('university', value) },
                { value: profile.yearOfStudy ? `Year ${profile.yearOfStudy}` : null, format: (value) => formatCampusPill('year', value) },
                { value: profile.education, format: (value) => formatCampusPill('education', value) },
            ]),
        },
        {
            key: 'lifestyle',
            title: 'Lifestyle',
            items: buildProfilePills([
                formatLifestylePill('sleep', profile.sleepingHabits),
                formatLifestylePill('drinks', profile.drinkingPreference ?? profile.lifestyleAnswers?.drinks),
                formatLifestylePill('smokes', profile.smoking ?? profile.lifestyleAnswers?.smokes),
                formatLifestylePill('workout', profile.workoutFrequency),
                formatLifestylePill('social_media', profile.socialMediaUsage),
                formatLifestylePill('outing', profile.lifestyleAnswers?.outingFrequency),
            ]),
        },
        {
            key: 'languages',
            title: 'Languages',
            items: buildProfilePills(
                (profile.languages ?? []).map((language) => ({
                    value: language,
                    format: (value) => formatLanguagePill(value),
                }))
            ),
        },
        {
            key: 'socials',
            title: 'Socials',
            items: buildProfilePills([
                { value: normalizeHandle(profile.instagram), format: (value) => formatSocialPill('instagram', value) },
                { value: normalizeHandle(profile.spotify), format: (value) => formatSocialPill('spotify', value) },
                { value: normalizeHandle(profile.snapchat), format: (value) => formatSocialPill('snapchat', value) },
            ]),
        },
    ];

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle="light-content" />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <ProfilePhotos
                    photos={allPhotos.length > 0 ? allPhotos : [undefined]}
                    onBack={handleBack}
                    onPhotoPress={(uri) => setFullScreenPhotoUri(uri)}
                />

                <View style={styles.content}>
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

                    <CompatibilityBlock
                        score={profile.compatibilityScore}
                        reasons={profile.reasons}
                    />

                    {(bio || secondaryAbout) && (
                        <ProfileSectionCard>
                            <View style={styles.bioSection}>
                                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>About them</Text>
                                {bio && (
                                    <Text style={[styles.bio, { color: colors.foreground }]}>{bio}</Text>
                                )}
                                {secondaryAbout && (
                                    <Text style={[styles.bioSecondary, { color: colors.mutedForeground }]}>
                                        {secondaryAbout}
                                    </Text>
                                )}
                                {aboutPills.length > 0 ? <PillCollection items={aboutPills} /> : null}
                            </View>
                        </ProfileSectionCard>
                    )}

                    {profileInfoSections
                        .filter((section) => section.key === 'looking-for')
                        .map((section) => (
                            <ProfilePillSection key={section.key} title={section.title} items={section.items} />
                        ))}

                    <InlinePhotoBreak
                        uri={galleryPhotos[0]}
                        label="A little more of their vibe"
                        variant="full"
                        onPhotoPress={(uri) => setFullScreenPhotoUri(uri)}
                    />

                    {profile.interests && profile.interests.length > 0 ? (
                        <ProfileSectionCard>
                            <InterestsChips interests={profile.interests} />
                        </ProfileSectionCard>
                    ) : null}

                    {profile.qualities && profile.qualities.length > 0 ? (
                        <ProfileSectionCard>
                            <View style={styles.subSection}>
                                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Standout qualities</Text>
                                <View style={styles.qualitiesWrap}>
                                    {profile.qualities.map((quality) => (
                                        <QualityBadge
                                            key={quality}
                                            quality={quality}
                                            isDark={isDark}
                                        />
                                    ))}
                                </View>
                            </View>
                        </ProfileSectionCard>
                    ) : null}

                    <InlinePhotoBreak
                        uri={galleryPhotos[1]}
                        label="More than just the headline"
                        variant="right"
                        onPhotoPress={(uri) => setFullScreenPhotoUri(uri)}
                    />

                    {((profile.personalityTags && profile.personalityTags.length > 0) || personalityDetails.length > 0) ? (
                        <ProfileSectionCard>
                            <View style={styles.sectionStack}>
                                {profile.personalityTags && profile.personalityTags.length > 0 ? (
                                    <PersonalityTags tags={profile.personalityTags} />
                                ) : null}
                                {personalityDetails.length > 0 ? <PillCollection items={personalityDetails} /> : null}
                            </View>
                        </ProfileSectionCard>
                    ) : null}

                    {musicGenres.length > 0 ? (
                        <ProfilePillSection title="Music taste" items={musicGenres} />
                    ) : null}

                    {profile.prompts && profile.prompts.length > 0 ? (
                        <ProfileSectionCard>
                            <View style={styles.sectionStack}>
                                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                                    Prompt answers
                                </Text>
                                <View style={styles.promptsWrap}>
                                    {profile.prompts.map((prompt, index) => (
                                        <PromptResponseCard
                                            key={`${prompt.promptId}-${index}`}
                                            promptId={prompt.promptId}
                                            response={prompt.response}
                                        />
                                    ))}
                                </View>
                            </View>
                        </ProfileSectionCard>
                    ) : null}

                    <InlinePhotoBreak
                        uri={galleryPhotos[2]}
                        label="How their energy feels"
                        variant="left"
                        onPhotoPress={(uri) => setFullScreenPhotoUri(uri)}
                    />

                    {profileInfoSections
                        .filter((section) => ['campus-life', 'lifestyle', 'languages', 'socials'].includes(section.key))
                        .map((section) => (
                            <ProfilePillSection key={section.key} title={section.title} items={section.items} />
                        ))}

                    {profile.wingmanQuotes && profile.wingmanQuotes.length > 0 ? (
                        <ProfileSectionCard>
                            <WingmanQuotes quotes={profile.wingmanQuotes} />
                        </ProfileSectionCard>
                    ) : null}

                    <InlinePhotoBreak
                        uri={galleryPhotos[3]}
                        label="One last glance"
                        variant="full"
                        onPhotoPress={(uri) => setFullScreenPhotoUri(uri)}
                    />
                </View>
            </ScrollView>

            <ProfileViewCta
                onOpenToMeet={handleOpenToMeet}
                onPass={profile.pairId ? handlePass : undefined}
                completed={profile.currentUserDecision !== 'pending'}
                disabled={!profile.pairId || respondToPair.isPending}
                label={profile.pairId ? 'Open to Meet' : "Not in today's curated set"}
            />

            <ProfilePhotoViewer
                visible={!!fullScreenPhotoUri}
                uri={fullScreenPhotoUri}
                onClose={() => setFullScreenPhotoUri(null)}
            />

            <DecisionInfoSheet
                visible={infoSheet.visible}
                type={infoSheet.type}
                firstName={profile.firstName}
                onClose={handleCloseInfoSheet}
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
    bioSecondary: {
        fontSize: 14,
        lineHeight: 21,
        marginTop: 4,
    },
    sectionStack: {
        gap: 16,
    },
    subSection: {
        gap: 10,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: '700',
        letterSpacing: -0.3,
        lineHeight: 28,
    },
    bio: {
        fontSize: 15,
        lineHeight: 22,
    },
    qualitiesWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    promptsWrap: {
        gap: 12,
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
