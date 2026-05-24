/**
 * Display helpers for assigned meetup slots (assignment logic lives on the backend).
 */

const MEETUP_TIMEZONE = 'Africa/Nairobi';

export function formatMeetupSlot(iso: string, locale = 'en-KE'): string {
    try {
        const d = new Date(iso);
        return d.toLocaleString(locale, {
            timeZone: MEETUP_TIMEZONE,
            weekday: 'long',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
    } catch {
        return iso;
    }
}

export function formatConfirmBy(iso: string, locale = 'en-KE'): string {
    try {
        const d = new Date(iso);
        return d.toLocaleString(locale, {
            timeZone: MEETUP_TIMEZONE,
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
    } catch {
        return iso;
    }
}

export const MEETUP_WINDOWS_COPY =
    'StrathSpace dates are Wednesdays at 5:30 PM and Saturdays at 3:00 PM on campus.';
