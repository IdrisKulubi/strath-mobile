import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useReducedMotion } from 'react-native-reanimated';

import { OnboardingChoiceRow, OnboardingPrimaryButton, OnboardingScreenShell, RisingAgeRangeSlider, RisingDateField, RisingInlineFeedback, RisingTextField, useRisingBeatController } from '@/components/onboarding';
import { Text } from '@/components/ui/text';
import { useImageUpload } from '@/hooks/use-image-upload';
import { useTheme } from '@/hooks/use-theme';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { useIdentity, useQuestionnaire, useQuestionnaireMutation, type QuestionnaireState } from '@/lib/questionnaire';
import {
  clearDatingSetupDraft,
  DATING_SETUP_DRAFT_VERSION,
  type DatingSetupDraft,
  markSetupResumeDismissed,
  readDatingSetupDraft,
  saveDatingSetupDraft,
} from '@/lib/dating-setup-draft';
import { ageRangeError, birthDateError, radiusError } from '@/lib/onboarding-input-validation';

type OwnProfile = {
  profile: {
    first_name: string;
    gender: string;
    about_me: string;
    photos: string[];
    university: string | null;
    course: string | null;
    year_of_study: number | null;
    face_verification_status: string;
  } | null;
};

const genders = [['male', 'Man'], ['female', 'Woman'], ['other', 'Non-binary or another identity']] as const;
const interests = [['male', 'Men'], ['female', 'Women'], ['other', 'Non-binary or other identities']] as const;
const intentions = ['Long-term relationship', 'Dating and exploring', 'Something casual', 'Still figuring it out'];
const LAST_BEAT = 11;

export default function DatingSetupScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const { beat, advance, back, jump } = useRisingBeatController(LAST_BEAT, reducedMotion);
  const identity = useIdentity();
  const questionnaire = useQuestionnaire<QuestionnaireState>('status');
  const ownProfile = useQuestionnaire<OwnProfile>('profile');
  const savePreferences = useQuestionnaireMutation<{ saved: true; revision: number }>('preferences', 'PUT');
  const saveProfile = useQuestionnaireMutation<{ saved: true; verificationReset: boolean }>('profile', 'PUT');
  const { uploadImage, isUploading, progress: uploadProgress, stage: uploadStage } = useImageUpload();
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [genderInterests, setGenderInterests] = useState<string[]>([]);
  const [minAge, setMinAge] = useState('18');
  const [maxAge, setMaxAge] = useState('40');
  const [city, setCity] = useState('');
  const [intention, setIntention] = useState('');
  const [bio, setBio] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [university, setUniversity] = useState('');
  const [course, setCourse] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState('');
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [radius, setRadius] = useState('25');
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [verificationReset, setVerificationReset] = useState(false);
  const [failedPhotoUri, setFailedPhotoUri] = useState<string | null>(null);
  const [failedReplacementIndex, setFailedReplacementIndex] = useState<number | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const saveInFlight = useRef(false);
  const photoUploadInFlight = useRef(false);

  useEffect(() => {
    if (loaded || !questionnaire.data || !ownProfile.data || !identity.data) return;
    const profile = ownProfile.data.profile;
    const preferences = questionnaire.data.preferences;
    const userId = identity.data;
    let cancelled = false;
    void (async () => {
      const draft = await readDatingSetupDraft(userId);
      if (cancelled) return;
      setName(draft?.name ?? profile?.first_name ?? '');
      jump(draft ? Math.max(0, Math.min(LAST_BEAT, draft.beat)) : profile?.first_name?.trim() ? 1 : 0);
      setGender(draft?.gender ?? profile?.gender ?? '');
      setBio(draft?.bio ?? profile?.about_me ?? '');
      setPhotos(draft?.photos ?? profile?.photos ?? []);
      setUniversity(draft?.university ?? profile?.university ?? '');
      setCourse(draft?.course ?? profile?.course ?? '');
      setYearOfStudy(draft?.yearOfStudy ?? (profile?.year_of_study ? String(profile.year_of_study) : ''));
      setBirthDate(draft?.birthDate ?? questionnaire.data?.birthDate ?? '');
      if (preferences) {
        setGenderInterests(draft?.genderInterests ?? preferences.genders);
        setMinAge(draft?.minAge ?? String(preferences.minAge));
        setMaxAge(draft?.maxAge ?? String(preferences.maxAge));
        setCity(draft?.city ?? preferences.city);
        setIntention(draft?.intention ?? preferences.intentions[0] ?? '');
        if (draft) {
          setCoordinates(draft.coordinates);
          setRadius(draft.radius);
        } else if (preferences.latitude !== null && preferences.longitude !== null && preferences.radiusKm !== null) {
          setCoordinates({ latitude: preferences.latitude, longitude: preferences.longitude });
          setRadius(String(preferences.radiusKm));
        }
      } else if (draft) {
        setGenderInterests(draft.genderInterests);
        setMinAge(draft.minAge);
        setMaxAge(draft.maxAge);
        setCity(draft.city);
        setIntention(draft.intention);
        setCoordinates(draft.coordinates);
        setRadius(draft.radius);
      }
      setDirty(Boolean(draft));
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [loaded, ownProfile.data, questionnaire.data, identity.data, jump]);

  useEffect(() => {
    if (!loaded || !identity.data) return;
    if (beat === 0 && !dirty) return;
    const userId = identity.data;
    const draft: DatingSetupDraft = {
      version: DATING_SETUP_DRAFT_VERSION,
      beat,
      name,
      birthDate,
      gender,
      genderInterests,
      minAge,
      maxAge,
      city,
      intention,
      bio,
      photos,
      university,
      course,
      yearOfStudy,
      coordinates,
      radius,
    };
    const timer = setTimeout(() => {
      void saveDatingSetupDraft(userId, draft).catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [loaded, dirty, identity.data, beat, name, birthDate, gender, genderInterests, minAge, maxAge, city, intention, bio, photos, university, course, yearOfStudy, coordinates, radius]);

  const busy = savePreferences.isPending || saveProfile.isPending || isUploading;
  const valid = Boolean(
    name.trim() && !birthDateError(birthDate) && gender && genderInterests.length
    && city.trim() && intention && bio.trim().length >= 10 && photos.length
    && !ageRangeError(minAge, maxAge) && (!coordinates || !radiusError(radius))
    && (!yearOfStudy || (Number.isInteger(Number(yearOfStudy)) && Number(yearOfStudy) >= 1 && Number(yearOfStudy) <= 12)),
  );

  async function addPhoto(replaceIndex: number | null = null) {
    try {
      setError(null);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) throw new Error('Photo access is needed to choose a profile photo. You can enable it in device settings.');
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.85 });
      if (!result.canceled && result.assets[0]?.uri) await uploadPhoto(result.assets[0].uri, replaceIndex);
    } catch (uploadError) {
      setError(uploadError);
    }
  }

  async function uploadPhoto(uri: string, replaceIndex: number | null = null) {
    if (photoUploadInFlight.current) return;
    photoUploadInFlight.current = true;
    setFailedPhotoUri(null);
    setFailedReplacementIndex(null);
    try {
      const url = await uploadImage(uri);
      setPhotos((items) => {
        if (items.includes(url)) return items;
        if (replaceIndex !== null && replaceIndex < items.length) return items.map((photo, index) => index === replaceIndex ? url : photo);
        return [...items, url].slice(0, 6);
      });
      setSaved(false); setDirty(true);
      setError(null);
    } catch (uploadError) {
      setFailedPhotoUri(uri);
      setFailedReplacementIndex(replaceIndex);
      setError(uploadError);
    } finally {
      photoUploadInFlight.current = false;
    }
  }

  async function requestLocation() {
    try {
      setError(null);
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error('Location was not shared. Your city still works for discovery.');
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoordinates(location.coords);
      setSaved(false); setDirty(true);
    } catch (locationError) {
      setCoordinates(null);
      setSaved(false); setDirty(true);
      setError(locationError);
    }
  }

  async function save() {
    if (saveInFlight.current || !valid) return;
    saveInFlight.current = true;
    try {
      setError(null);
      setSaved(false); setDirty(true);
      setVerificationReset(false);
      await savePreferences.mutateAsync({
        birthDate,
        genders: genderInterests,
        minAge: Number(minAge),
        maxAge: Number(maxAge),
        city: city.trim(),
        radiusKm: coordinates ? Number(radius) : null,
        latitude: coordinates?.latitude ?? null,
        longitude: coordinates?.longitude ?? null,
        intentions: [intention],
      });
      const result = await saveProfile.mutateAsync({
        name: name.trim(), gender, bio: bio.trim(), photos,
        university: university.trim() || null,
        course: course.trim() || null,
        yearOfStudy: yearOfStudy ? Number(yearOfStudy) : null,
      });
      setSaved(true);
      setDirty(false);
      if (identity.data) {
        await clearDatingSetupDraft(identity.data);
      }
      setVerificationReset(result.verificationReset);
    } catch (saveError) {
      setError(saveError);
    } finally {
      saveInFlight.current = false;
    }
  }

  const maximumBirthDate = new Date();
  maximumBirthDate.setFullYear(maximumBirthDate.getFullYear() - 18);
  const minimumBirthDate = new Date(maximumBirthDate.getFullYear() - 102, 0, 1);

  const titles = [
    'What should we call you?',
    'When is your birthday?',
    'How do you describe your gender?',
    'Who would you like to meet?',
    'What age range feels right?',
    'Which city are you in?',
    'Would you like to use distance?',
    'What are you looking for?',
    'Introduce yourself',
    'Show yourself in photos',
    'Anything about your studies?',
    'Your profile is ready to save',
  ];
  const subtitles = [
    'Your name appears on your profile.',
    'Your birth date stays private. You must be at least 18.',
    'Choose the option that fits you.',
    'Select every option that applies. We will not infer this from your gender.',
    'Choose the ages you are comfortable meeting.',
    'A city is needed even when you use distance.',
    'You can continue with city only. Location is optional.',
    'Pick what fits today. You can change it later.',
    'A few details help someone start a conversation.',
    'Add at least one recent photo. The first one is your main photo.',
    'This is optional. You can leave it blank.',
    'Check your details, then save to continue.',
  ];
  const chapterIndex = beat <= 2 ? 0 : beat <= 7 ? 1 : 2;
  const chapterLabel = chapterIndex === 0 ? 'About you' : chapterIndex === 1 ? 'Your preferences' : 'Your profile';
  const previousAnswer = beat === 0 ? undefined : {
    label: ['Your name', 'Birth date', 'Gender', 'Who you want to meet', 'Age range', 'City', 'Distance', 'Intention', 'Introduction', 'Photos', 'Studies'][beat - 1],
    value: [name, birthDate, genders.find(([id]) => id === gender)?.[1] ?? '', genderInterests.map((id) => interests.find(([value]) => value === id)?.[1] ?? id).join(', '), `${minAge}–${maxAge}`, city, coordinates ? `${radius} km` : 'City only', intention, bio, `${photos.length} added`, university || 'Skipped'][beat - 1],
    onEdit: () => jump(beat - 1),
  };
  const fieldError = beat === 1 && birthDate ? birthDateError(birthDate) : beat === 4 ? ageRangeError(minAge, maxAge) : beat === 6 && coordinates ? radiusError(radius) : null;
  const submissionError = error ? error instanceof Error ? error.message : 'Something went wrong. Please try again.' : null;
  const canAdvance = beat === 0 ? Boolean(name.trim())
    : beat === 1 ? !birthDateError(birthDate)
    : beat === 3 ? genderInterests.length > 0
    : beat === 4 ? !ageRangeError(minAge, maxAge)
    : beat === 5 ? Boolean(city.trim())
    : beat === 6 ? !coordinates || !radiusError(radius)
    : beat === 8 ? bio.trim().length >= 10
    : beat === 9 ? photos.length > 0 && !isUploading && !failedPhotoUri
    : beat === 10 ? !yearOfStudy || (Number.isInteger(Number(yearOfStudy)) && Number(yearOfStudy) >= 1 && Number(yearOfStudy) <= 12)
    : beat === 11 ? valid
    : false;
  const needsContinue = [0, 1, 3, 4, 5, 6, 8, 9, 10, 11].includes(beat);
  const handleBack = () => {
    if (beat === 0) {
      markSetupResumeDismissed();
      if (router.canGoBack()) router.back();
      else router.replace('/dating' as never);
      return;
    }
    back();
  };
  const handleContinue = () => {
    setLocalError(null);
    if (!canAdvance) {
      setLocalError(fieldError ?? 'Complete this step to continue.');
      return;
    }
    if (beat === 11) { void save(); return; }
    advance();
  };

  return (
    <OnboardingScreenShell
      presentation="rising"
      stepIndex={beat}
      beatKey={beat}
      progressLabel={chapterLabel}
      progressIndex={chapterIndex}
      progressCount={3}
      onBack={handleBack}
      title={!loaded ? 'Getting your details ready' : titles[beat]}
      subtitle={!loaded ? 'Your saved details will appear here.' : subtitles[beat]}
      previousAnswer={loaded ? previousAnswer : undefined}
      footer={loaded && needsContinue ? (
        <OnboardingPrimaryButton
          appearance="rising"
          label={beat === 11 ? busy ? 'Saving…' : saved ? 'Saved' : 'Save profile and preferences' : 'Continue'}
          disabled={busy || (beat === 11 && saved) || !canAdvance}
          onPress={handleContinue}
        />
      ) : undefined}
    >
      {!loaded ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} />
          {(questionnaire.isError || ownProfile.isError) ? (
            <Pressable accessibilityRole="button" onPress={() => { void questionnaire.refetch(); void ownProfile.refetch(); }} style={styles.linkTouch}>
              <Text style={[styles.link, { color: colors.primaryText }]}>Try loading again</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={styles.beatBody}>
          {beat === 0 ? <RisingTextField label="First name" value={name} onChangeText={(value) => { setName(value); setSaved(false); setDirty(true); }} autoCapitalize="words" autoComplete="given-name" returnKeyType="done" /> : null}
          {beat === 1 ? (
            <View style={styles.beatBody}>
              {Platform.OS === 'web' ? (
                <RisingTextField label="Birth date (YYYY-MM-DD)" value={birthDate} onChangeText={(value) => { setBirthDate(value); setSaved(false); setDirty(true); }} placeholder="1998-04-23" error={fieldError ?? undefined} />
              ) : (
                <RisingDateField
                  value={birthDate}
                  onChange={(iso) => { setBirthDate(iso); setSaved(false); setDirty(true); }}
                  maximumDate={maximumBirthDate}
                  minimumDate={minimumBirthDate}
                  error={fieldError ?? undefined}
                  initiallyOpen={!birthDate}
                />
              )}
            </View>
          ) : null}
          {beat === 2 ? genders.map(([id, label]) => <OnboardingChoiceRow key={id} appearance="rising" option={{ value: id, label }} selected={gender === id} onPress={() => { setGender(id); setSaved(false); setDirty(true); advance(); }} />) : null}
          {beat === 3 ? interests.map(([id, label]) => <OnboardingChoiceRow key={id} appearance="rising" selectionMode="multiple" option={{ value: id, label }} selected={genderInterests.includes(id)} onPress={() => { setGenderInterests((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]); setSaved(false); setDirty(true); }} />) : null}
          {beat === 4 ? (
            <RisingAgeRangeSlider
              minAge={minAge}
              maxAge={maxAge}
              onChange={(min, max) => {
                setMinAge(min);
                setMaxAge(max);
                setSaved(false);
                setDirty(true);
              }}
              error={fieldError ?? undefined}
            />
          ) : null}
          {beat === 5 ? <RisingTextField label="City" value={city} onChangeText={(value) => { setCity(value); setSaved(false); setDirty(true); }} autoCapitalize="words" /> : null}
          {beat === 6 ? (
            <View style={styles.beatBody}>
              <OnboardingChoiceRow appearance="rising" option={{ value: 'city', label: 'Use my city only', description: 'No location permission needed' }} selected={!coordinates} onPress={() => { setCoordinates(null); setSaved(false); setDirty(true); setError(null); }} />
              <OnboardingChoiceRow appearance="rising" option={{ value: 'distance', label: 'Use my current location', description: 'Add a distance limit for discovery' }} selected={Boolean(coordinates)} onPress={() => { void requestLocation(); }} />
              {coordinates ? <RisingTextField label="Maximum distance in kilometres" value={radius} onChangeText={(value) => { setRadius(value); setSaved(false); setDirty(true); }} keyboardType="number-pad" error={fieldError ?? undefined} /> : null}
              <Text style={[styles.hint, { color: colors.mutedForeground }]}>Filters are never widened silently.</Text>
            </View>
          ) : null}
          {beat === 7 ? intentions.map((item) => <OnboardingChoiceRow key={item} appearance="rising" option={{ value: item, label: item }} selected={intention === item} onPress={() => { setIntention(item); setSaved(false); setDirty(true); advance(); }} />) : null}
          {beat === 8 ? (
            <View style={styles.beatBody}>
              <RisingTextField label="Introduction" value={bio} onChangeText={(value) => { setBio(value); setSaved(false); setDirty(true); }} multiline placeholder="A few details that help someone start a conversation" error={bio && bio.trim().length < 10 ? 'Write at least 10 characters.' : undefined} />
              <Text style={[styles.hint, { color: colors.mutedForeground }]}>{bio.trim().length} characters · at least 10 needed</Text>
            </View>
          ) : null}
          {beat === 9 ? (
            <View style={styles.beatBody}>
              <Text style={[styles.hint, { color: colors.mutedForeground }]}>Add up to six recent photos. Changing photos resets face verification.</Text>
              <View style={styles.photoGrid}>{photos.map((uri, index) => <View key={`${uri}:${index}`} style={styles.photoItem}><Image source={{ uri }} accessibilityLabel={`Profile photo ${index + 1}`} style={styles.photo} /><Pressable accessibilityRole="button" accessibilityLabel={`Replace photo ${index + 1}`} disabled={isUploading} onPress={() => { void addPhoto(index); }} style={styles.linkTouch}><Text style={[styles.link, { color: colors.primaryText }]}>Replace</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Delete photo ${index + 1}`} disabled={isUploading} onPress={() => { setPhotos((items) => items.filter((_, itemIndex) => itemIndex !== index)); setSaved(false); setDirty(true); }} style={styles.linkTouch}><Text style={[styles.link, { color: colors.destructive }]}>Delete</Text></Pressable></View>)}</View>
              <Pressable accessibilityRole="button" onPress={() => { void addPhoto(); }} disabled={busy || photos.length >= 6} style={[styles.secondaryAction, { backgroundColor: colors.control, borderColor: colors.controlBorder }]}><Text style={[styles.secondaryText, { color: colors.foreground }]}>{isUploading ? 'Uploading photo…' : 'Add a photo'}</Text></Pressable>
              {isUploading ? <RisingInlineFeedback message={uploadStage === 'uploading' ? uploadProgress !== null ? `Uploading photo: ${uploadProgress}%` : 'Uploading photo…' : 'Preparing photo for upload…'} /> : null}
              {failedPhotoUri && !isUploading ? <Pressable accessibilityRole="button" onPress={() => { void uploadPhoto(failedPhotoUri, failedReplacementIndex); }} style={styles.linkTouch}><Text style={[styles.link, { color: colors.primaryText }]}>Retry failed photo</Text></Pressable> : null}
              <Text style={[styles.hint, { color: colors.mutedForeground }]}>{photos.length} of 6 photos ready</Text>
            </View>
          ) : null}
          {beat === 10 ? (
            <View style={styles.beatBody}>
              <Text style={[styles.hint, { color: colors.mutedForeground }]}>Education is optional.</Text>
              <RisingTextField label="University" value={university} onChangeText={(value) => { setUniversity(value); setSaved(false); setDirty(true); }} />
              <RisingTextField label="Course" value={course} onChangeText={(value) => { setCourse(value); setSaved(false); setDirty(true); }} />
              <RisingTextField label="Year of study" value={yearOfStudy} onChangeText={(value) => { setYearOfStudy(value); setSaved(false); setDirty(true); }} keyboardType="number-pad" error={yearOfStudy && (!Number.isInteger(Number(yearOfStudy)) || Number(yearOfStudy) < 1 || Number(yearOfStudy) > 12) ? 'Use a year from 1 to 12.' : undefined} />
            </View>
          ) : null}
          {beat === 11 ? (
            <View style={styles.beatBody}>
              <Text style={[styles.hint, { color: colors.mutedForeground }]}>{photos.length} photo{photos.length === 1 ? '' : 's'} · {bio.trim().length} introduction characters{university ? ` · ${university}` : ''}</Text>
              {saved ? <RisingInlineFeedback message="Profile and preferences saved." /> : null}
              {verificationReset ? <RisingInlineFeedback message="Your photos changed. Complete face verification again before discovery." /> : null}
              {saved || (ownProfile.data?.profile && !dirty) ? (
                <View style={styles.beatBody}>
                  <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/verification', params: { returnTo: '/questions' } })} style={styles.linkTouch}><Text style={[styles.link, { color: colors.primaryText }]}>Complete face verification</Text></Pressable>
                  <Pressable accessibilityRole="button" onPress={() => router.push('/questions' as never)} style={styles.linkTouch}><Text style={[styles.link, { color: colors.primaryText }]}>Continue to questions</Text></Pressable>
                </View>
              ) : null}
            </View>
          ) : null}
          {localError ? <RisingInlineFeedback tone="error" message={localError} /> : null}
          {submissionError ? <RisingInlineFeedback tone="error" message={submissionError} /> : null}
        </View>
      )}
    </OnboardingScreenShell>
  );
}

const styles = StyleSheet.create({
  beatBody: { gap: SPACING.compact },
  center: { alignItems: 'center', gap: SPACING.base },
  hint: { ...TYPOGRAPHY.caption, textAlign: 'center' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.compact },
  photoItem: { width: '47%', minWidth: 120, gap: SPACING.tight },
  photo: { width: '100%', aspectRatio: 1, borderRadius: RADIUS.row },
  secondaryAction: { minHeight: 56, borderWidth: StyleSheet.hairlineWidth, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { ...TYPOGRAPHY.body, fontWeight: '600' },
  linkTouch: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  link: { ...TYPOGRAPHY.body, fontWeight: '600' },
});
