import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { AsYouType, parsePhoneNumberFromString } from 'libphonenumber-js';

interface PhoneNumberInputProps {
    value?: string;
    onChange: (e164: string) => void;
    colors: {
        foreground: string;
        muted: string;
        mutedForeground: string;
    };
    isDark: boolean;
}

function formatPhoneDisplay(e164?: string) {
    if (!e164) return '';
    const parsed = parsePhoneNumberFromString(e164);
    if (!parsed) return e164;
    const formatter = e164.startsWith('+254') || !e164.startsWith('+')
        ? new AsYouType('KE')
        : new AsYouType();
    return formatter.input(parsed.formatInternational());
}

export function PhoneNumberInput({ value, onChange, colors, isDark }: PhoneNumberInputProps) {
    const [display, setDisplay] = useState(() => formatPhoneDisplay(value));
    const [error, setError] = useState('');

    useEffect(() => {
        setDisplay(formatPhoneDisplay(value));
    }, [value]);

    const parsePhone = (text: string) => {
        const trimmed = text.trim();
        if (!trimmed) return null;
        return trimmed.startsWith('+')
            ? parsePhoneNumberFromString(trimmed)
            : parsePhoneNumberFromString(trimmed, 'KE');
    };

    const handleChange = (text: string) => {
        const hasPlusPrefix = text.trim().startsWith('+');
        const digits = text.replace(/\D/g, '');
        const normalizedInput = hasPlusPrefix ? `+${digits}` : digits;
        const formatter = hasPlusPrefix ? new AsYouType() : new AsYouType('KE');
        const formatted = formatter.input(normalizedInput);
        setDisplay(formatted);

        const parsed = parsePhone(formatted);
        if (parsed?.isValid()) {
            onChange(parsed.number);
            setError('');
        } else if (formatted.trim()) {
            setError('Enter a valid phone number with country code (or local Kenyan number).');
        } else {
            onChange('');
            setError('');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Phone Number</Text>
            <TextInput
                style={[
                    styles.input,
                    {
                        color: colors.foreground,
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                    },
                ]}
                value={display}
                onChangeText={handleChange}
                placeholder="+254 7XX XXX XXX"
                placeholderTextColor={colors.muted}
                keyboardType="phone-pad"
            />
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
    input: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 16,
    },
    error: {
        marginTop: 6,
        fontSize: 12,
        color: '#ef4444',
    },
});
