import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useTheme } from '@/hooks/use-theme';
import { useProfile } from '@/hooks/use-profile';
import { useMyHype } from '@/hooks/use-hype';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Skeleton } from '@/components/ui/skeleton';
import {
    ProfileHeroCard,
    CompletionProgressCard,
    ProfilePhotoGrid,
    AboutCard,
    InterestChipsSection,
    WingmanNotesCard,
    ProfileContentSection,
    ProfileDetailsGrid,
    ProfileSocialsCard,
    ProfileEditProfileButton,
    ProfileFloatingEditBar,
    profileScrollBottomInset,
    type ProfileDetailItem,
} from '@/components/profile-tab';
import { PromptCard } from '@/components/ui/prompt-card';
import { SPACING } from '@/lib/design-tokens';
import {
    Ruler,
    Barbell,
    GraduationCap,
    Cigarette,
    Heart,
    Sparkle,
    Globe,
    Church,
} from 'phosphor-react-native';
import { TabSwipeView } from '@/components/navigation/tab-swipe-view';

function calculateCompletion(profile: any): number {
    if (!profile) return 0;
    let score = 0;
    if (profile.firstName && profile.lastName) score += 7;
    if (profile.bio || profile.aboutMe) score += 7;
    if (profile.profilePhoto) score += 6;
    if (profile.university) score += 8;
    if (profile.course && profile.yearOfStudy) score += 7;
    if (profile.interests?.length) score += 5;
    if (profile.zodiacSign) score += 3;
    if (profile.personalityType) score += 3;
    if (profile.loveLanguage) score += 3;
    if (profile.photos?.length) score += 3;
    if (profile.qualities?.length) score += 4;
    if (profile.prompts?.length) score += 4;
    if (profile.height) score += 3;
    if (profile.education) score += 3;
    if (profile.workoutFrequency) score += 2;
    if (profile.smoking) score += 2;
    if (profile.lookingFor) score += 3;
    if (profile.politics) score += 2;
    if (profile.religion) score += 3;
    if (profile.languages?.length) score += 2;
    if (profile.instagram) score += 10;
    if (profile.spotify || profile.snapchat) score += 10;
    return Math.min(score, 100);
}

function formatDisplayValue(value?: string | null): string | null {
    if (!value?.trim()) return null;
    const labels: Record<string, string> = {
        male: 'Male', female: 'Female', other: 'Other',
        high_school: 'High School', bachelors: "Bachelor's", masters: "Master's", phd: 'PhD',
        yes: 'Yes', no: 'No', serious: 'Something serious', casual: 'Casual',
        introvert: 'Introvert', ambivert: 'Ambivert', extrovert: 'Extrovert',
        night_owl: 'Night owl', early_bird: 'Early bird',
    };
    return labels[value] ?? value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function ProfileScreen() {
    const { colors, colorScheme } = useTheme();
    const isDark = colorScheme === 'dark';
    const router = useRouter();
    const tabBarHeight = useBottomTabBarHeight();
    const { data: profile, isLoading } = useProfile();
    const { data: hypeData } = useMyHype();

    const completion = calculateCompletion(profile);
    const allPhotos = Array.from(
        new Set([profile?.profilePhoto, ...(profile?.photos ?? [])].filter(Boolean)),
    ) as string[];

    const handlePress = (route: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(route as any);
    };

    const lifestyleTags = [
        formatDisplayValue(profile?.workoutFrequency),
        formatDisplayValue(profile?.sleepingHabits),
        formatDisplayValue(profile?.drinkingPreference),
    ].filter(Boolean) as string[];

    const idealDateVibe = (profile as any)?.lifestyleAnswers?.idealDateVibe
        ? formatDisplayValue((profile as any).lifestyleAnswers.idealDateVibe)
        : null;

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
                <View style={styles.loadingContent}>
                    <Skeleton width={144} height={144} borderRadius={72} style={{ marginBottom: 20 }} />
                    <Skeleton width={200} height={32} borderRadius={8} style={{ marginBottom: 8 }} />
                    <Skeleton width={150} height={20} borderRadius={4} />
                </View>
            </SafeAreaView>
        );
    }

    if (!profile) return null;

    const wingmanNotes = (hypeData?.vouches ?? [])
        .filter((v: any) => v.isApproved !== false)
        .map((v: any) => ({
            id: v.id,
            content: v.content,
            authorName: v.authorName,
            isApproved: v.isApproved,
        }));

    const detailItems: ProfileDetailItem[] = [
        profile.height && { label: 'Height', value: profile.height, Icon: Ruler },
        profile.education && {
            label: 'Education',
            value: formatDisplayValue(profile.education) ?? profile.education,
            Icon: GraduationCap,
        },
        profile.workoutFrequency && {
            label: 'Exercise',
            value: formatDisplayValue(profile.workoutFrequency) ?? profile.workoutFrequency,
            Icon: Barbell,
        },
        profile.smoking && {
            label: 'Smoking',
            value: formatDisplayValue(profile.smoking) ?? profile.smoking,
            Icon: Cigarette,
        },
        profile.lookingFor && {
            label: 'Looking for',
            value: formatDisplayValue(profile.lookingFor) ?? profile.lookingFor,
            Icon: Heart,
        },
        profile.politics && {
            label: 'Politics',
            value: formatDisplayValue(profile.politics) ?? profile.politics,
            Icon: Sparkle,
        },
        profile.religion && {
            label: 'Religion',
            value: formatDisplayValue(profile.religion) ?? profile.religion,
            Icon: Church,
        },
        profile.languages?.length && {
            label: 'Languages',
            value: profile.languages.join(', '),
            Icon: Globe,
            fullWidth: true,
        },
    ].filter(Boolean) as ProfileDetailItem[];

    const scrollBottom = profileScrollBottomInset(tabBarHeight);

    return (
        <TabSwipeView route="/(tabs)/profile">
            <SafeAreaView
                style={[styles.container, { backgroundColor: colors.background }]}
                edges={['top']}
            >
                <ScrollView
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottom }]}
                    showsVerticalScrollIndicator={false}
                    contentInsetAdjustmentBehavior="automatic"
                >
                    <ProfileHeroCard
                        profilePhoto={profile.profilePhoto || profile.photos?.[0] || (profile as any).user?.image}
                        firstName={profile.firstName}
                        lastName={profile.lastName}
                        age={profile.age}
                        course={profile.course}
                        yearOfStudy={profile.yearOfStudy}
                        university={profile.university}
                        personalityType={profile.personalityType}
                        zodiacSign={profile.zodiacSign}
                        completionPercentage={completion}
                        onSettingsPress={() => handlePress('/settings')}
                    />

                    <ProfileEditProfileButton onPress={() => handlePress('/edit-profile')} />

                    {completion < 100 && (
                        <CompletionProgressCard
                            percentage={completion}
                            onPress={() => handlePress('/edit-profile')}
                        />
                    )}

                    <ProfilePhotoGrid
                        photos={allPhotos.length > 0 ? allPhotos : [undefined]}
                        onEditPress={() => handlePress('/edit-profile')}
                    />

                    <AboutCard
                        bio={profile.bio || ''}
                        aboutMe={profile.aboutMe}
                        lookingFor={formatDisplayValue(profile.lookingFor) ?? undefined}
                        favoriteVibe={idealDateVibe ?? undefined}
                    />

                    <InterestChipsSection
                        interests={profile.interests}
                        qualities={profile.qualities}
                        zodiacSign={profile.zodiacSign}
                        personalityType={profile.personalityType}
                        loveLanguage={profile.loveLanguage}
                        lifestyleTags={lifestyleTags}
                        isDark={isDark}
                    />

                    {profile.prompts && profile.prompts.length > 0 && (
                        <ProfileContentSection title="Prompts">
                            <View style={styles.promptList}>
                                {profile.prompts.map((p: { promptId: string; response: string }, i: number) => (
                                    <PromptCard
                                        key={p.promptId || `prompt-${i}`}
                                        promptId={p.promptId}
                                        response={p.response}
                                        isDark={isDark}
                                    />
                                ))}
                            </View>
                        </ProfileContentSection>
                    )}

                    <WingmanNotesCard
                        notes={wingmanNotes}
                        onHypePress={() => handlePress('/hype-request')}
                    />

                    {detailItems.length > 0 && (
                        <ProfileContentSection title="Details">
                            <ProfileDetailsGrid items={detailItems} />
                        </ProfileContentSection>
                    )}

                    <ProfileContentSection title="Socials">
                        <ProfileSocialsCard
                            instagram={profile.instagram}
                            spotify={profile.spotify}
                            snapchat={profile.snapchat}
                        />
                    </ProfileContentSection>
                </ScrollView>

                <ProfileFloatingEditBar onEditPress={() => handlePress('/edit-profile')} />
            </SafeAreaView>
        </TabSwipeView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: {
        paddingTop: SPACING.tight,
    },
    loadingContent: {
        alignItems: 'center',
        paddingTop: 100,
    },
    promptList: {
        gap: SPACING.compact,
    },
});
