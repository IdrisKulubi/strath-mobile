const fs = require('fs');
const { getCountries, getCountryCallingCode } = require('libphonenumber-js');

const names = new Intl.DisplayNames(['en'], { type: 'region' });
const data = getCountries()
    .map((code) => ({
        code,
        callingCode: getCountryCallingCode(code),
        name: names.of(code) || code,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));

const output = `import type { CountryCode } from 'libphonenumber-js';

export interface StaticCountryOption {
    code: CountryCode;
    callingCode: string;
    name: string;
}

export const PHONE_COUNTRIES: StaticCountryOption[] = ${JSON.stringify(data, null, 4)};
`;

fs.writeFileSync('lib/phone-countries-data.ts', output);
