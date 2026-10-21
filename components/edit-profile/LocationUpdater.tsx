import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { MapPin } from 'phosphor-react-native';

interface LocationUpdaterProps {
    currentLocation?: string;
    onLocationUpdate: (data: {
        currentLocation: string;
        locationLatitude: string;
        locationLongitude: string;
        locationPermissionStatus: 'granted' | 'denied' | 'undetermined' | 'unknown';
    }) => void;
    colors: {
        foreground: string;
        muted: string;
        mutedForeground: string;
        primary: string;
    };
    isDark: boolean;
}

function formatLocationLabel(placemark?: Location.LocationGeocodedAddress | null) {
    if (!placemark) return '';

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
}

export function LocationUpdater({
    currentLocation,
    onLocationUpdate,
    colors,
    isDark,
}: LocationUpdaterProps) {
    const [isRequesting, setIsRequesting] = useState(false);
    const [error, setError] = useState('');

    const handleUpdateLocation = async () => {
        setIsRequesting(true);
        setError('');

        try {
            const permission = await Location.requestForegroundPermissionsAsync();

            if (permission.status !== 'granted') {
                onLocationUpdate({
                    currentLocation: '',
                    locationLatitude: '',
                    locationLongitude: '',
                    locationPermissionStatus: permission.status,
                });
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                setError('Location access was denied. Enable it in settings to update your location.');
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
                `${currentPosition.coords.latitude.toFixed(4)}, ${currentPosition.coords.longitude.toFixed(4)}`;

            onLocationUpdate({
                currentLocation: readableLocation,
                locationLatitude: String(currentPosition.coords.latitude),
                locationLongitude: String(currentPosition.coords.longitude),
                locationPermissionStatus: 'granted',
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {
            setError('We could not fetch your location right now. Please try again.');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setIsRequesting(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Location</Text>
            <View
                style={[
                    styles.locationBox,
                    {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                    },
                ]}
            >
                <MapPin size={18} color={colors.primary} />
                <Text style={[styles.locationText, { color: currentLocation ? colors.foreground : colors.muted }]}>
                    {currentLocation || 'No location set'}
                </Text>
            </View>
            <TouchableOpacity
                onPress={handleUpdateLocation}
                disabled={isRequesting}
                style={[styles.button, { backgroundColor: colors.primary }]}
                activeOpacity={0.8}
            >
                {isRequesting ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.buttonText}>Update location</Text>
                )}
            </TouchableOpacity>
            {!!error && <Text style={styles.error}>{error}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 12,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 6,
    },
    locationBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 10,
    },
    locationText: {
        flex: 1,
        fontSize: 15,
    },
    button: {
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    error: {
        marginTop: 8,
        fontSize: 12,
        color: '#ef4444',
    },
});
