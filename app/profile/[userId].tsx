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
import { CachedImage } from '@/components/ui/cached-image';
import { ProfilePhotos } from '@/components/profile-view/profile-photos';
import { ProfilePhotoViewer } from '@/components/profile-view/profile-photo-viewer';
import { CompatibilityBlock } from '@/components/profile-view/compatibility-block';
import { InterestsChips } from '@/components/profile-view/interests-chips';
import { PersonalityTags } from '@/components/profile-view/personality-tags';
import { WingmanQuotes } from '@/components/profile-view/wingman-quotes';
import { ProfileViewCta } from '@/components/profile-view/profile-view-cta';
import { Skeleton } from '@/components/ui/skeleton';
import { QualityBadge } from '@/components/ui/quality-badge';
import { useRespondToDailyPair } from '@/hooks/use-daily-matches';

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

const PROMPT_TITLES: Record<string, string> = {
    unpopular_opinion: 'My most unpopular opinion is...',
    conspiracy: 'A conspiracy theory I low-key believe...',
    guilty_pleasure: 'My guilty pleasure is...',
    pet_peeve: 'My biggest pet peeve is...',
    perfect_sunday: 'My perfect Sunday looks like...',
    life_goal: 'A life goal of mine is...',
    green_flag: 'The biggest green flag in someone is...',
    dealbreaker: 'My dating dealbreaker is...',
    useless_talent: 'My useless talent is...',
    karaoke: 'My go-to karaoke song is...',
    comfort_food: 'My comfort food is...',
    tv_binge: 'I could rewatch __ forever',
    proud_of: "I'm secretly proud of...",
    change_mind: 'Something that changed my mind recently...',
    grateful_for: "I'm most grateful for...",
    teach_me: 'I want someone to teach me...',
    ideal_date: 'My ideal first date is...',
    love_language: 'My love language is...',
    looking_for: "I'm looking for someone who...",
    relationship_rule: 'My non-negotiable in a relationship...',
    campus_spot: 'My favorite spot on campus is...',
    study_hack: 'My best study hack is...',
    class_type: "I'm the type to ____ in class",
};

const DISPLAY_VALUE_LABELS: Record<string, string> = {
    male: 'Male',
    female: 'Female',
    other: 'Other',
    men: 'Men',
    women: 'Women',
    everyone: 'Everyone',
    high_school: 'High School',
    bachelors: "Bachelor's",
    masters: "Master's",
    phd: 'PhD',
    yes: 'Yes',
    no: 'No',
    sometimes: 'Sometimes',
    serious: 'Something serious',
    casual: 'Casual and see where it goes',
    open: 'Open to anything',
    rarely: 'Rarely',
    '1_2_week': '1-2 times a week',
    '3_plus_week': '3+ times a week',
    party: 'Out with people',
    chill_in: 'Chill night in',
    both: 'A bit of both',
    career_focused: 'Career-focused',
    spontaneous: 'Spontaneous',
    balanced: 'Balanced',
    deep_talks: 'Deep talks',
    light_banter: 'Light banter',
    introvert: 'Introvert',
    ambivert: 'Ambivert',
    extrovert: 'Extrovert',
    casual_hangout: 'Casual hangout',
    night_owl: 'Night owl',
    early_bird: 'Early bird',
    afrobeats: 'Afrobeats',
    hiphop: 'Hip-Hop',
    rnb: 'R&B',
};

function formatDisplayValue(value?: string | number | null) {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') return String(value);

    const normalized = value.trim();
    if (!normalized) return null;

    return DISPLAY_VALUE_LABELS[normalized]
        ?? normalized
            .replace(/[_-]+/g, ' ')
            .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeHandle(value?: string | null) {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed.replace(/^@+/, '');
}

function PromptResponseCard({
    promptId,
    response,
}: {
    promptId: string;
    response: string;
}) {
    const { colors, isDark } = useTheme();
    const title = PROMPT_TITLES[promptId] ?? formatDisplayValue(promptId) ?? 'Prompt';

    return (
        <View
            style={[
                styles.promptCard,
                {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                    borderColor: colors.border,
                },
            ]}
        >
            <Text style={[styles.promptTitle, { color: colors.mutedForeground }]}>
                {title}
            </Text>
            <Text style={[styles.promptResponse, { color: colors.foreground }]}>
                {response}
            </Text>
        </View>
    );
}

function PillCollection({
    items,
}: {
    items: string[];
}) {
    const { colors, isDark } = useTheme();

    if (items.length === 0) return null;

    return (
        <View style={styles.pillWrap}>
            {items.map((item) => (
                <View
                    key={item}
                    style={[
                        styles.inlinePill,
                        {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                            borderColor: colors.border,
                        },
                    ]}
                >
                    <Text style={[styles.inlinePillText, { color: colors.foreground }]}>
                        {item}
                    </Text>
                </View>
            ))}
        </View>
    );
}

export default function ProfileViewScreen() {
    const { userId } = useLocalSearchParams<{ userId: string }>();
    const router = useRouter();
    const { colors, colorScheme } = useTheme();
    const isDark = colorScheme === 'dark';

    const { data: profile, isLoading } = useUserProfile(userId ?? '');
    const respondToPair = useRespondToDailyPair();
    const [fullScreenPhotoUri, setFullScreenPhotoUri] = useState<string | null>(null);

    const handleBack = useCallback(() => {
        router.back();
    }, [router]);

    const handleOpenToMeet = useCallback(() => {
        if (!profile?.pairId) return;
        respondToPair.mutate({ pairId: profile.pairId, decision: 'open_to_meet' });
    }, [profile?.pairId, respondToPair]);

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
    const aboutMe = profile.aboutMe?.trim();
    const bio = profile.bio?.trim();
    const secondaryAbout = aboutMe && aboutMe !== bio ? aboutMe : null;
    const musicGenres = (profile.personalityAnswers?.musicGenres ?? [])
        .map((genre) => formatDisplayValue(genre))
        .filter(Boolean) as string[];
    const aboutPills = [
        formatDisplayValue(profile.height),
        formatDisplayValue(profile.gender),
        formatDisplayValue(profile.religion),
        formatDisplayValue(profile.politics),
    ].filter(Boolean) as string[];
    const lookingForPills = [
        formatDisplayValue(profile.lookingFor),
        formatDisplayValue(profile.lifestyleAnswers?.relationshipGoal),
        formatDisplayValue(profile.personalityAnswers?.idealDateVibe),
    ].filter(Boolean) as string[];
    const campusPills = [
        profile.course?.trim(),
        profile.university?.trim(),
        profile.yearOfStudy ? `Year ${profile.yearOfStudy}` : null,
        formatDisplayValue(profile.education),
    ].filter(Boolean) as string[];
    const personalityDetails = [
        formatDisplayValue(profile.personalityType),
        formatDisplayValue(profile.loveLanguage),
        formatDisplayValue(profile.communicationStyle),
        formatDisplayValue(profile.zodiacSign),
        formatDisplayValue(profile.personalityAnswers?.sleepSchedule),
        formatDisplayValue(profile.personalityAnswers?.socialVibe),
        formatDisplayValue(profile.personalityAnswers?.driveStyle),
        formatDisplayValue(profile.personalityAnswers?.convoStyle),
        formatDisplayValue(profile.personalityAnswers?.socialBattery),
    ].filter(Boolean) as string[];
    const lifestylePills = [
        formatDisplayValue(profile.sleepingHabits),
        formatDisplayValue(profile.drinkingPreference ?? profile.lifestyleAnswers?.drinks),
        formatDisplayValue(profile.smoking ?? profile.lifestyleAnswers?.smokes),
        formatDisplayValue(profile.workoutFrequency),
        formatDisplayValue(profile.socialMediaUsage),
        formatDisplayValue(profile.lifestyleAnswers?.outingFrequency),
    ].filter(Boolean) as string[];
    const socialItems = [
        normalizeHandle(profile.instagram) ? `Instagram @${normalizeHandle(profile.instagram)}` : null,
        normalizeHandle(profile.spotify) ? `Spotify ${normalizeHandle(profile.spotify)}` : null,
        normalizeHandle(profile.snapchat) ? `Snapchat @${normalizeHandle(profile.snapchat)}` : null,
    ].filter(Boolean) as string[];

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
                                <PillCollection items={aboutPills} />
                            </View>
                        </ProfileSectionCard>
                    )}

                    {lookingForPills.length > 0 && (
                        <ProfileSectionCard>
                            <View style={styles.subSection}>
                                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Looking for</Text>
                                <PillCollection items={lookingForPills} />
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

                    {profile.qualities && profile.qualities.length > 0 && (
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
                    )}

                    <InlinePhotoBreak
                        uri={galleryPhotos[1]}
                        label="More than just the headline"
                        variant="right"
                        onPhotoPress={(uri) => setFullScreenPhotoUri(uri)}
                    />

                    {/* Personality */}
                    {((profile.personalityTags && profile.personalityTags.length > 0) || personalityDetails.length > 0) && (
                        <ProfileSectionCard>
                            <View style={styles.sectionStack}>
                                {profile.personalityTags && profile.personalityTags.length > 0 && (
                                    <PersonalityTags tags={profile.personalityTags} />
                                )}
                                <PillCollection items={personalityDetails} />
                            </View>
                        </ProfileSectionCard>
                    )}

                    {musicGenres.length > 0 && (
                        <ProfileSectionCard>
                            <View style={styles.subSection}>
                                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Music taste</Text>
                                <PillCollection items={musicGenres} />
                            </View>
                        </ProfileSectionCard>
                    )}

                    {profile.prompts && profile.prompts.length > 0 && (
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
                    )}

                    <InlinePhotoBreak
                        uri={galleryPhotos[2]}
                        label="How their energy feels"
                        variant="left"
                        onPhotoPress={(uri) => setFullScreenPhotoUri(uri)}
                    />

                    {campusPills.length > 0 && (
                        <ProfileSectionCard>
                            <View style={styles.subSection}>
                                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Campus life</Text>
                                <PillCollection items={campusPills} />
                            </View>
                        </ProfileSectionCard>
                    )}

                    {lifestylePills.length > 0 && (
                        <ProfileSectionCard>
                            <View style={styles.subSection}>
                                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Lifestyle</Text>
                                <PillCollection items={lifestylePills} />
                            </View>
                        </ProfileSectionCard>
                    )}

                    {profile.languages && profile.languages.length > 0 && (
                        <ProfileSectionCard>
                            <View style={styles.subSection}>
                                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Languages</Text>
                                <PillCollection items={profile.languages} />
                            </View>
                        </ProfileSectionCard>
                    )}

                    {socialItems.length > 0 && (
                        <ProfileSectionCard>
                            <View style={styles.subSection}>
                                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Socials</Text>
                                <PillCollection items={socialItems} />
                            </View>
                        </ProfileSectionCard>
                    )}

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
                onOpenToMeet={handleOpenToMeet}
                completed={profile.currentUserDecision !== 'pending'}
                disabled={!profile.pairId || respondToPair.isPending}
                label={profile.pairId ? 'Open to Meet' : 'Not in today\'s curated set'}
            />

            {/* Full-screen photo viewer */}
            <ProfilePhotoViewer
                visible={!!fullScreenPhotoUri}
                uri={fullScreenPhotoUri}
                onClose={() => setFullScreenPhotoUri(null)}
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
    sectionCard: {
        borderRadius: 22,
        borderWidth: 1,
        padding: 16,
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
    promptCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 14,
        gap: 8,
    },
    promptTitle: {
        fontSize: 13,
        fontWeight: '600',
    },
    promptResponse: {
        fontSize: 15,
        lineHeight: 22,
    },
    pillWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    inlinePill: {
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    inlinePillText: {
        fontSize: 13,
        fontWeight: '600',
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
