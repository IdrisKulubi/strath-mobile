import React, { useEffect, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';

import { Action, Copy, Feedback, Field, Loading, Notice, Page, SectionLabel } from '@/components/questionnaire/ui';
import { useImageUpload } from '@/hooks/use-image-upload';
import { useTheme } from '@/hooks/use-theme';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { useQuestionnaire, useQuestionnaireMutation, type QuestionnaireState } from '@/lib/questionnaire';

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

export default function DatingSetupScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const questionnaire = useQuestionnaire<QuestionnaireState>('status');
  const ownProfile = useQuestionnaire<OwnProfile>('profile');
  const savePreferences = useQuestionnaireMutation<{ saved: true; revision: number }>('preferences', 'PUT');
  const saveProfile = useQuestionnaireMutation<{ saved: true; verificationReset: boolean }>('profile', 'PUT');
  const { uploadImage, isUploading } = useImageUpload();
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
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
  const [verificationReset, setVerificationReset] = useState(false);

  useEffect(() => {
    if (loaded || !questionnaire.data || !ownProfile.data) return;
    const profile = ownProfile.data.profile;
    const preferences = questionnaire.data.preferences;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setName(profile?.first_name ?? '');
      setGender(profile?.gender ?? '');
      setBio(profile?.about_me ?? '');
      setPhotos(profile?.photos ?? []);
      setUniversity(profile?.university ?? '');
      setCourse(profile?.course ?? '');
      setYearOfStudy(profile?.year_of_study ? String(profile.year_of_study) : '');
      setBirthDate(questionnaire.data?.birthDate ?? '');
      if (preferences) {
        setGenderInterests(preferences.genders);
        setMinAge(String(preferences.minAge));
        setMaxAge(String(preferences.maxAge));
        setCity(preferences.city);
        setIntention(preferences.intentions[0] ?? '');
        if (preferences.latitude !== null && preferences.longitude !== null && preferences.radiusKm !== null) {
          setCoordinates({ latitude: preferences.latitude, longitude: preferences.longitude });
          setRadius(String(preferences.radiusKm));
        }
      }
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [loaded, ownProfile.data, questionnaire.data]);

  const busy = savePreferences.isPending || saveProfile.isPending || isUploading;
  const valid = Boolean(
    name.trim() && /^\d{4}-\d{2}-\d{2}$/.test(birthDate) && gender && genderInterests.length
    && city.trim() && intention && bio.trim().length >= 10 && photos.length
    && Number(minAge) >= 18 && Number(maxAge) >= Number(minAge),
  );

  async function addPhoto() {
    try {
      setError(null);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) throw new Error('Photo access is needed to choose a profile photo. You can enable it in device settings.');
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.85 });
      if (!result.canceled) {
        const url = await uploadImage(result.assets[0].uri);
        setPhotos((items) => [...items, url].slice(0, 6));
        setSaved(false);
      }
    } catch (uploadError) {
      setError(uploadError);
    }
  }

  async function requestLocation() {
    try {
      setError(null);
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error('Location was not shared. Your city still works for discovery.');
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoordinates(location.coords);
      setSaved(false);
    } catch (locationError) {
      setError(locationError);
    }
  }

  async function save() {
    try {
      setError(null);
      setSaved(false);
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
      setVerificationReset(result.verificationReset);
    } catch (saveError) {
      setError(saveError);
    }
  }

  const maximumBirthDate = new Date();
  maximumBirthDate.setFullYear(maximumBirthDate.getFullYear() - 18);
  const selectedDate = /^\d{4}-\d{2}-\d{2}$/.test(birthDate)
    ? new Date(`${birthDate}T12:00:00`)
    : new Date(2000, 0, 1);

  return (
    <Page title="Build your dating profile" eyebrow="Profile setup" back>
      <Copy muted>Your birth date and precise location stay private. Education is optional.</Copy>
      {!loaded ? <Loading label="Loading your saved profile" /> : null}
      <Feedback error={questionnaire.error ?? ownProfile.error ?? error} />
      {(questionnaire.isError || ownProfile.isError) ? <Action label="Try loading again" onPress={() => { void questionnaire.refetch(); void ownProfile.refetch(); }} /> : null}

      {loaded ? (
        <>
          <SectionLabel>About you</SectionLabel>
          <Field label="First name" value={name} onChangeText={(value) => { setName(value); setSaved(false); }} />
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Date of birth</Text>
            {Platform.OS === 'web' ? (
              <Field label="Date of birth (YYYY-MM-DD)" value={birthDate} onChangeText={(value) => { setBirthDate(value); setSaved(false); }} placeholder="1998-04-23" />
            ) : (
              <>
                <Pressable accessibilityRole="button" accessibilityLabel="Choose date of birth" onPress={() => setShowDatePicker(true)} style={[styles.dateButton, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <Text style={[TYPOGRAPHY.body, { color: birthDate ? colors.foreground : colors.mutedForeground }]}>{birthDate || 'Choose your birth date'}</Text>
                </Pressable>
                {showDatePicker ? (
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    maximumDate={maximumBirthDate}
                    minimumDate={new Date(maximumBirthDate.getFullYear() - 102, 0, 1)}
                    onChange={(_, date) => {
                      if (Platform.OS !== 'ios') setShowDatePicker(false);
                      if (date) { setBirthDate(date.toISOString().slice(0, 10)); setSaved(false); }
                    }}
                  />
                ) : null}
                {showDatePicker && Platform.OS === 'ios' ? <Action label="Use this birth date" onPress={() => setShowDatePicker(false)} /> : null}
              </>
            )}
          </View>
          <SectionLabel>Your gender</SectionLabel>
          {genders.map(([id, label]) => <Action key={id} label={label} selected={gender === id} onPress={() => { setGender(id); setSaved(false); }} />)}
          <Field label="Introduction" value={bio} onChangeText={(value) => { setBio(value); setSaved(false); }} multiline placeholder="A few details that help someone start a real conversation" />

          <SectionLabel>Who you want to meet</SectionLabel>
          <Copy muted>Select every option that applies.</Copy>
          {interests.map(([id, label]) => (
            <Action key={id} label={label} selected={genderInterests.includes(id)} onPress={() => { setGenderInterests((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]); setSaved(false); }} />
          ))}
          <View style={styles.twoColumns}>
            <View style={styles.column}><Field label="Minimum age" value={minAge} onChangeText={(value) => { setMinAge(value); setSaved(false); }} keyboardType="numeric" /></View>
            <View style={styles.column}><Field label="Maximum age" value={maxAge} onChangeText={(value) => { setMaxAge(value); setSaved(false); }} keyboardType="numeric" /></View>
          </View>
          <Field label="City" value={city} onChangeText={(value) => { setCity(value); setSaved(false); }} />
          <Copy muted>If you do not share location, discovery uses your city. Filters are never widened silently.</Copy>
          <Action label={coordinates ? 'Use city only' : 'Add a distance filter'} onPress={() => coordinates ? setCoordinates(null) : void requestLocation()} />
          {coordinates ? <Field label="Maximum distance in kilometres" value={radius} onChangeText={(value) => { setRadius(value); setSaved(false); }} keyboardType="numeric" /> : null}
          <SectionLabel>Relationship intention</SectionLabel>
          {intentions.map((item) => <Action key={item} label={item} selected={intention === item} onPress={() => { setIntention(item); setSaved(false); }} />)}

          <SectionLabel>Profile photos</SectionLabel>
          <Copy muted>Add up to six recent photos. Changing photos resets face verification for safety.</Copy>
          <View style={styles.photoGrid}>
            {photos.map((uri, index) => (
              <View key={uri} style={styles.photoItem}>
                <Image source={{ uri }} accessibilityLabel={`Profile photo ${index + 1}`} style={styles.photo} />
                <Action label={`Delete photo ${index + 1}`} tone="danger" disabled={busy} onPress={() => { setPhotos((items) => items.filter((item) => item !== uri)); setSaved(false); }} />
              </View>
            ))}
          </View>
          <Action label={isUploading ? 'Uploading photo…' : 'Add a photo'} disabled={busy || photos.length >= 6} onPress={() => { void addPhoto(); }} />

          <SectionLabel>Education (optional)</SectionLabel>
          <Field label="University" value={university} onChangeText={(value) => { setUniversity(value); setSaved(false); }} />
          <Field label="Course" value={course} onChangeText={(value) => { setCourse(value); setSaved(false); }} />
          <Field label="Year of study" value={yearOfStudy} onChangeText={(value) => { setYearOfStudy(value); setSaved(false); }} keyboardType="numeric" />

          {saved ? <Notice tone="success">Profile and preferences saved.</Notice> : null}
          {verificationReset ? <Notice>Because your photos changed, complete face verification again before discovery.</Notice> : null}
          {busy ? <Notice>{isUploading ? 'Uploading your photo…' : 'Saving your profile…'}</Notice> : null}
          <Action label={busy ? 'Saving profile…' : 'Save profile and preferences'} tone="primary" disabled={busy || !valid} onPress={() => { void save(); }} />
          <Action label="Complete face verification" disabled={!saved && !ownProfile.data?.profile} onPress={() => router.push({ pathname: '/verification', params: { returnTo: '/questions' } })} />
          <Action label="Continue to questions" disabled={!saved && !ownProfile.data?.profile} onPress={() => router.push('/questions' as never)} />
        </>
      ) : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  fieldGroup: { gap: SPACING.tight },
  fieldLabel: { ...TYPOGRAPHY.body, fontWeight: '600' },
  dateButton: { minHeight: 52, justifyContent: 'center', borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: SPACING.base },
  twoColumns: { flexDirection: 'row', gap: SPACING.compact },
  column: { flex: 1 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.compact },
  photoItem: { width: '47%', minWidth: 144, gap: SPACING.tight },
  photo: { width: '100%', aspectRatio: 1, borderRadius: RADIUS.md },
});
