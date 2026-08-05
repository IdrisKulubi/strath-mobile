import { AsYouType, parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';

export const DEFAULT_PHONE_COUNTRY: CountryCode = 'KE';
export const DEFAULT_CALLING_CODE = '254';

export interface PhoneCountrySelection {
    countryCode: CountryCode;
    callingCode: string;
}

export const DEFAULT_PHONE_COUNTRY_SELECTION: PhoneCountrySelection = {
    countryCode: DEFAULT_PHONE_COUNTRY,
    callingCode: DEFAULT_CALLING_CODE,
};

export function derivePhoneStateFromE164(e164: string): {
    country: PhoneCountrySelection;
    nationalNumber: string;
} {
    const trimmed = e164.trim();
    if (!trimmed) {
        return {
            country: DEFAULT_PHONE_COUNTRY_SELECTION,
            nationalNumber: '',
        };
    }

    const parsed = parsePhoneNumberFromString(trimmed);
    if (parsed?.country) {
        return {
            country: {
                countryCode: parsed.country,
                callingCode: parsed.countryCallingCode,
            },
            nationalNumber: parsed.formatNational(),
        };
    }

    return {
        country: DEFAULT_PHONE_COUNTRY_SELECTION,
        nationalNumber: '',
    };
}

export function formatNationalNumberInput(
    nationalDigits: string,
    countryCode: CountryCode,
): string {
    if (!nationalDigits) {
        return '';
    }

    return new AsYouType(countryCode).input(nationalDigits);
}

export function parseNationalPhoneNumber(
    nationalInput: string,
    country: PhoneCountrySelection,
) {
    const digits = nationalInput.replace(/\D/g, '');
    if (!digits) {
        return null;
    }

    const parsed = parsePhoneNumberFromString(digits, country.countryCode);
    if (!parsed?.isValid()) {
        return null;
    }

    return parsed;
}

export function getCallingCodeDisplay(callingCode: string): string {
    return `+${callingCode.replace(/\D/g, '')}`;
}
