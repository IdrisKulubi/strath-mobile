import React, { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Action, Copy, Feedback, Field, Loading, Notice, Page } from '@/components/questionnaire/ui';
import { OnboardingChoiceRow } from '@/components/onboarding';
import { StickyFooter } from '@/components/questionnaire/sticky-footer';
import { ProfilePhoto, ProfileSection, type OwnDatingProfile } from '@/components/dating-profile/profile-ui';
import { useTheme } from '@/hooks/use-theme';
import { useImageUpload } from '@/hooks/use-image-upload';
import { HEIGHTS, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { useQuestionnaire, useQuestionnaireMutation } from '@/lib/questionnaire';

type Profile = NonNullable<OwnDatingProfile['profile']>;

function PhotoMakeMainButton({
  label,
  onPress,
  disabled,
  isMain,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  isMain: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.makeMainButton,
        {
          borderColor: isMain ? colors.primary : colors.controlBorder,
          backgroundColor: isMain ? colors.controlActive : colors.control,
          opacity: disabled ? 0.5 : pressed ? 0.9 : 1,
        },
      ]}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.makeMainButtonText,
          { color: isMain ? colors.primaryText : colors.foreground },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function PhotoDeleteButton({
  onPress,
  disabled,
  photoIndex,
}: {
  onPress: () => void;
  disabled?: boolean;
  photoIndex: number;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Delete photo ${photoIndex + 1}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.deleteButton,
        {
          borderColor: colors.destructive,
          backgroundColor: colors.control,
          opacity: disabled ? 0.45 : pressed ? 0.88 : 1,
        },
      ]}
    >
      <Ionicons name="trash-outline" size={20} color={colors.destructive} />
    </Pressable>
  );
}

function confirmDeletePhoto(onDelete: () => void) {
  Alert.alert(
    'Delete this photo?',
    'After you save, this photo is removed permanently. That cannot be undone.',
    [
      { text: 'Keep photo', style: 'cancel' },
      { text: 'Delete photo', style: 'destructive', onPress: onDelete },
    ],
  );
}
const sections = ['photos', 'about', 'details'] as const;
type Section = typeof sections[number];

export default function DatingProfileEditScreen() {
  const own = useQuestionnaire<OwnDatingProfile>('profile');
  const router = useRouter();
  if (own.isPending) return <Page title="Edit profile" back><Loading label="Loading your profile" /></Page>;
  if (own.isError && !own.data?.profile) return <Page title="Edit profile" back><Feedback error={own.error} /><Action label="Try again" onPress={() => { void own.refetch(); }} /></Page>;
  if (!own.data?.profile) return <Page title="Edit profile" back><Copy>Create your profile to get started.</Copy><Action label="Set up profile" onPress={() => router.replace('/dating-setup')} /></Page>;
  return <ProfileEditor profile={own.data.profile} />;
}

function ProfileEditor({ profile }: { profile: Profile }) {
  const { colors } = useTheme();
  const { fontScale } = useWindowDimensions();
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ section?: string }>();
  const [section, setSection] = useState<Section>(sections.includes(params.section as Section) ? params.section as Section : 'photos');
  const [name, setName] = useState(profile.first_name);
  const [gender, setGender] = useState(profile.gender);
  const [bio, setBio] = useState(profile.about_me ?? '');
  const [photos, setPhotos] = useState(profile.photos ?? []);
  const [university, setUniversity] = useState(profile.university ?? '');
  const [course, setCourse] = useState(profile.course ?? '');
  const [year, setYear] = useState(profile.year_of_study?.toString() ?? '');
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [verificationReset, setVerificationReset] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [failedUpload, setFailedUpload] = useState<{ uri: string; index?: number } | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const inFlight = useRef(false);
  const save = useQuestionnaireMutation<{ saved: true; verificationReset: boolean }>('profile', 'PUT');
  const upload = useImageUpload();
  const busy = save.isPending || uploadBusy;
  usePreventRemove(dirty || busy, ({ data }) => {
    if (busy) { Alert.alert('Please wait', 'Your changes are still being processed.'); return; }
    Alert.alert('Discard your changes?', 'Your saved profile will stay as it is.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });
  const change = <T,>(setter: (value: T) => void, value: T) => { setter(value); setDirty(true); setSaved(false); setFailedUpload(null); };
  const validation = !name.trim() || name.trim().length > 80 ? 'Add a name of up to 80 characters in Details.'
    : !['male', 'female', 'other'].includes(gender) ? 'Choose your gender in Details.'
    : bio.trim().length < 10 || bio.trim().length > 1500 ? 'Write between 10 and 1,500 characters in About.'
    : !photos.length ? 'Add at least one photo.'
    : university.length > 160 || course.length > 160 ? 'University and course can each contain up to 160 characters.'
    : year && (!/^\d+$/.test(year) || Number(year) < 1 || Number(year) > 12) ? 'Year of study must be between 1 and 12.' : null;

  async function uploadPhoto(uri: string, index?: number) {
    try {
      setError(null);
      const url = await upload.uploadImage(uri);
      if (!url) throw new Error('Photo upload failed. Try again.');
      setPhotos((current) => index === undefined ? [...current, url] : current.map((photo, i) => i === index ? url : photo));
      setDirty(true); setSaved(false); setFailedUpload(null);
    } catch (e) { setError(e); setFailedUpload({ uri, index }); }
  }
  async function pickPhoto(index?: number) {
    if (inFlight.current) return;
    inFlight.current = true; setUploadBusy(true);
    try {
      setError(null);
      setFailedUpload(null);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) throw new Error('Allow photo access in your device settings to choose a photo.');
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [3, 4], quality: 0.85 });
      if (!result.canceled && result.assets[0]) await uploadPhoto(result.assets[0].uri, index);
    } catch (e) { setError(e); }
    finally { inFlight.current = false; setUploadBusy(false); }
  }
  async function commit() {
    if (inFlight.current || validation || !dirty) return;
    inFlight.current = true;
    try {
      setError(null);
      const result = await save.mutateAsync({ name: name.trim(), gender, bio: bio.trim(), photos, university: university.trim() || null, course: course.trim() || null, yearOfStudy: year ? Number(year) : null });
      setDirty(false); setSaved(true); setVerificationReset((current) => current || result.verificationReset);
    } catch (e) { setError(e); }
    finally { inFlight.current = false; }
  }
  const saveFooter = (
    <StickyFooter
      floating
      primaryGlass
      primaryLabel={saved ? 'Back to profile' : save.isPending ? 'Saving…' : 'Save changes'}
      primaryLoading={save.isPending}
      primaryDisabled={uploadBusy || (!saved && (!dirty || Boolean(validation)))}
      onPrimaryPress={() => {
        if (saved) {
          if (router.canGoBack()) router.back();
          else router.replace('/dating/profile');
          return;
        }
        void commit();
      }}
    />
  );

  return (
    <Page
      title="Edit profile"
      back
      footer={saveFooter}
      floatingFooter
      footerButtonCount={1}
    >
    <Copy muted>Your photos, your words, your story. Changes go live when you save.</Copy>
    <View accessibilityRole="tablist" style={[styles.tabs, { backgroundColor: colors.control }]}>{sections.map((item) => <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected: section === item, disabled: busy }} disabled={busy} onPress={() => setSection(item)} style={[styles.tab, { backgroundColor: section === item ? colors.controlActive : 'transparent' }]}><Text style={[styles.tabText, { color: section === item ? colors.foreground : colors.mutedForeground }]}>{item === 'about' ? 'About' : item === 'photos' ? 'Photos' : 'Details'}</Text></Pressable>)}</View>
    <View pointerEvents={busy ? 'none' : 'auto'} accessibilityElementsHidden={busy} style={styles.content}>
      {section === 'photos' ? <ProfileSection title={`Your photos · ${photos.length}/6`}>
        <Copy muted>Your first photo leads your profile. Tap a photo to replace it.</Copy>
        <View style={styles.photos}>
          {photos.map((photo, i) => (
            <View key={`${photo}-${i}`} style={[styles.photoCard, fontScale > 1.3 && { width: '100%' }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Replace photo ${i + 1}`}
                disabled={busy}
                onPress={() => { void pickPhoto(i); }}
                style={styles.photoTap}
              >
                <ProfilePhoto uri={photo} label={`Photo ${i + 1}`} />
              </Pressable>
              <View style={styles.photoActions}>
                <PhotoMakeMainButton
                  label={i === 0 ? 'Main photo' : 'Make main'}
                  isMain={i === 0}
                  disabled={busy || i === 0}
                  onPress={() => change(setPhotos, [photo, ...photos.filter((_, index) => index !== i)])}
                />
                <PhotoDeleteButton
                  photoIndex={i}
                  disabled={busy || photos.length === 1}
                  onPress={() => confirmDeletePhoto(() => change(setPhotos, photos.filter((_, index) => index !== i)))}
                />
              </View>
            </View>
          ))}
        </View>
        {photos.length < 6 ? <Action label="Add a photo" disabled={busy} onPress={() => { void pickPhoto(); }} /> : null}
        <Copy muted>Keep at least one photo. Changing photos may require face verification again.</Copy>
      </ProfileSection> : section === 'about' ? <ProfileSection title="A little about you">
        <Field disabled={busy} maxLength={1500} label="Bio" value={bio} multiline onChangeText={(value) => change(setBio, value)} placeholder="What do you enjoy? What would make a great first date?" />
        <Text style={[styles.caption, { color: colors.mutedForeground }]}>{bio.length}/1,500 characters · At least 10</Text>
      </ProfileSection> : <ProfileSection title="Your details">
        <Field disabled={busy} maxLength={80} label="First name" value={name} onChangeText={(value) => change(setName, value)} />
        <View style={styles.genderBlock}>
          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Gender</Text>
          <Text style={[styles.caption, { color: colors.mutedForeground }]}>
            Choose the option that fits you. This appears on your profile.
          </Text>
          {([['male', 'Man'], ['female', 'Woman'], ['other', 'Non-binary or another identity']] as const).map(([value, label]) => (
            <OnboardingChoiceRow
              key={value}
              appearance="rising"
              selectionMode="single"
              option={{ value, label }}
              selected={gender === value}
              disabled={busy}
              onPress={() => change(setGender, value)}
            />
          ))}
        </View>
        <Field disabled={busy} maxLength={160} label="University (optional)" value={university} onChangeText={(value) => change(setUniversity, value)} />
        <Field disabled={busy} maxLength={160} label="Course (optional)" value={course} onChangeText={(value) => change(setCourse, value)} />
        <Field disabled={busy} maxLength={2} label="Year of study (optional)" value={year} keyboardType="numeric" onChangeText={(value) => change(setYear, value)} />
      </ProfileSection>}
    </View>
    {uploadBusy ? <Loading label={upload.progress === null ? 'Preparing your photo…' : `Uploading photo · ${upload.progress}%`} /> : null}
    <Feedback error={error} />
    {failedUpload ? <Action label="Retry photo upload" disabled={busy} onPress={() => { if (inFlight.current) return; inFlight.current = true; setUploadBusy(true); void uploadPhoto(failedUpload.uri, failedUpload.index).finally(() => { inFlight.current = false; setUploadBusy(false); }); }} /> : null}
    {dirty && validation ? <Notice>{validation}</Notice> : null}
    {saved ? <Notice tone="success">Your profile changes are saved.</Notice> : null}
    {verificationReset ? <><Notice>Your photos changed. Verify your face again to keep your profile ready for discovery.</Notice><Action label="Verify face" onPress={() => router.push({ pathname: '/verification', params: { returnTo: '/dating/profile' } })} /></> : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', borderRadius: 28, padding: 4 }, tab: { flex: 1, minHeight: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', padding: 8 },
  tabText: { fontSize: 15, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 19 },
  fieldLabel: { ...TYPOGRAPHY.body, fontWeight: '600' },
  genderBlock: { gap: SPACING.compact },
  content: { gap: 16 },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.base },
  photoCard: { width: '47%', gap: SPACING.tight },
  photoTap: { borderRadius: RADIUS.row, overflow: 'hidden' },
  photoActions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.tight },
  makeMainButton: {
    flex: 1,
    minHeight: HEIGHTS.primaryControl,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.tight,
    paddingHorizontal: SPACING.compact,
  },
  makeMainButtonText: { ...TYPOGRAPHY.body, fontWeight: '700', textAlign: 'center' },
  deleteButton: {
    width: HEIGHTS.primaryControl,
    height: HEIGHTS.primaryControl,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
