import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';

import { Text } from '@/components/ui/text';
import {
    campusBasicsStepLabel,
    YEAR_OF_STUDY_OPTIONS,
} from '@/constants/onboarding';
import { INTEREST_MAX_SELECTION, INTEREST_MIN_SELECTION, INTEREST_OPTIONS } from '@/constants/interest-options';
import { Palette, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { useOnboardingTheme, withOnboardingAlpha } from '@/lib/onboarding-theme';


import { OnboardingChip } from './onboarding-chip';
import { OnboardingChoiceRow } from './onboarding-choice-row';
import { OnboardingPrimaryButton } from './onboarding-primary-button';
import { OnboardingScreenShell } from './onboarding-screen-shell';

interface CampusBasicsData {
    yearOfStudy: string;
    interests: string[];
    currentLocation: string;
    locationLatitude: string;
    locationLongitude: string;
    locationPermissionStatus: 'granted' | 'denied' | 'undetermined' | 'unknown';
}

interface CampusBasicsStepProps {
    globalStepIndex: number;
    data: CampusBasicsData;
    onUpdate: (updates: Partial<CampusBasicsData>) => void;
    onComplete: () => void;
    onBackToCoreProfile: () => void;
}

const formatLocationLabel = (placemark?: Location.LocationGeocodedAddress | null) => {
    if (!placemark) {
        return '';
    }

    const parts = [
        placemark.name,
        placemark.street,
        placemark.district,
        placemark.city,
        placemark.region,
        placemark.country,
    ]
        .map((value) => value?.trim())
        .filter((value, index, array): value is string => Boolean(value) && array.indexOf(value) === index);

    return parts.join(', ');
};

export function CampusBasicsStep({
    globalStepIndex,
    data,
    onUpdate,
    onComplete,
    onBackToCoreProfile,
}: CampusBasicsStepProps) {
    const theme = useOnboardingTheme();
    const [subStep, setSubStep] = useState(0);
    const [isRequestingLocation, setIsRequestingLocation] = useState(false);
    const [locationError, setLocationError] = useState('');

    const selectedCount = data.interests.length;
    const hasEnoughInterests = selectedCount >= INTEREST_MIN_SELECTION;
    const errorColor = theme.isDark ? Palette.dark.destructive : Palette.light.destructive;

    const handleBack = () => {
        if (subStep === 0) {
            onBackToCoreProfile();
            return;
        }

        setSubStep((current) => current - 1);
    };

    const handleYearSelect = (yearOfStudy: string) => {
        onUpdate({ yearOfStudy });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setTimeout(() => setSubStep(1), 220);
    };

    const toggleInterest = (label: string) => {
        const isSelected = data.interests.includes(label);

        if (isSelected) {
            onUpdate({ interests: data.interests.filter((interest) => interest !== label) });
            return;
        }

        if (data.interests.length >= INTEREST_MAX_SELECTION) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }

        onUpdate({ interests: [...data.interests, label] });
    };

    const handleInterestsContinue = () => {
        if (!hasEnoughInterests) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSubStep(2);
    };

    const handleLocationPermission = async () => {
        setIsRequestingLocation(true);
        setLocationError('');

        try {
            const permission = await Location.requestForegroundPermissionsAsync();

            if (permission.status !== 'granted') {
                onUpdate({
                    currentLocation: '',
                    locationLatitude: '',
                    locationLongitude: '',
                    locationPermissionStatus: permission.status,
                });
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                setLocationError('Location access was skipped. You can add it later from your profile.');
                return;
            }

            const currentPosition = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });
            const reverseResults = await Location.reverseGeocodeAsync({
                latitude: currentPosition.coords.latitude,
                longitude: currentPosition.coords.longitude,
            });

            const readableLocation =
                formatLocationLabel(reverseResults[0]) ||
                `${currentPosition.coords.latitude.toFixed(5)}, ${currentPosition.coords.longitude.toFixed(5)}`;

            onUpdate({
                currentLocation: readableLocation,
                locationLatitude: String(currentPosition.coords.latitude),
                locationLongitude: String(currentPosition.coords.longitude),
                locationPermissionStatus: permission.status,
            });

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setTimeout(onComplete, 220);
        } catch (error) {
            console.error('[CampusBasicsStep] Failed to capture location:', error);
            onUpdate({
                currentLocation: '',
                locationLatitude: '',
                locationLongitude: '',
                locationPermissionStatus: 'denied',
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setLocationError('We could not fetch your location right now. You can continue and update it later.');
        } finally {
            setIsRequestingLocation(false);
        }
    };

    const handleSkipLocation = () => {
        onUpdate({
            currentLocation: '',
            locationLatitude: '',
            locationLongitude: '',
            locationPermissionStatus:
                data.locationPermissionStatus === 'granted' ? 'granted' : 'denied',
        });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onComplete();
    };

    const stepCopy = useMemo(() => {
        switch (subStep) {
            case 0:
                return {
                    title: 'What year are you in?',
                    subtitle: 'Helps us surface people at a similar stage on campus.',
                };
            case 1:
                return {
                    title: 'Pick your interests',
                    subtitle: `Choose ${INTEREST_MIN_SELECTION} to ${INTEREST_MAX_SELECTION} things you genuinely enjoy.`,
                };
            default:
                return {
                    title: 'Share your location?',
                    subtitle: 'Optional. We use it to show nearby context and better matches.',
                };
        }
    }, [subStep]);

    return (
        <OnboardingScreenShell
            stepIndex={globalStepIndex}
            stepLabel={campusBasicsStepLabel(subStep)}
            onBack={handleBack}
            title={stepCopy.title}
            subtitle={stepCopy.subtitle}
            scrollable
            footer={
                subStep === 1 ? (
                    <OnboardingPrimaryButton
                        label="Continue"
                        onPress={handleInterestsContinue}
                        disabled={!hasEnoughInterests}
                    />
                ) : subStep === 2 ? (
                    <View style={styles.locationFooter}>
                        <OnboardingPrimaryButton
                            label={isRequestingLocation ? 'Getting location...' : 'Allow location access'}
                            onPress={handleLocationPermission}
                            disabled={isRequestingLocation}
                            icon="location-outline"
                        />
                        <Pressable
                            onPress={handleSkipLocation}
                            disabled={isRequestingLocation}
                            accessibilityRole="button"
                            accessibilityLabel="Continue without location"
                            style={styles.skipButton}
                        >
                            <Text style={[styles.skipText, { color: theme.mutedForeground }]}>
                                Continue without location
                            </Text>
                        </Pressable>
                    </View>
                ) : null
            }
        >
            {subStep === 0 ? (
                <View style={styles.choiceList}>
                    {YEAR_OF_STUDY_OPTIONS.map((option) => (
                        <OnboardingChoiceRow
                            key={option.value}
                            option={option}
                            selected={data.yearOfStudy === option.value}
                            onPress={handleYearSelect}
                        />
                    ))}
                </View>
            ) : null}

            {subStep === 1 ? (
                <View style={styles.interestSection}>
                    <View
                        style={[
                            styles.selectionStatus,
                            {
                                backgroundColor: withOnboardingAlpha(
                                    theme.primary,
                                    theme.isDark ? 0.16 : 0.07,
                                ),
                            },
                        ]}
                    >
                        <View style={styles.selectionCopy}>
                            <Text style={[styles.selectionTitle, { color: theme.foreground }]}>
                                {hasEnoughInterests
                                    ? `${selectedCount} selected`
                                    : `Pick ${INTEREST_MIN_SELECTION - selectedCount} more`}
                            </Text>
                            <Text style={[styles.selectionHint, { color: theme.mutedForeground }]}>
                                {selectedCount >= INTEREST_MAX_SELECTION
                                    ? 'Maximum reached — deselect one to change it'
                                    : `Up to ${INTEREST_MAX_SELECTION} interests`}
                            </Text>
                        </View>
                        <View style={[styles.selectionCount, { backgroundColor: theme.primary }]}>
                            <Text
                                style={[
                                    styles.selectionCountText,
                                    { color: theme.primaryForeground },
                                ]}
                            >
                                {selectedCount}/{INTEREST_MAX_SELECTION}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.interestGrid}>
                        {INTEREST_OPTIONS.map((interest) => (
                            <OnboardingChip
                                key={interest.id}
                                label={interest.label}
                                emoji={interest.emoji}
                                selected={data.interests.includes(interest.label)}
                                onPress={() => toggleInterest(interest.label)}
                                disabled={
                                    selectedCount >= INTEREST_MAX_SELECTION &&
                                    !data.interests.includes(interest.label)
                                }
                            />
                        ))}
                    </View>
                </View>
            ) : null}

            {subStep === 2 ? (
                <View style={styles.locationSection}>
                    <View
                        style={[
                            styles.locationCard,
                            {
                                backgroundColor: theme.surface,
                                borderColor: theme.border,
                            },
                        ]}
                    >
                        <View
                            style={[
                                styles.locationIconWrap,
                                {
                                    backgroundColor: withOnboardingAlpha(
                                        theme.primary,
                                        theme.isDark ? 0.18 : 0.1,
                                    ),
                                },
                            ]}
                        >
                            <Ionicons name="location-outline" size={22} color={theme.primary} />
                        </View>
                        <Text style={[styles.locationTitle, { color: theme.foreground }]}>
                            Better matches nearby
                        </Text>
                        <Text style={[styles.locationBody, { color: theme.mutedForeground }]}>
                            We only use your area to improve context. You can skip and update this later.
                        </Text>
                        {data.currentLocation ? (
                            <Text style={[styles.locationPreview, { color: theme.primary }]}>
                                {data.currentLocation}
                            </Text>
                        ) : null}
                    </View>

                    {locationError ? (
                        <Text style={[styles.errorText, { color: errorColor }]}>{locationError}</Text>
                    ) : null}

                    {isRequestingLocation ? (
                        <ActivityIndicator color={theme.primary} style={styles.loader} />
                    ) : null}
                </View>
            ) : null}
        </OnboardingScreenShell>
    );
}

const styles = StyleSheet.create({
    choiceList: {
        gap: SPACING.compact,
        paddingBottom: SPACING.base,
    },
    interestSection: {
        gap: SPACING.compact,
    },
    selectionStatus: {
        minHeight: 64,
        borderRadius: RADIUS.lg,
        paddingHorizontal: SPACING.compact,
        paddingVertical: SPACING.tight,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.compact,
    },
    selectionCopy: {
        flex: 1,
        gap: 2,
    },
    selectionTitle: {
        ...TYPOGRAPHY.callout,
        fontWeight: '700',
    },
    selectionHint: {
        ...TYPOGRAPHY.caption,
    },
    selectionCount: {
        minWidth: 48,
        height: 32,
        borderRadius: RADIUS.full,
        paddingHorizontal: SPACING.tight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectionCountText: {
        ...TYPOGRAPHY.caption,
        fontWeight: '700',
    },
    interestGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: SPACING.compact,
    },
    locationSection: {
        gap: SPACING.compact,
    },
    locationCard: {
        borderRadius: RADIUS.lg,
        borderWidth: StyleSheet.hairlineWidth,
        padding: SPACING.base,
        gap: SPACING.tight,
        alignItems: 'flex-start',
    },
    locationIconWrap: {
        width: 44,
        height: 44,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    locationTitle: {
        ...TYPOGRAPHY.headline,
    },
    locationBody: {
        ...TYPOGRAPHY.callout,
    },
    locationPreview: {
        ...TYPOGRAPHY.caption,
        fontWeight: '600',
        marginTop: SPACING.tight,
    },
    errorText: {
        ...TYPOGRAPHY.caption,
        fontWeight: '600',
        textAlign: 'center',
    },
    loader: {
        alignSelf: 'center',
        marginTop: SPACING.tight,
    },
    locationFooter: {
        gap: SPACING.tight,
    },
    skipButton: {
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    skipText: {
        ...TYPOGRAPHY.callout,
        fontWeight: '600',
    },
});
