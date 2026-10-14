/** Mirrors the questionnaire API's UTC date parsing and adult eligibility check. */
export function ageFromBirthDate(value: string, now = new Date()): number | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(`${value}T00:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
    return now.getUTCFullYear() - date.getUTCFullYear() - Number(
        now.getUTCMonth() < date.getUTCMonth()
        || (now.getUTCMonth() === date.getUTCMonth() && now.getUTCDate() < date.getUTCDate()),
    );
}

export function birthDateError(value: string, now = new Date()): string | null {
    const age = ageFromBirthDate(value, now);
    if (age === null) return 'Choose a valid birth date.';
    if (age < 18) return 'You must be at least 18 to use StrathSpace.';
    if (age > 120) return 'Choose a valid birth date.';
    return null;
}

export function ageRangeError(minimum: string, maximum: string): string | null {
    const min = Number(minimum);
    const max = Number(maximum);
    if (!/^\d+$/.test(minimum) || !/^\d+$/.test(maximum) || min < 18 || max > 100 || min > max) {
        return 'Choose an age range from 18 to 100, with a maximum above the minimum.';
    }
    return null;
}

export function radiusError(value: string): string | null {
    const radius = Number(value);
    return /^\d+$/.test(value) && radius >= 1 && radius <= 500 ? null : 'Choose a distance from 1 to 500 km.';
}
