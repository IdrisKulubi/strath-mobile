import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMinimizeOnScroll } from 'expo-glass-tabs';
import Animated from 'react-native-reanimated';
import { useTheme } from '@/hooks/use-theme';
import { useProfile } from '@/hooks/use-profile';
import { useMyHype } from '@/hooks/use-hype';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Skeleton } from '@/components/ui/skeleton';
import {
    ProfileHeroCard,
    GuidedCompletionPath,
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
import { getGlassTabBarHeight } from '@/components/navigation/glass-tab-bar';
import { TabSwipeView } from '@/components/navigation/tab-swipe-view';
import {
    calculateProfileCompletion,
    getProfileCompletionTasks,
    type ProfileCompletionTask,
} from '@/lib/profile-completion';

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
    const insets = useSafeAreaInsets();
    const tabBarHeight = getGlassTabBarHeight(insets.bottom);
    const onScroll = useMinimizeOnScroll();
    const { data: profile, isLoading } = useProfile();
    const { data: hypeData } = useMyHype();

    const completionTasks = profile ? getProfileCompletionTasks(profile) : [];
    const calculatedCompletion = calculateProfileCompletion(profile);
    const needsCompletion = completionTasks.length > 0;
    const completion = needsCompletion ? Math.min(calculatedCompletion, 95) : calculatedCompletion;
    const allPhotos = Array.from(
        new Set([profile?.profilePhoto, ...(profile?.photos ?? [])].filter(Boolean)),
    ) as string[];

    const handlePress = (route: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(route as any);
    };

    const handleCompletionTask = (task: ProfileCompletionTask) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: '/edit-profile', params: { focus: task.id } });
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

    const scrollBottom = needsCompletion
        ? tabBarHeight + SPACING.tight
        : profileScrollBottomInset(tabBarHeight);

    return (
        <TabSwipeView route="/(tabs)/profile">
            <SafeAreaView
                style={[styles.container, { backgroundColor: colors.background }]}
                edges={['top']}
            >
                <Animated.ScrollView
                    onScroll={onScroll}
                    scrollEventThrottle={16}
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
                        onSettingsPress={() => handlePress('/settings')}
                    />

                    {needsCompletion ? (
                        <GuidedCompletionPath
                            percentage={completion}
                            tasks={completionTasks}
                            onContinue={handleCompletionTask}
                        />
                    ) : (
                        <ProfileEditProfileButton onPress={() => handlePress('/edit-profile')} />
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
                </Animated.ScrollView>

                {!needsCompletion && (
                    <ProfileFloatingEditBar onEditPress={() => handlePress('/edit-profile')} />
                )}
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
