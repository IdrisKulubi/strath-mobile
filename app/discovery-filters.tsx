import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';

import {
  OnboardingChoiceRow,
  RisingAgeRangeSlider,
  RisingDistanceSlider,
  RisingInlineFeedback,
  RisingTextField,
} from '@/components/onboarding';
import { StickyFooter } from '@/components/questionnaire/sticky-footer';
import { Action, Copy, Feedback, Loading, Notice, Page, SectionLabel } from '@/components/questionnaire/ui';
import { useTheme } from '@/hooks/use-theme';
import { SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { formatCityFromPlacemark } from '@/lib/location-format';
import { ageRangeError, radiusError } from '@/lib/onboarding-input-validation';
import { useQuestionnaire, useQuestionnaireMutation, type Preferences, type QuestionnaireState } from '@/lib/questionnaire';

const genderOptions = [['male', 'Men'], ['female', 'Women'], ['other', 'Non-binary or other identities']] as const;
const intentionOptions = ['Long-term relationship', 'Dating and exploring', 'Something casual', 'Still figuring it out'];

export default function DiscoveryFiltersScreen() {
  const status = useQuestionnaire<QuestionnaireState>('status');

  if (status.isPending) {
    return (
      <Page title="Discovery filters" eyebrow="Reciprocal preferences" back>
        <Loading label="Loading your filters" />
      </Page>
    );
  }

  if (status.isError) {
    return (
      <Page title="Discovery filters" eyebrow="Reciprocal preferences" back>
        <Feedback error={status.error} />
        <Action label="Try loading again" tone="primary" onPress={() => { void status.refetch(); }} />
      </Page>
    );
  }

  if (!status.data?.preferences || !status.data.birthDate) {
    return (
      <Page title="Discovery filters" eyebrow="Reciprocal preferences" back>
        <Copy muted>Someone appears only when both of you fit each other’s filters. Strathspace never silently widens them.</Copy>
        <Notice>Complete your profile setup before editing discovery filters.</Notice>
      </Page>
    );
  }

  return (
    <FilterForm
      key={status.data.revision}
      preferences={status.data.preferences}
      birthDate={status.data.birthDate}
    />
  );
}

function FilterForm({ preferences, birthDate }: { preferences: Preferences; birthDate: string }) {
  const { colors } = useTheme();
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
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const usesDistance = latitude !== null && longitude !== null;
  const ageError = ageRangeError(minAge, maxAge);
  const distanceError = usesDistance ? radiusError(radius) : null;
  const valid = genders.length > 0
    && intentions.length > 0
    && city.trim().length > 0
    && !ageError
    && !distanceError;

  async function requestCurrentLocation() {
    setLocationLoading(true);
    setLocationError(null);
    try {
      setLocalError(null);
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setLocationError('Location was not shared. Continue with your city instead.');
        return;
      }
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const reverseResults = await Location.reverseGeocodeAsync({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      });
      const resolvedCity = formatCityFromPlacemark(reverseResults[0]);
      setLatitude(current.coords.latitude);
      setLongitude(current.coords.longitude);
      if (resolvedCity) setCity(resolvedCity);
      if (!radius.trim()) setRadius('25');
    } catch {
      setLocationError('We could not fetch your location right now. Try again or use city only.');
    } finally {
      setLocationLoading(false);
    }
  }

  async function saveFilters() {
    try {
      setLocalError(null);
      setSaveSuccess(false);
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
      setSaveSuccess(true);
    } catch (error) {
      setSaveSuccess(false);
      setLocalError(error);
    }
  }

  const submissionError = localError
    ? localError instanceof Error ? localError.message : 'Something went wrong. Please try again.'
    : save.error
      ? save.error instanceof Error ? save.error.message : 'Could not save filters.'
      : null;

  const footer = (
    <StickyFooter
      floating
      primaryGlass
      primaryLabel={save.isPending ? 'Saving filters…' : 'Save filters'}
      onPrimaryPress={() => { void saveFilters(); }}
      primaryDisabled={!valid || save.isPending}
      primaryLoading={save.isPending}
    />
  );

  return (
    <Page
      title="Discovery filters"
      eyebrow="Reciprocal preferences"
      back
      footer={footer}
      floatingFooter
      footerButtonCount={1}
    >
      <Copy muted>Someone appears only when both of you fit each other’s filters. Strathspace never silently widens them.</Copy>

      <View style={styles.section}>
        <SectionLabel>Who you want to meet</SectionLabel>
        {genderOptions.map(([id, label]) => (
          <OnboardingChoiceRow
            key={id}
            appearance="rising"
            selectionMode="multiple"
            option={{ value: id, label }}
            selected={genders.includes(id)}
            onPress={() => {
              setSaveSuccess(false);
              setGenders((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);
            }}
          />
        ))}
      </View>

      <View style={styles.section}>
        <SectionLabel>Age range</SectionLabel>
        <RisingAgeRangeSlider
          minAge={minAge}
          maxAge={maxAge}
          onChange={(min, max) => {
            setSaveSuccess(false);
            setMinAge(min);
            setMaxAge(max);
          }}
          error={ageError ?? undefined}
        />
      </View>

      <View style={styles.section}>
        <SectionLabel>Location</SectionLabel>
        <OnboardingChoiceRow
          appearance="rising"
          option={{ value: 'city', label: 'Use my city only', description: 'Match people in the same city' }}
          selected={!usesDistance}
          onPress={() => {
            setSaveSuccess(false);
            setLatitude(null);
            setLongitude(null);
            setLocationError(null);
          }}
        />
        <OnboardingChoiceRow
          appearance="rising"
          option={{
            value: 'distance',
            label: locationLoading ? 'Finding your location…' : 'Use my current location',
            description: 'Add a distance limit for discovery',
          }}
          selected={usesDistance}
          onPress={() => { void requestCurrentLocation(); }}
        />
        <RisingTextField
          label="City"
          value={city}
          onChangeText={(value) => {
            setSaveSuccess(false);
            setCity(value);
            if (usesDistance) {
              setLatitude(null);
              setLongitude(null);
            }
          }}
          autoCapitalize="words"
          placeholder="e.g. Nairobi"
        />
        {usesDistance ? (
          <RisingDistanceSlider
            radiusKm={radius}
            onChange={(value) => {
              setSaveSuccess(false);
              setRadius(value);
            }}
            error={distanceError ?? undefined}
          />
        ) : null}
        {locationError ? <RisingInlineFeedback tone="error" message={locationError} /> : null}
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          City mode requires the same city in both directions. Distance mode requires both people to be inside each other’s radius.
        </Text>
      </View>

      <View style={styles.section}>
        <SectionLabel>Relationship intentions</SectionLabel>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Select every intention that works for you. At least one must overlap.
        </Text>
        {intentionOptions.map((intention) => (
          <OnboardingChoiceRow
            key={intention}
            appearance="rising"
            selectionMode="multiple"
            option={{ value: intention, label: intention }}
            selected={intentions.includes(intention)}
            onPress={() => {
              setSaveSuccess(false);
              setIntentions((items) => items.includes(intention) ? items.filter((item) => item !== intention) : [...items, intention]);
            }}
          />
        ))}
      </View>

      {saveSuccess ? (
        <RisingInlineFeedback message="Filters saved. Discovery will recalculate compatible people." />
      ) : null}
      {submissionError ? <RisingInlineFeedback tone="error" message={submissionError} /> : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  section: { gap: SPACING.compact },
  hint: { ...TYPOGRAPHY.caption, textAlign: 'center' },
});
