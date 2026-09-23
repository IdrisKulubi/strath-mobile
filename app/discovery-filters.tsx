import React, { useState } from 'react';
import { View } from 'react-native';
import * as Location from 'expo-location';

import { Action, Copy, Feedback, Field, Loading, Notice, Page, SectionLabel } from '@/components/questionnaire/ui';
import { SPACING } from '@/lib/design-tokens';
import { useQuestionnaire, useQuestionnaireMutation, type Preferences, type QuestionnaireState } from '@/lib/questionnaire';

const genderOptions = [['male', 'Men'], ['female', 'Women'], ['other', 'Non-binary or other identities']] as const;
const intentionOptions = ['Long-term relationship', 'Dating and exploring', 'Something casual', 'Still figuring it out'];

export default function DiscoveryFiltersScreen() {
  const status = useQuestionnaire<QuestionnaireState>('status');
  return (
    <Page title="Discovery filters" eyebrow="Reciprocal preferences" back>
      <Copy muted>Someone appears only when both of you fit each other’s filters. Strathspace never silently widens them.</Copy>
      {status.isPending ? <Loading label="Loading your filters" /> : null}
      <Feedback error={status.error} />
      {status.isError ? <Action label="Try loading again" tone="primary" onPress={() => { void status.refetch(); }} /> : null}
      {status.data?.preferences && status.data.birthDate ? (
        <FilterForm key={status.data.revision} preferences={status.data.preferences} birthDate={status.data.birthDate} />
      ) : status.data ? (
        <Notice>Complete your profile setup before editing discovery filters.</Notice>
      ) : null}
    </Page>
  );
}

function FilterForm({ preferences, birthDate }: { preferences: Preferences; birthDate: string }) {
  const save = useQuestionnaireMutation<{ saved: true; revision: number }>('preferences', 'PUT');
  const [genders, setGenders] = useState(preferences.genders);
  const [minAge, setMinAge] = useState(String(preferences.minAge));
  const [maxAge, setMaxAge] = useState(String(preferences.maxAge));
  const [city, setCity] = useState(preferences.city);
  const [radius, setRadius] = useState(String(preferences.radiusKm ?? 25));
  const [latitude, setLatitude] = useState(preferences.latitude);
  const [longitude, setLongitude] = useState(preferences.longitude);
  const [intentions, setIntentions] = useState(preferences.intentions);
  const [localError, setLocalError] = useState<unknown>(null);

  const usesDistance = latitude !== null && longitude !== null;
  const valid = genders.length > 0
    && intentions.length > 0
    && city.trim().length > 0
    && Number(minAge) >= 18
    && Number(maxAge) >= Number(minAge)
    && (!usesDistance || (Number(radius) >= 1 && Number(radius) <= 500));

  async function requestCurrentLocation() {
    try {
      setLocalError(null);
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error('Location was not shared. Continue with your city instead.');
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLatitude(current.coords.latitude);
      setLongitude(current.coords.longitude);
    } catch (error) {
      setLocalError(error);
    }
  }

  async function saveFilters() {
    try {
      setLocalError(null);
      await save.mutateAsync({
        birthDate,
        genders,
        minAge: Number(minAge),
        maxAge: Number(maxAge),
        city: city.trim(),
        radiusKm: usesDistance ? Number(radius) : null,
        latitude,
        longitude,
        intentions,
      });
    } catch (error) {
      setLocalError(error);
    }
  }

  return (
    <View style={{ gap: SPACING.base }}>
      <SectionLabel>Who you want to meet</SectionLabel>
      {genderOptions.map(([id, label]) => (
        <Action key={id} label={label} selected={genders.includes(id)} onPress={() => {
          setGenders((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);
        }} />
      ))}
      <View style={{ flexDirection: 'row', gap: SPACING.compact }}>
        <View style={{ flex: 1 }}><Field label="Minimum age" value={minAge} keyboardType="numeric" onChangeText={setMinAge} /></View>
        <View style={{ flex: 1 }}><Field label="Maximum age" value={maxAge} keyboardType="numeric" onChangeText={setMaxAge} /></View>
      </View>

      <SectionLabel>Location</SectionLabel>
      <Field label="City" value={city} onChangeText={setCity} />
      <Copy muted>City mode requires the same city in both directions. Distance mode requires both people to be inside each other’s radius.</Copy>
      <Action label={usesDistance ? 'Use city only' : 'Use current location and distance'} onPress={() => {
        if (usesDistance) { setLatitude(null); setLongitude(null); }
        else void requestCurrentLocation();
      }} />
      {usesDistance ? <Field label="Maximum distance in kilometres" value={radius} keyboardType="numeric" onChangeText={setRadius} /> : null}

      <SectionLabel>Relationship intentions</SectionLabel>
      <Copy muted>Select every intention that works for you. At least one must overlap.</Copy>
      {intentionOptions.map((intention) => (
        <Action key={intention} label={intention} selected={intentions.includes(intention)} onPress={() => {
          setIntentions((items) => items.includes(intention) ? items.filter((item) => item !== intention) : [...items, intention]);
        }} />
      ))}

      <Feedback error={localError ?? save.error} />
      {save.isSuccess ? <Notice tone="success">Filters saved. Discovery will recalculate compatible people.</Notice> : null}
      <Action label={save.isPending ? 'Saving filters…' : 'Save filters'} tone="primary" disabled={!valid || save.isPending} onPress={() => { void saveFilters(); }} />
    </View>
  );
}
