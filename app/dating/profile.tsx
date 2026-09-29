import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Action, Copy, Feedback, Page } from '@/components/questionnaire/ui';
import { ProfilePhoto, ProfileRow, ProfileSection, type OwnDatingProfile } from '@/components/dating-profile/profile-ui';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from '@/hooks/use-theme';
import { clearSession } from '@/lib/auth-helpers';
import { ageFromBirthDate } from '@/lib/onboarding-input-validation';
import { useQuestionnaire, type QuestionnaireState } from '@/lib/questionnaire';

export default function QuestionnaireProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const status = useQuestionnaire<QuestionnaireState>('status');
  const own = useQuestionnaire<OwnDatingProfile>('profile');
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const edit = (section = 'photos') => router.push({ pathname: '/dating-profile-edit' as never, params: { section } });
  const profile = own.data?.profile;
  const preferences = status.data?.preferences;
  const age = ageFromBirthDate(status.data?.birthDate ?? '');
  const verified = profile?.face_verification_status === 'verified';
  const verificationLabel = verified ? 'Face verified' : ['processing', 'manual_review'].includes(profile?.face_verification_status ?? '') ? 'Verification in review' : 'Verify your profile';
  return <Page title="Your profile" floatingTabBar hideTitle header={<View style={styles.header}>
    <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>Your profile</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Profile settings" onPress={() => router.push('/settings')} style={[styles.settings, { backgroundColor: colors.control }]}><Ionicons name="settings-outline" size={22} color={colors.foreground} /></Pressable>
  </View>}>
    {own.isPending ? <><Skeleton width="100%" height={108} borderRadius={16} /><Skeleton width="100%" height={56} borderRadius={28} /><Skeleton width="100%" height={180} borderRadius={16} /></> : null}
    <Feedback error={own.error ?? error} />
    {own.isError ? <Action label="Try loading again" onPress={() => { void own.refetch(); }} /> : null}
    {profile ? <>
      <View style={styles.identity}>
        <ProfilePhoto uri={profile.photos?.[0]} label="Your main profile photo" large />
        <View style={styles.identityText}>
          <Text style={[styles.name, { color: colors.foreground }]}>{profile.first_name}{age !== null && age >= 18 ? `, ${age}` : ''}</Text>
          <Text style={[styles.caption, { color: colors.mutedForeground }]}>{[profile.university, preferences?.city].filter(Boolean).join(' · ') || 'Make this space your own'}</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/verification', params: { returnTo: '/dating/profile' } })} style={styles.verification}><Ionicons name={verified ? 'checkmark-circle' : 'shield-checkmark-outline'} size={18} color={verified ? colors.success : colors.primaryText} /><Text style={[styles.caption, { color: colors.foreground }]}>{verificationLabel}</Text></Pressable>
        </View>
      </View>
      <Action label="Edit profile" tone="primary" onPress={() => edit()} />
      <ProfileSection title="Your photos" onEdit={() => edit('photos')}>
        <View style={styles.photos}>{profile.photos?.map((photo, i) => <Pressable key={`${photo}-${i}`} style={styles.photo} accessibilityRole="button" accessibilityLabel={`Edit photo ${i + 1}${i === 0 ? ', main photo' : ''}`} onPress={() => edit('photos')}><ProfilePhoto uri={photo} label={`Profile photo ${i + 1}`} />{i === 0 ? <Text style={[styles.photoLabel, { color: colors.mutedForeground }]}>Main photo</Text> : null}</Pressable>)}</View>
        {!profile.photos?.length ? <Copy muted>Add a photo so people can recognise you.</Copy> : null}
      </ProfileSection>
      <ProfileSection title="About you" onEdit={() => edit('about')}><Copy>{profile.about_me || 'Add a little about yourself and what you enjoy.'}</Copy></ProfileSection>
      <ProfileSection title="The details" onEdit={() => edit('details')}>
        {[
          ['Gender', ({ male: 'Man', female: 'Woman', other: 'Non-binary or another identity' } as Record<string, string>)[profile.gender] || 'Not added'],
          ['University', profile.university || 'Not added'], ['Course', profile.course || 'Not added'],
          ['Year of study', profile.year_of_study ? `Year ${profile.year_of_study}` : 'Not added'],
        ].map(([label, value]) => <View key={label} style={[styles.detail, { borderBottomColor: colors.controlBorder }]}><Text style={[styles.caption, { color: colors.mutedForeground }]}>{label}</Text><Text style={[styles.value, { color: colors.foreground }]}>{value}</Text></View>)}
      </ProfileSection>
    </> : !own.isPending && !own.isError ? <Action label="Create your profile" tone="primary" onPress={() => router.push('/dating-setup')} /> : null}
    <ProfileSection title="Make it yours">
      <ProfileRow icon="options-outline" title="Dating preferences" detail={preferences ? `${preferences.minAge}–${preferences.maxAge} years · ${preferences.city}` : 'Who you’d like to meet'} onPress={() => router.push('/discovery-filters')} />
      <ProfileRow icon="chatbubbles-outline" title="Compatibility answers" detail={status.data ? `${status.data.answerCount} answers saved · ${status.data.complete ? 'Review or add more' : 'Continue answering'}` : 'Your answers and what matters to you'} onPress={() => router.push(status.data?.complete ? { pathname: '/questions', params: { review: '1' } } : '/questions')} />
      <Text style={[styles.caption, { color: colors.mutedForeground }]}>New and edited answers are public. Previously private answers stay private until you edit and save them.</Text>
      <Feedback error={status.error} />
      {status.isError ? <Action label="Reload preferences and progress" onPress={() => { void status.refetch(); }} /> : null}
    </ProfileSection>
    <ProfileSection title="Your account"><ProfileRow icon="shield-outline" title="Privacy and safety" detail="Manage your account and privacy settings" onPress={() => router.push('/settings')} /></ProfileSection>
    <Action label={signingOut ? 'Signing out…' : 'Sign out'} tone="ghost" disabled={signingOut} onPress={() => { setSigningOut(true); void clearSession().then(() => { queryClient.clear(); router.replace('/(auth)/login'); }).catch((e) => { setError(e); setSigningOut(false); }); }} />
  </Page>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 }, title: { fontSize: 26, fontWeight: '700', flex: 1 },
  settings: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  identity: { flexDirection: 'row', gap: 20, alignItems: 'center', paddingVertical: 8 }, identityText: { flex: 1, gap: 8 }, name: { fontSize: 26, fontWeight: '700' },
  caption: { fontSize: 13, lineHeight: 19 }, verification: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 48, flexWrap: 'wrap' },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, photo: { width: '30%', flexGrow: 0 }, photoLabel: { fontSize: 13, marginTop: 8 },
  detail: { paddingVertical: 12, gap: 4, borderBottomWidth: StyleSheet.hairlineWidth }, value: { fontSize: 15, lineHeight: 22 },
});
