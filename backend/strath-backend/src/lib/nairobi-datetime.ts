/**
 * Campus dates use Africa/Nairobi wall time everywhere (EAT = UTC+3, no DST).
 * Admin datetime-local values are interpreted as Nairobi, not server/browser local.
 */

import {
    MEETUP_TIMEZONE,
    addDaysToNairobiDate,
    getNairobiParts,
    nairobiLocalToUtc,
} from "@/lib/services/meetup-slot-service";

export { MEETUP_TIMEZONE };

/** Parse `YYYY-MM-DDTHH:mm` (or ISO with offset) as Nairobi local → UTC instant. */
export function parseNairobiDateTimeLocal(value: string): Date {
    const trimmed = value.trim();
    if (!trimmed) {
        throw new Error("Empty datetime");
    }

    if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(trimmed)) {
        return new Date(trimmed);
    }

    const normalized = trimmed.length >= 16 ? trimmed.slice(0, 16) : trimmed;
    const [datePart, timePart] = normalized.split("T");
    if (!datePart || !timePart) {
        throw new Error("Invalid datetime format");
    }

    const [year, month, day] = datePart.split("-").map(Number);
    const [hour, minute] = timePart.split(":").map((segment) => Number(segment));

    return nairobiLocalToUtc(year, month, day, hour, minute);
}

/** Format a UTC instant for `<input type="datetime-local" />` in Nairobi. */
export function toNairobiDateTimeLocalInput(instant: Date): string {
    const parts = getNairobiParts(instant);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

/** Normalize stored ISO or local input for pickers. */
export function normalizeNairobiDateTimeInput(value: string | null | undefined): string | null {
    if (!value) return null;
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
        return value;
    }
    return toNairobiDateTimeLocalInput(new Date(value));
}

function toInstant(value: Date | string): Date {
    if (value instanceof Date) return value;
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
        return parseNairobiDateTimeLocal(value);
    }
    return new Date(value);
}

export function formatNairobiDateTime(
    value: Date | string,
    options: Intl.DateTimeFormatOptions,
    locale = "en-KE",
): string {
    return toInstant(value).toLocaleString(locale, {
        ...options,
        timeZone: MEETUP_TIMEZONE,
    });
}

export function getNairobiNowParts() {
    return getNairobiParts(new Date());
}

export function nairobiPresetInstant(
    base: ReturnType<typeof getNairobiParts>,
    dayOffset: number,
    hour: number,
    minute: number,
): Date {
    const date = addDaysToNairobiDate(base, dayOffset);
    return nairobiLocalToUtc(date.year, date.month, date.day, hour, minute);
}
