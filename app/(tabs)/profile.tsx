import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Pressable } from 'react-native';
import { CachedImage } from '@/components/ui/cached-image';
import { useTheme } from '@/hooks/use-theme';
import { useProfile } from '@/hooks/use-profile';
import { CompletionHalo } from '@/components/profile/completion-halo';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Skeleton } from '@/components/ui/skeleton';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { QualityBadge } from '@/components/ui/quality-badge';
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

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
    const { colors, colorScheme } = useTheme();
    const isDark = colorScheme === 'dark';
    const { data: profile, isLoading } = useProfile();
    const router = useRouter();

    const calculateCompletion = () => {
        if (!profile) return 0;
        let score = 0;

        // Basic Info (20%)
        if (profile.firstName && profile.lastName) score += 7;
        if (profile.bio || profile.aboutMe) score += 7;
        if (profile.profilePhoto) score += 6;

        // Uni Life (15%)
        if (profile.university) score += 8;
        if (profile.course && profile.yearOfStudy) score += 7;

        // Vibe (25%)
        if (profile.interests && profile.interests.length > 0) score += 5;
        if (profile.zodiacSign) score += 3;
        if (profile.personalityType) score += 3;
        if (profile.loveLanguage) score += 3;
        if (profile.photos && profile.photos.length > 0) score += 3;
        if (profile.qualities && profile.qualities.length > 0) score += 4;
        if (profile.prompts && profile.prompts.length > 0) score += 4;

        // Know More (20%)
        if (profile.height) score += 3;
        if (profile.education) score += 3;
        if (profile.workoutFrequency) score += 2;
        if (profile.smoking) score += 2;
        if (profile.lookingFor) score += 3;
        if (profile.politics) score += 2;
        if (profile.religion) score += 3;
        if (profile.languages && profile.languages.length > 0) score += 2;

        // Socials (20%)
        if (profile.instagram) score += 10;
        if (profile.spotify || profile.snapchat) score += 10;

        return Math.min(score, 100);
    };

    const completion = calculateCompletion();

    const handlePress = (route: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(route as any);
    };

    if (isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                {/* Gradient Background */}
                {isDark && (
                    <LinearGradient
                        colors={['#2d1b47', '#1a0d2e', '#0f0a1a']}
                        style={StyleSheet.absoluteFill}
                    />
                )}
                <View style={styles.headerActions}>
                    <View style={{ width: 24, height: 24 }} />
                </View>

                <View style={[styles.heroSection, { marginTop: 20 }]}>
                    <Skeleton width={140} height={140} borderRadius={70} style={{ marginBottom: 16 }} />
                    <Skeleton width={200} height={32} borderRadius={8} style={{ marginBottom: 8 }} />
                    <Skeleton width={150} height={20} borderRadius={4} style={{ marginBottom: 4 }} />
                    <Skeleton width={100} height={20} borderRadius={4} />
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Animated Gradient Background for Dark Mode */}
            {isDark && (
                <LinearGradient
                    colors={['#2d1b47', '#1a0d2e', '#0f0a1a']}
                    style={StyleSheet.absoluteFill}
                />
            )}

            {/* Decorative Blurs */}
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
                {/* Header Actions */}
                <Animated.View 
                    entering={FadeIn.delay(100)}
                    style={styles.headerActions}
                >
                    <TouchableOpacity
                        style={[
                            styles.iconButton,
                            isDark && styles.iconButtonDark
                        ]}
                        onPress={() => handlePress('/settings')}
                    >
                        <Ionicons name="settings-outline" size={22} color={colors.foreground} />
                    </TouchableOpacity>
                </Animated.View>

                {/* Hero Section */}
                <Animated.View 
                    entering={FadeInDown.delay(200).springify()}
                    style={styles.heroSection}
                >
                    {/* Profile Image with Glow Effect */}
                    <View style={styles.profileImageContainer}>
                        {isDark && (
                            <LinearGradient
                                colors={['#E91E8C', '#00f2ff', '#E91E8C']}
                                style={styles.profileGlow}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            />
                        )}
                        <CompletionHalo percentage={completion} radius={70} strokeWidth={6}>
                            <CachedImage
                                uri={profile?.profilePhoto || profile?.user?.image}
                                style={styles.profileImage}
                                fallbackType="avatar"
                            />
                        </CompletionHalo>
                    </View>

                    <View style={styles.identityContainer}>
                        <Text style={[styles.name, { color: colors.foreground }]}>
                            {profile?.firstName} {profile?.lastName}
                            {profile?.age ? `, ${profile.age}` : ''}
                        </Text>
                        <Text style={[styles.uniDetails, { color: isDark ? 'rgba(255,255,255,0.5)' : colors.muted }]}>
                            {profile?.course} • Year {profile?.yearOfStudy}
                        </Text>
                        <LinearGradient
                            colors={['#E91E8C', '#00f2ff']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.uniNameGradient}
                        >
                            <Text style={styles.uniNameText}>
                                {profile?.university}
                            </Text>
                        </LinearGradient>
                    </View>

                    {/* Completion CTA - Glassmorphism Style */}
                    {completion < 100 && (
                        <Pressable
                            onPress={() => handlePress('/edit-profile')}
                            style={({ pressed }) => [
                                styles.completeButton,
                                pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }
                            ]}
                        >
                            <LinearGradient
                                colors={isDark 
                                    ? ['rgba(233, 30, 140, 0.3)', 'rgba(0, 242, 255, 0.2)']
                                    : ['rgba(233, 30, 140, 0.15)', 'rgba(0, 242, 255, 0.1)']
                                }
                                style={styles.completeGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <Text style={styles.completeEmoji}>⚡</Text>
                                <Text style={[styles.completeText, { color: isDark ? '#fff' : '#E91E8C' }]}>
                                    Complete Your Profile
                                </Text>
                                <View style={[styles.completeBadge, { backgroundColor: isDark ? '#E91E8C' : 'rgba(233, 30, 140, 0.2)' }]}>
                                    <Text style={[styles.completeBadgeText, { color: isDark ? '#fff' : '#E91E8C' }]}>
                                        {completion}%
                                    </Text>
                                </View>
                            </LinearGradient>
                        </Pressable>
                    )}
                </Animated.View>

                {/* Photos Carousel */}
                {profile?.photos && profile.photos.length > 0 && (
                    <Animated.View entering={FadeInDown.delay(300).springify()}>
                        <ScrollView 
                            horizontal 
                            showsHorizontalScrollIndicator={false} 
                            style={styles.photosScroll}
                            contentContainerStyle={{ paddingRight: 16 }}
                        >
                            {profile.photos.map((photo: any, index: React.Key | null | undefined) => (
                                <View key={index} style={styles.photoContainer}>
                                    <CachedImage uri={photo} style={styles.extraPhoto} fallbackType="photo" />
                                    {isDark && <LinearGradient
                                        colors={['transparent', 'rgba(0,0,0,0.3)']}
                                        style={styles.photoOverlay}
                                    />}
                                </View>
                            ))}
                        </ScrollView>
                    </Animated.View>
                )}

                {/* Bio Section - Card Style */}
                <Animated.View 
                    entering={FadeInDown.delay(400).springify()}
                    style={[
                        styles.card,
                        { 
                            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                            borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB',
                        },
                        !isDark && styles.cardLightShadow
                    ]}
                >
                    <View style={styles.cardHeader}>
                        <View style={[styles.cardIcon, { backgroundColor: isDark ? 'rgba(233, 30, 140, 0.2)' : 'rgba(233, 30, 140, 0.1)' }]}>
                            <Ionicons name="person" size={16} color="#E91E8C" />
                        </View>
                        <Text style={[styles.cardTitle, { color: isDark ? 'rgba(255,255,255,0.6)' : colors.muted }]}>
                            ABOUT ME
                        </Text>
                    </View>
                    <Text style={[styles.bioText, { color: colors.foreground }]}>
                        {profile?.bio || "No bio yet. Tap edit to add one!"}
                    </Text>
                </Animated.View>

                {/* Vibe Section */}
                <Animated.View 
                    entering={FadeInDown.delay(500).springify()}
                    style={[
                        styles.card,
                        { 
                            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                            borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB',
                        },
                        !isDark && styles.cardLightShadow
                    ]}
                >
                    <View style={styles.cardHeader}>
                        <View style={[styles.cardIcon, { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.1)' }]}>
                            <Ionicons name="sparkles" size={16} color="#8B5CF6" />
                        </View>
                        <Text style={[styles.cardTitle, { color: isDark ? 'rgba(255,255,255,0.6)' : colors.muted }]}>
                            THE VIBE
                        </Text>
                    </View>
                    <View style={styles.chipContainer}>
                        {profile?.zodiacSign && (
                            <LinearGradient
                                colors={isDark ? ['rgba(233, 30, 140, 0.3)', 'rgba(139, 92, 246, 0.3)'] : ['rgba(233, 30, 140, 0.15)', 'rgba(139, 92, 246, 0.15)']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.vibeChip}
                            >
                                <Text style={[styles.chipText, { color: isDark ? '#fff' : '#9333EA' }]}>✨ {profile.zodiacSign}</Text>
                            </LinearGradient>
                        )}
                        {profile?.personalityType && (
                            <LinearGradient
                                colors={isDark ? ['rgba(0, 242, 255, 0.3)', 'rgba(59, 130, 246, 0.3)'] : ['rgba(0, 242, 255, 0.15)', 'rgba(59, 130, 246, 0.15)']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.vibeChip}
                            >
                                <Text style={[styles.chipText, { color: isDark ? '#fff' : '#0284C7' }]}>🧠 {profile.personalityType}</Text>
                            </LinearGradient>
                        )}
                        {profile?.loveLanguage && (
                            <LinearGradient
                                colors={isDark ? ['rgba(255, 0, 85, 0.3)', 'rgba(255, 107, 107, 0.3)'] : ['rgba(255, 0, 85, 0.15)', 'rgba(255, 107, 107, 0.15)']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.vibeChip}
                            >
                                <Text style={[styles.chipText, { color: isDark ? '#fff' : '#DB2777' }]}>💕 {profile.loveLanguage}</Text>
                            </LinearGradient>
                        )}
                        {profile?.interests?.map((interest: string, index: number) => (
                            <View 
                                key={index} 
                                style={[
                                    styles.interestChip, 
                                    { 
                                        backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6',
                                        borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'transparent',
                                    }
                                ]}
                            >
                                <Text style={[styles.chipText, { color: isDark ? 'rgba(255,255,255,0.9)' : '#4B5563' }]}>
                                    {interest}
                                </Text>
                            </View>
                        ))}
                    </View>
                </Animated.View>

                {/* Qualities Section */}
                {profile?.qualities && profile.qualities.length > 0 && (
                    <Animated.View
                        entering={FadeInDown.delay(550).springify()}
                        style={[
                            styles.card,
                            {
                                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                                borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB',
                            },
                            !isDark && styles.cardLightShadow
                        ]}
                    >
                        <View style={styles.cardHeader}>
                            <View style={[styles.cardIcon, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)' }]}>
                                <Ionicons name="heart" size={16} color="#10b981" />
                            </View>
                            <Text style={[styles.cardTitle, { color: isDark ? 'rgba(255,255,255,0.6)' : colors.muted }]}>
                                MY QUALITIES
                            </Text>
                        </View>
                        <View style={styles.qualitiesContainer}>
                            {profile.qualities.map((quality: string, index: number) => (
                                <QualityBadge key={index} quality={quality} />
                            ))}
                        </View>
                    </Animated.View>
                )}

                {/* Prompts Section */}
                {profile?.prompts && profile.prompts.length > 0 && (
                    <Animated.View
                        entering={FadeInDown.delay(575).springify()}
                        style={[
                            styles.card,
                            {
                                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                                borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB',
                            },
                            !isDark && styles.cardLightShadow
                        ]}
                    >
                        <View style={styles.cardHeader}>
                            <View style={[styles.cardIcon, { backgroundColor: isDark ? 'rgba(249, 115, 22, 0.2)' : 'rgba(249, 115, 22, 0.1)' }]}>
                                <Ionicons name="chatbubble-ellipses" size={16} color="#f97316" />
                            </View>
                            <Text style={[styles.cardTitle, { color: isDark ? 'rgba(255,255,255,0.6)' : colors.muted }]}>
                                MY PROMPTS
                            </Text>
                        </View>
                        <View style={{ gap: 12 }}>
                            {profile.prompts.map((prompt: { promptId: string; response: string }, index: number) => (
                                <PromptCard key={index} promptId={prompt.promptId} response={prompt.response} />
                            ))}
                        </View>
                    </Animated.View>
                )}

                {/* About Me Section (new field) */}
                {profile?.aboutMe && (
                    <Animated.View
                        entering={FadeInDown.delay(585).springify()}
                        style={[
                            styles.card,
                            {
                                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                                borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB',
                            },
                            !isDark && styles.cardLightShadow
                        ]}
                    >
                        <View style={styles.cardHeader}>
                            <View style={[styles.cardIcon, { backgroundColor: isDark ? 'rgba(168, 85, 247, 0.2)' : 'rgba(168, 85, 247, 0.1)' }]}>
                                <Ionicons name="document-text" size={16} color="#a855f7" />
                            </View>
                            <Text style={[styles.cardTitle, { color: isDark ? 'rgba(255,255,255,0.6)' : colors.muted }]}>
                                MORE ABOUT ME
                            </Text>
                        </View>
                        <Text style={[styles.bioText, { color: colors.foreground }]}>
                            {profile.aboutMe}
                        </Text>
                    </Animated.View>
                )}

                {/* Know More Section */}
                {(profile?.height || profile?.education || profile?.workoutFrequency || profile?.smoking || profile?.lookingFor || profile?.politics || profile?.religion || (profile?.languages && profile.languages.length > 0)) && (
                    <Animated.View
                        entering={FadeInDown.delay(590).springify()}
                        style={[
                            styles.card,
                            {
                                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                                borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB',
                            },
                            !isDark && styles.cardLightShadow
                        ]}
                    >
                        <View style={styles.cardHeader}>
                            <View style={[styles.cardIcon, { backgroundColor: isDark ? 'rgba(6, 182, 212, 0.2)' : 'rgba(6, 182, 212, 0.1)' }]}>
                                <Ionicons name="information-circle" size={16} color="#06b6d4" />
                            </View>
                            <Text style={[styles.cardTitle, { color: isDark ? 'rgba(255,255,255,0.6)' : colors.muted }]}>
                                GET TO KNOW ME
                            </Text>
                        </View>
                        <View style={styles.infoGrid}>
                            {profile?.height && (
                                <View style={[styles.infoItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f9fafb' }]}>
                                    <Ruler size={18} color={isDark ? '#94a3b8' : '#6b7280'} />
                                    <Text style={[styles.infoLabel, { color: isDark ? '#94a3b8' : '#6b7280' }]}>Height</Text>
                                    <Text style={[styles.infoValue, { color: colors.foreground }]}>{profile.height}</Text>
                                </View>
                            )}
                            {profile?.education && (
                                <View style={[styles.infoItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f9fafb' }]}>
                                    <GraduationCap size={18} color={isDark ? '#94a3b8' : '#6b7280'} />
                                    <Text style={[styles.infoLabel, { color: isDark ? '#94a3b8' : '#6b7280' }]}>Education</Text>
                                    <Text style={[styles.infoValue, { color: colors.foreground }]}>{profile.education}</Text>
                                </View>
                            )}
                            {profile?.workoutFrequency && (
                                <View style={[styles.infoItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f9fafb' }]}>
                                    <Barbell size={18} color={isDark ? '#94a3b8' : '#6b7280'} />
                                    <Text style={[styles.infoLabel, { color: isDark ? '#94a3b8' : '#6b7280' }]}>Exercise</Text>
                                    <Text style={[styles.infoValue, { color: colors.foreground }]}>{profile.workoutFrequency}</Text>
                                </View>
                            )}
                            {profile?.smoking && (
                                <View style={[styles.infoItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f9fafb' }]}>
                                    <Cigarette size={18} color={isDark ? '#94a3b8' : '#6b7280'} />
                                    <Text style={[styles.infoLabel, { color: isDark ? '#94a3b8' : '#6b7280' }]}>Smoking</Text>
                                    <Text style={[styles.infoValue, { color: colors.foreground }]}>{profile.smoking}</Text>
                                </View>
                            )}
                            {profile?.lookingFor && (
                                <View style={[styles.infoItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f9fafb' }]}>
                                    <Heart size={18} color={isDark ? '#94a3b8' : '#6b7280'} />
                                    <Text style={[styles.infoLabel, { color: isDark ? '#94a3b8' : '#6b7280' }]}>Looking For</Text>
                                    <Text style={[styles.infoValue, { color: colors.foreground }]}>{profile.lookingFor}</Text>
                                </View>
                            )}
                            {profile?.politics && (
                                <View style={[styles.infoItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f9fafb' }]}>
                                    <Sparkle size={18} color={isDark ? '#94a3b8' : '#6b7280'} />
                                    <Text style={[styles.infoLabel, { color: isDark ? '#94a3b8' : '#6b7280' }]}>Politics</Text>
                                    <Text style={[styles.infoValue, { color: colors.foreground }]}>{profile.politics}</Text>
                                </View>
                            )}
                            {profile?.religion && (
                                <View style={[styles.infoItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f9fafb' }]}>
                                    <Church size={18} color={isDark ? '#94a3b8' : '#6b7280'} />
                                    <Text style={[styles.infoLabel, { color: isDark ? '#94a3b8' : '#6b7280' }]}>Religion</Text>
                                    <Text style={[styles.infoValue, { color: colors.foreground }]}>{profile.religion}</Text>
                                </View>
                            )}
                            {profile?.languages && profile.languages.length > 0 && (
                                <View style={[styles.infoItem, styles.infoItemFull, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f9fafb' }]}>
                                    <Globe size={18} color={isDark ? '#94a3b8' : '#6b7280'} />
                                    <Text style={[styles.infoLabel, { color: isDark ? '#94a3b8' : '#6b7280' }]}>Languages</Text>
                                    <Text style={[styles.infoValue, { color: colors.foreground }]}>{profile.languages.join(', ')}</Text>
                                </View>
                            )}
                        </View>
                    </Animated.View>
                )}

                {/* Socials Section */}
                <Animated.View 
                    entering={FadeInDown.delay(600).springify()}
                    style={[
                        styles.card,
                        { 
                            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                            borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB',
                        },
                        !isDark && styles.cardLightShadow
                    ]}
                >
                    <View style={styles.cardHeader}>
                        <View style={[styles.cardIcon, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)' }]}>
                            <Ionicons name="link" size={16} color="#3B82F6" />
                        </View>
                        <Text style={[styles.cardTitle, { color: isDark ? 'rgba(255,255,255,0.6)' : colors.muted }]}>
                            SOCIALS
                        </Text>
                    </View>
                    <View style={styles.socialsRow}>
                        {profile?.instagram && (
                            <View style={[styles.socialBadge, { backgroundColor: isDark ? 'rgba(225, 48, 108, 0.15)' : 'rgba(225, 48, 108, 0.12)' }]}>
                                <Ionicons name="logo-instagram" size={22} color="#E1306C" />
                                <Text style={[styles.socialHandle, { color: '#C13584' }]}>
                                    @{profile.instagram}
                                </Text>
                            </View>
                        )}
                        {profile?.spotify && (
                            <View style={[styles.socialBadge, { backgroundColor: isDark ? 'rgba(29, 185, 84, 0.15)' : 'rgba(29, 185, 84, 0.12)' }]}>
                                <Ionicons name="musical-notes" size={22} color="#1DB954" />
                                <Text style={[styles.socialHandle, { color: '#1AA34A' }]}>
                                    Spotify
                                </Text>
                            </View>
                        )}
                        {profile?.snapchat && (
                            <View style={[styles.socialBadge, { backgroundColor: isDark ? 'rgba(255, 252, 0, 0.15)' : '#FEF9C3' }]}>
                                <Ionicons name="logo-snapchat" size={22} color={isDark ? '#FFFC00' : '#CA8A04'} />
                                <Text style={[styles.socialHandle, { color: isDark ? '#FFFC00' : '#A16207' }]}>
                                    @{profile.snapchat}
                                </Text>
                            </View>
                        )}
                        {!profile?.instagram && !profile?.spotify && !profile?.snapchat && (
                            <Text style={[styles.noSocialsText, { color: isDark ? 'rgba(255,255,255,0.4)' : '#9CA3AF' }]}>
                                No socials linked yet
                            </Text>
                        )}
                    </View>
                </Animated.View>

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Fixed Footer - Floating Button */}
            <Animated.View 
                entering={FadeInDown.delay(700)}
                style={styles.footer}
            >
                <Pressable
                    onPress={() => handlePress('/edit-profile')}
                    style={({ pressed }) => [
                        pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
                    ]}
                >
                    <LinearGradient
                        colors={isDark ? ['#3d2459', '#2d1b47'] : ['#E91E8C', '#D946EF']}
                        style={styles.editButton}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <Ionicons name="pencil" size={18} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.editButtonText}>EDIT PROFILE</Text>
                    </LinearGradient>
                </Pressable>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    decorBlur: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        opacity: 0.3,
    },
    decorBlur1: {
        top: -50,
        right: -50,
        backgroundColor: '#E91E8C',
    },
    decorBlur2: {
        bottom: 200,
        left: -80,
        backgroundColor: '#00f2ff',
    },
    scrollContent: {
        paddingBottom: 20,
    },
    headerActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        padding: 16,
        paddingTop: 60,
    },
    iconButton: {
        padding: 10,
        borderRadius: 12,
    },
    iconButtonDark: {
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    heroSection: {
        alignItems: 'center',
        marginBottom: 24,
    },
    profileImageContainer: {
        position: 'relative',
    },
    profileGlow: {
        position: 'absolute',
        top: -8,
        left: -8,
        right: -8,
        bottom: -8,
        borderRadius: 80,
        opacity: 0.4,
    },
    profileImage: {
        width: 130,
        height: 130,
        borderRadius: 65,
    },
    identityContainer: {
        alignItems: 'center',
        marginTop: 16,
    },
    name: {
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    uniDetails: {
        fontSize: 14,
        marginTop: 4,
    },
    uniNameGradient: {
        marginTop: 6,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    uniNameText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
    },
    completeButton: {
        marginTop: 20,
        borderRadius: 16,
        overflow: 'hidden',
    },
    completeGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    completeEmoji: {
        fontSize: 16,
    },
    completeText: {
        fontWeight: '600',
        fontSize: 14,
    },
    completeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        marginLeft: 4,
    },
    completeBadgeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    photosScroll: {
        marginBottom: 20,
        paddingLeft: 20,
    },
    photoContainer: {
        position: 'relative',
        marginRight: 12,
    },
    extraPhoto: {
        width: 120,
        height: 160,
        borderRadius: 16,
    },
    photoOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 60,
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
    },
    card: {
        marginHorizontal: 20,
        marginBottom: 16,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
    },
    cardLightShadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 10,
    },
    cardIcon: {
        width: 32,
        height: 32,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
    },
    bioText: {
        fontSize: 16,
        lineHeight: 24,
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    vibeChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
    },
    interestChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    chipText: {
        fontSize: 14,
        fontWeight: '500',
    },
    socialsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    socialBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 14,
        gap: 8,
    },
    socialHandle: {
        fontSize: 14,
        fontWeight: '500',
    },
    noSocialsText: {
        fontSize: 14,
    },
    qualitiesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    infoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    infoItem: {
        width: '48%',
        padding: 12,
        borderRadius: 12,
        gap: 4,
    },
    infoItemFull: {
        width: '100%',
    },
    infoLabel: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginTop: 4,
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '500',
    },
    footer: {
        position: 'absolute',
        bottom: 34,
        left: 20,
        right: 20,
    },
    editButton: {
        flexDirection: 'row',
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 12,
    },
    editButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 15,
        letterSpacing: 0.5,
    },
});
