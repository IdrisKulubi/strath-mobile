import React, { useMemo, useState } from 'react';
import {
    Modal,
    View,
    StyleSheet,
    Pressable,
    TextInput,
    FlatList,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CountryCode } from 'libphonenumber-js';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { countryCodeToEmoji } from '@/lib/country-flag';
import { PHONE_COUNTRIES } from '@/lib/phone-countries-data';
import { useOnboardingTheme } from '@/lib/onboarding-theme';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import type { PhoneCountrySelection } from '@/lib/phone-country';

interface CountryOption {
    countryCode: CountryCode;
    callingCode: string;
    name: string;
    flag: string;
}

interface PhoneCountryPickerModalProps {
    visible: boolean;
    selectedCountryCode: CountryCode;
    onClose: () => void;
    onSelect: (country: PhoneCountrySelection) => void;
}

const PRIORITY_COUNTRIES: CountryCode[] = ['KE', 'UG', 'TZ', 'RW', 'ET', 'GB', 'US'];

const ALL_COUNTRIES: CountryOption[] = PHONE_COUNTRIES.map((country) => ({
    countryCode: country.code,
    callingCode: country.callingCode,
    name: country.name,
    flag: countryCodeToEmoji(country.code),
}));

function getSortedCountries(query: string): CountryOption[] {
    const normalizedQuery = query.trim().toLowerCase();
    const prioritySet = new Set(PRIORITY_COUNTRIES);

    const filtered = normalizedQuery
        ? ALL_COUNTRIES.filter((country) => {
              const haystack = `${country.name} ${country.countryCode} +${country.callingCode}`.toLowerCase();
              return haystack.includes(normalizedQuery);
          })
        : ALL_COUNTRIES;

    const priority = PRIORITY_COUNTRIES
        .map((code) => filtered.find((country) => country.countryCode === code))
        .filter((country): country is CountryOption => Boolean(country));

    const remainder = filtered.filter((country) => !prioritySet.has(country.countryCode));

    return [...priority, ...remainder];
}

export function PhoneCountryPickerModal({
    visible,
    selectedCountryCode,
    onClose,
    onSelect,
}: PhoneCountryPickerModalProps) {
    const theme = useOnboardingTheme();
    const insets = useSafeAreaInsets();
    const [query, setQuery] = useState('');

    const countries = useMemo(
        () => (visible ? getSortedCountries(query) : []),
        [query, visible],
    );

    const handleSelect = (country: CountryOption) => {
        onSelect({
            countryCode: country.countryCode,
            callingCode: country.callingCode,
        });
        setQuery('');
    };

    const handleClose = () => {
        setQuery('');
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
            onRequestClose={handleClose}
        >
            <View
                style={[
                    styles.container,
                    {
                        backgroundColor: theme.background,
                        paddingTop: Math.max(insets.top, SPACING.base),
                        paddingBottom: Math.max(insets.bottom, SPACING.base),
                    },
                ]}
            >
                <View style={styles.header}>
                    <Text style={[styles.title, { color: theme.foreground }]}>Select country</Text>
                    <Pressable
                        onPress={handleClose}
                        accessibilityRole="button"
                        accessibilityLabel="Close country picker"
                        style={({ pressed }) => [
                            styles.closeButton,
                            {
                                backgroundColor: theme.surfaceMuted,
                                borderColor: theme.border,
                                opacity: pressed ? 0.88 : 1,
                            },
                        ]}
                    >
                        <Ionicons name="close" size={20} color={theme.foreground} />
                    </Pressable>
                </View>

                <View
                    style={[
                        styles.searchRow,
                        {
                            backgroundColor: theme.surface,
                            borderColor: theme.border,
                        },
                    ]}
                >
                    <Ionicons name="search" size={18} color={theme.mutedForeground} />
                    <TextInput
                        value={query}
                        onChangeText={setQuery}
                        placeholder="Search country or code"
                        placeholderTextColor={theme.mutedForeground}
                        autoCorrect={false}
                        autoCapitalize="none"
                        style={[styles.searchInput, { color: theme.foreground }]}
                        accessibilityLabel="Search countries"
                    />
                </View>

                <FlatList
                    data={countries}
                    keyExtractor={(item) => item.countryCode}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => {
                        const isSelected = item.countryCode === selectedCountryCode;

                        return (
                            <Pressable
                                onPress={() => handleSelect(item)}
                                accessibilityRole="button"
                                accessibilityState={{ selected: isSelected }}
                                accessibilityLabel={`${item.name}, plus ${item.callingCode}`}
                                style={({ pressed }) => [
                                    styles.countryRow,
                                    {
                                        backgroundColor: isSelected ? theme.primarySoft : theme.surface,
                                        borderColor: isSelected ? theme.primary : theme.border,
                                        opacity: pressed ? 0.9 : 1,
                                    },
                                ]}
                            >
                                <Text style={styles.flag}>{item.flag}</Text>
                                <View style={styles.countryCopy}>
                                    <Text style={[styles.countryName, { color: theme.foreground }]}>
                                        {item.name}
                                    </Text>
                                    <Text style={[styles.callingCode, { color: theme.mutedForeground }]}>
                                        +{item.callingCode}
                                    </Text>
                                </View>
                                {isSelected ? (
                                    <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                                ) : null}
                            </Pressable>
                        );
                    }}
                />
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: SPACING.screenX,
        gap: SPACING.base,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    title: {
        ...TYPOGRAPHY.title,
    },
    closeButton: {
        width: 44,
        height: 44,
        borderRadius: RADIUS.full,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: StyleSheet.hairlineWidth,
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.tight,
        borderRadius: RADIUS.lg,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: SPACING.compact,
        minHeight: 48,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        paddingVertical: SPACING.tight,
    },
    listContent: {
        gap: SPACING.tight,
        paddingBottom: SPACING.section,
    },
    countryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.compact,
        borderRadius: RADIUS.lg,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: SPACING.compact,
        paddingVertical: SPACING.compact,
        minHeight: 56,
    },
    flag: {
        fontSize: 24,
        width: 32,
        textAlign: 'center',
    },
    countryCopy: {
        flex: 1,
        gap: 2,
    },
    countryName: {
        ...TYPOGRAPHY.body,
        fontWeight: '600',
    },
    callingCode: {
        ...TYPOGRAPHY.caption,
    },
});
