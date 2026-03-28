import React from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useProfile } from '@/hooks/use-profile';
import { useMyHype } from '@/hooks/use-hype';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { Skeleton } from '@/components/ui/skeleton';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
    ProfileHeroCard,
    CompletionProgressCard,
    ProfilePhotoGrid,
    AboutCard,
    InterestChipsSection,
    WingmanNotesCard,
    ProfileActionBar,
} from '@/components/profile-tab';
import { PromptCard } from '@/components/ui/prompt-card';
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
    const { data: profile, isLoading } = useProfile();
    const { data: hypeData } = useMyHype();

    const completion = calculateCompletion(profile);
    const allPhotos = [profile?.profilePhoto, ...(profile?.photos ?? [])].filter(Boolean) as string[];

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
            <View style={[styles.container, { backgroundColor: isDark ? '#1a0d2e' : colors.background }]}>
                {isDark && (
                    <LinearGradient
                        colors={['#2d1b47', '#1a0d2e', '#0f0a1a']}
                        style={StyleSheet.absoluteFill}
                    />
                )}
                <View style={styles.loadingContent}>
                    <Skeleton width={144} height={144} borderRadius={72} style={{ marginBottom: 20 }} />
                    <Skeleton width={200} height={32} borderRadius={8} style={{ marginBottom: 8 }} />
                    <Skeleton width={150} height={20} borderRadius={4} />
                </View>
            </View>
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

    return (
        <TabSwipeView route="/(tabs)/profile">
        <View style={[styles.container, { backgroundColor: isDark ? '#1a0d2e' : colors.background }]}>
            {isDark && (
                <LinearGradient
                    colors={['#2d1b47', '#1a0d2e', '#0f0a1a']}
                    style={StyleSheet.absoluteFill}
                />
            )}
            {isDark && (
                <>
                    <View style={[styles.decorBlur, styles.decorBlur1]} />
                    <View style={[styles.decorBlur, styles.decorBlur2]} />
                </>
            )}

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
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

                {completion < 100 && (
                    <CompletionProgressCard
                        percentage={completion}
                        promptText="Complete your profile"
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
                    <Animated.View
                        entering={FadeInDown.delay(340).springify().damping(14)}
                        style={[
                            styles.card,
                            {
                                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
                                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                            },
                            !isDark && styles.cardShadow,
                        ]}
                    >
                        <View style={styles.cardHeader}>
                            <View style={[styles.cardIcon, { backgroundColor: isDark ? 'rgba(249,115,22,0.2)' : 'rgba(249,115,22,0.1)' }]}>
                                <Ionicons name="chatbubble-ellipses" size={18} color="#f97316" />
                            </View>
                            <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>My Prompts</Text>
                        </View>
                        <View style={{ gap: 12 }}>
                            {profile.prompts.map((p: { promptId: string; response: string }, i: number) => (
                                <PromptCard key={i} promptId={p.promptId} response={p.response} isDark={isDark} />
                            ))}
                        </View>
                    </Animated.View>
                )}

                <WingmanNotesCard
                    notes={wingmanNotes}
                    onHypePress={() => handlePress('/hype-request')}
                />

                {(profile.height || profile.education || profile.workoutFrequency || profile.smoking ||
                    profile.lookingFor || profile.politics || profile.religion || profile.languages?.length) && (
                    <Animated.View
                        entering={FadeInDown.delay(380).springify().damping(14)}
                        style={[
                            styles.card,
                            {
                                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
                                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                            },
                            !isDark && styles.cardShadow,
                        ]}
                    >
                        <View style={styles.cardHeader}>
                            <View style={[styles.cardIcon, { backgroundColor: isDark ? 'rgba(6,182,212,0.2)' : 'rgba(6,182,212,0.1)' }]}>
                                <Ionicons name="information-circle" size={18} color="#06b6d4" />
                            </View>
                            <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>Get to know me</Text>
                        </View>
                        <View style={styles.infoGrid}>
                            {profile.height && (
                                <View style={[styles.infoItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f9fafb' }]}>
                                    <Ruler size={18} color={isDark ? '#94a3b8' : '#6b7280'} />
                                    <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Height</Text>
                                    <Text style={[styles.infoValue, { color: colors.foreground }]}>{profile.height}</Text>
                                </View>
                            )}
                            {profile.education && (
                                <View style={[styles.infoItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f9fafb' }]}>
                                    <GraduationCap size={18} color={isDark ? '#94a3b8' : '#6b7280'} />
                                    <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Education</Text>
                                    <Text style={[styles.infoValue, { color: colors.foreground }]}>{formatDisplayValue(profile.education)}</Text>
                                </View>
                            )}
                            {profile.workoutFrequency && (
                                <View style={[styles.infoItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f9fafb' }]}>
                                    <Barbell size={18} color={isDark ? '#94a3b8' : '#6b7280'} />
                                    <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Exercise</Text>
                                    <Text style={[styles.infoValue, { color: colors.foreground }]}>{formatDisplayValue(profile.workoutFrequency)}</Text>
                                </View>
                            )}
                            {profile.smoking && (
                                <View style={[styles.infoItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f9fafb' }]}>
                                    <Cigarette size={18} color={isDark ? '#94a3b8' : '#6b7280'} />
                                    <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Smoking</Text>
                                    <Text style={[styles.infoValue, { color: colors.foreground }]}>{formatDisplayValue(profile.smoking)}</Text>
                                </View>
                            )}
                            {profile.lookingFor && (
                                <View style={[styles.infoItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f9fafb' }]}>
                                    <Heart size={18} color={isDark ? '#94a3b8' : '#6b7280'} />
                                    <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Looking for</Text>
                                    <Text style={[styles.infoValue, { color: colors.foreground }]}>{formatDisplayValue(profile.lookingFor)}</Text>
                                </View>
                            )}
                            {profile.politics && (
                                <View style={[styles.infoItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f9fafb' }]}>
                                    <Sparkle size={18} color={isDark ? '#94a3b8' : '#6b7280'} />
                                    <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Politics</Text>
                                    <Text style={[styles.infoValue, { color: colors.foreground }]}>{formatDisplayValue(profile.politics)}</Text>
                                </View>
                            )}
                            {profile.religion && (
                                <View style={[styles.infoItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f9fafb' }]}>
                                    <Church size={18} color={isDark ? '#94a3b8' : '#6b7280'} />
                                    <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Religion</Text>
                                    <Text style={[styles.infoValue, { color: colors.foreground }]}>{formatDisplayValue(profile.religion)}</Text>
                                </View>
                            )}
                            {profile.languages?.length && (
                                <View style={[styles.infoItem, styles.infoItemFull, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f9fafb' }]}>
                                    <Globe size={18} color={isDark ? '#94a3b8' : '#6b7280'} />
                                    <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Languages</Text>
                                    <Text style={[styles.infoValue, { color: colors.foreground }]}>{profile.languages.join(', ')}</Text>
                                </View>
                            )}
                        </View>
                    </Animated.View>
                )}

                <Animated.View
                    entering={FadeInDown.delay(400).springify().damping(14)}
                    style={[
                        styles.card,
                        {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
                            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                        },
                        !isDark && styles.cardShadow,
                    ]}
                >
                    <View style={styles.cardHeader}>
                        <View style={[styles.cardIcon, { backgroundColor: isDark ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)' }]}>
                            <Ionicons name="link" size={18} color="#3B82F6" />
                        </View>
                        <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>Socials</Text>
                    </View>
                    <View style={styles.socialsRow}>
                        {profile.instagram && (
                            <View style={[styles.socialBadge, { backgroundColor: isDark ? 'rgba(225,48,108,0.15)' : 'rgba(225,48,108,0.12)' }]}>
                                <Ionicons name="logo-instagram" size={22} color="#E1306C" />
                                <Text style={[styles.socialHandle, { color: '#C13584' }]}>@{profile.instagram}</Text>
                            </View>
                        )}
                        {profile.spotify && (
                            <View style={[styles.socialBadge, { backgroundColor: isDark ? 'rgba(29,185,84,0.15)' : 'rgba(29,185,84,0.12)' }]}>
                                <Ionicons name="musical-notes" size={22} color="#1DB954" />
                                <Text style={[styles.socialHandle, { color: '#1AA34A' }]}>Spotify</Text>
                            </View>
                        )}
                        {profile.snapchat && (
                            <View style={[styles.socialBadge, { backgroundColor: isDark ? 'rgba(255,252,0,0.15)' : '#FEF9C3' }]}>
                                <Ionicons name="logo-snapchat" size={22} color={isDark ? '#FFFC00' : '#CA8A04'} />
                                <Text style={[styles.socialHandle, { color: isDark ? '#FFFC00' : '#A16207' }]}>@{profile.snapchat}</Text>
                            </View>
                        )}
                        {!profile.instagram && !profile.spotify && !profile.snapchat && (
                            <Text style={[styles.noSocialsText, { color: colors.mutedForeground }]}>No socials linked yet</Text>
                        )}
                    </View>
                </Animated.View>

                <ProfileActionBar onEditPress={() => handlePress('/edit-profile')} />
            </ScrollView>
        </View>
        </TabSwipeView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    decorBlur: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        opacity: 0.25,
    },
    decorBlur1: { top: -50, right: -50, backgroundColor: '#E91E8C' },
    decorBlur2: { bottom: 200, left: -80, backgroundColor: '#00f2ff' },
    scrollContent: { paddingBottom: 20 },
    loadingContent: {
        alignItems: 'center',
        paddingTop: 100,
    },
    card: {
        marginHorizontal: 20,
        marginBottom: 16,
        borderRadius: 20,
        borderWidth: 1,
        padding: 20,
    },
    cardShadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 14,
    },
    cardIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTitle: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.8,
    },
    infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    infoItem: {
        width: '48%',
        padding: 12,
        borderRadius: 12,
        gap: 4,
    },
    infoItemFull: { width: '100%' },
    infoLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
    infoValue: { fontSize: 14, fontWeight: '500' },
    socialsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    socialBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 14,
        gap: 8,
    },
    socialHandle: { fontSize: 14, fontWeight: '500' },
    noSocialsText: { fontSize: 14 },
});
