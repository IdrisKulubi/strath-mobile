/**
 * Fixed campus meetup windows (Africa/Nairobi).
 * Sun–Wed match → next Wednesday 17:30; Thu–Fri → next Saturday 15:00; Sat → next Wednesday.
 */

export const MEETUP_TIMEZONE = "Africa/Nairobi";
export const EAT_UTC_OFFSET_HOURS = 3;

export type MeetupSlotKind = "wednesday" | "saturday";

export interface AssignedMeetupSlot {
    slot: MeetupSlotKind;
    scheduledAt: Date;
    confirmBy: Date;
}

/** One selectable Wed/Sat window for reschedule (Phase 2+). */
export type MeetupSlotOption = {
    slot: MeetupSlotKind;
    scheduledAt: Date;
    confirmBy: Date;
};

export interface ListUpcomingMeetupSlotOptionsParams {
    count?: number;
    excludeScheduledAt?: Date;
    config?: MeetupSlotConfig;
}

export interface MeetupSlotConfig {
    wednesdayHour: number;
    wednesdayMinute: number;
    saturdayHour: number;
    saturdayMinute: number;
    confirmLeadHours: number;
}

const WEEKDAY_SHORT_TO_DOW: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
};

const DEFAULT_CONFIG: MeetupSlotConfig = {
    wednesdayHour: 17,
    wednesdayMinute: 30,
    saturdayHour: 15,
    saturdayMinute: 0,
    confirmLeadHours: 6,
};

export function getMeetupSlotConfig(): MeetupSlotConfig {
    const wedH = Number(process.env.MEETUP_WED_HOUR);
    const wedM = Number(process.env.MEETUP_WED_MINUTE);
    const satH = Number(process.env.MEETUP_SAT_HOUR);
    const satM = Number(process.env.MEETUP_SAT_MINUTE);
    const lead = Number(process.env.MEETUP_CONFIRM_LEAD_HOURS);

    return {
        wednesdayHour: Number.isFinite(wedH) ? wedH : DEFAULT_CONFIG.wednesdayHour,
        wednesdayMinute: Number.isFinite(wedM) ? wedM : DEFAULT_CONFIG.wednesdayMinute,
        saturdayHour: Number.isFinite(satH) ? satH : DEFAULT_CONFIG.saturdayHour,
        saturdayMinute: Number.isFinite(satM) ? satM : DEFAULT_CONFIG.saturdayMinute,
        confirmLeadHours: Number.isFinite(lead) && lead > 0 ? lead : DEFAULT_CONFIG.confirmLeadHours,
    };
}

export interface NairobiDateTimeParts {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    dayOfWeek: number;
}

/** Calendar parts in Africa/Nairobi for an instant. */
export function getNairobiParts(instant: Date): NairobiDateTimeParts {
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: MEETUP_TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        weekday: "short",
    });

    const parts = formatter.formatToParts(instant);
    const pick = (type: Intl.DateTimeFormatPartTypes) =>
        Number(parts.find((p) => p.type === type)?.value ?? "0");

    const weekdayShort = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
    const dow = WEEKDAY_SHORT_TO_DOW[weekdayShort] ?? 0;

    return {
        year: pick("year"),
        month: pick("month"),
        day: pick("day"),
        hour: pick("hour"),
        minute: pick("minute"),
        dayOfWeek: dow,
    };
}

/** UTC instant for a Nairobi local wall-clock time (EAT = UTC+3, no DST). */
export function nairobiLocalToUtc(
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
): Date {
    return new Date(Date.UTC(year, month - 1, day, hour - EAT_UTC_OFFSET_HOURS, minute, 0, 0));
}

export function addDaysToNairobiDate(
    parts: Pick<NairobiDateTimeParts, "year" | "month" | "day">,
    days: number,
): Pick<NairobiDateTimeParts, "year" | "month" | "day"> {
    const utc = nairobiLocalToUtc(parts.year, parts.month, parts.day, 12, 0);
    const shifted = new Date(utc.getTime() + days * 24 * 60 * 60 * 1000);
    const next = getNairobiParts(shifted);
    return { year: next.year, month: next.month, day: next.day };
}

export function pickSlotKindForMatchDay(dayOfWeek: number): MeetupSlotKind {
    if (dayOfWeek >= 0 && dayOfWeek <= 3) return "wednesday";
    if (dayOfWeek === 4 || dayOfWeek === 5) return "saturday";
    return "wednesday";
}

const TARGET_DOW: Record<MeetupSlotKind, number> = {
    wednesday: 3,
    saturday: 6,
};

/**
 * Next occurrence of the meetup window at or after `after` (strictly future if same slot time passed).
 */
export function getNextMeetupOccurrence(
    slot: MeetupSlotKind,
    after: Date,
    config: MeetupSlotConfig = getMeetupSlotConfig(),
): Date {
    const parts = getNairobiParts(after);
    const targetDow = TARGET_DOW[slot];
    const hour = slot === "wednesday" ? config.wednesdayHour : config.saturdayHour;
    const minute = slot === "wednesday" ? config.wednesdayMinute : config.saturdayMinute;

    let daysAhead = (targetDow - parts.dayOfWeek + 7) % 7;
    if (daysAhead === 0) {
        const slotPassed =
            parts.hour > hour || (parts.hour === hour && parts.minute >= minute);
        if (slotPassed) daysAhead = 7;
    }

    const targetDate = addDaysToNairobiDate(parts, daysAhead);
    return nairobiLocalToUtc(targetDate.year, targetDate.month, targetDate.day, hour, minute);
}

/** Wednesday 17:30 EAT for the current Sun–Sat week in Nairobi (may be in the past). */
export function getThisWeekWednesdayOccurrence(
    reference: Date = new Date(),
    config: MeetupSlotConfig = getMeetupSlotConfig(),
): Date {
    const parts = getNairobiParts(reference);
    const daysBackToWednesday = (parts.dayOfWeek - TARGET_DOW.wednesday + 7) % 7;
    const wedDate = addDaysToNairobiDate(parts, -daysBackToWednesday);
    return nairobiLocalToUtc(
        wedDate.year,
        wedDate.month,
        wedDate.day,
        config.wednesdayHour,
        config.wednesdayMinute,
    );
}

export const LEGACY_ARRANGING_CONFIRM_GRACE_HOURS = 48;

/** One-time backfill slot for existing Arranging matches (this week's Wednesday). */
export function assignLegacyArrangingSlot(
    backfillAt: Date = new Date(),
    config: MeetupSlotConfig = getMeetupSlotConfig(),
): AssignedMeetupSlot {
    const scheduledAt = getThisWeekWednesdayOccurrence(backfillAt, config);
    const standardConfirmBy = new Date(
        scheduledAt.getTime() - config.confirmLeadHours * 60 * 60 * 1000,
    );
    const graceConfirmBy = new Date(
        backfillAt.getTime() + LEGACY_ARRANGING_CONFIRM_GRACE_HOURS * 60 * 60 * 1000,
    );
    const confirmBy =
        standardConfirmBy.getTime() > backfillAt.getTime()
            ? standardConfirmBy
            : graceConfirmBy;

    return { slot: "wednesday", scheduledAt, confirmBy };
}

function confirmByForScheduledAt(scheduledAt: Date, config: MeetupSlotConfig): Date {
    return new Date(scheduledAt.getTime() - config.confirmLeadHours * 60 * 60 * 1000);
}

function isSameMeetupInstant(a: Date, b: Date): boolean {
    return a.getTime() === b.getTime();
}

/**
 * Upcoming Wed/Sat meetup windows for reschedule pickers (Africa/Nairobi).
 * Walks forward in chronological order: next Wed or Sat after cursor, whichever is sooner,
 * then repeats. Skips slots whose confirm deadline has passed and the current assignment.
 */
export function listUpcomingMeetupSlotOptions(
    now: Date,
    options: ListUpcomingMeetupSlotOptionsParams = {},
): MeetupSlotOption[] {
    const count = options.count ?? 4;
    const config = options.config ?? getMeetupSlotConfig();
    const excludeScheduledAt = options.excludeScheduledAt;

    const result: MeetupSlotOption[] = [];
    let cursor = now;
    const maxIterations = Math.max(count * 16, 32);

    for (let i = 0; i < maxIterations && result.length < count; i++) {
        const nextWednesday = getNextMeetupOccurrence("wednesday", cursor, config);
        const nextSaturday = getNextMeetupOccurrence("saturday", cursor, config);

        const pickWednesday = nextWednesday.getTime() <= nextSaturday.getTime();
        const slot: MeetupSlotKind = pickWednesday ? "wednesday" : "saturday";
        const scheduledAt = pickWednesday ? nextWednesday : nextSaturday;
        const confirmBy = confirmByForScheduledAt(scheduledAt, config);

        cursor = new Date(scheduledAt.getTime() + 1);

        if (confirmBy.getTime() <= now.getTime()) {
            continue;
        }

        if (excludeScheduledAt && isSameMeetupInstant(scheduledAt, excludeScheduledAt)) {
            continue;
        }

        result.push({ slot, scheduledAt, confirmBy });
    }

    return result;
}

export function assignMeetupSlot(
    mutualAt: Date,
    config: MeetupSlotConfig = getMeetupSlotConfig(),
): AssignedMeetupSlot {
    const nairobi = getNairobiParts(mutualAt);
    const slot = pickSlotKindForMatchDay(nairobi.dayOfWeek);
    const scheduledAt = getNextMeetupOccurrence(slot, mutualAt, config);
    const confirmBy = confirmByForScheduledAt(scheduledAt, config);

    return { slot, scheduledAt, confirmBy };
}

export function isConfirmWindowOpen(confirmBy: Date, now: Date = new Date()): boolean {
    return now.getTime() < confirmBy.getTime();
}

export function formatMeetupSlotForDisplay(
    scheduledAt: Date,
    locale = "en-KE",
): string {
    return scheduledAt.toLocaleString(locale, {
        timeZone: MEETUP_TIMEZONE,
        weekday: "long",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

export function bothUsersConfirmedSlot(row: {
    userASlotConfirmedAt: Date | null;
    userBSlotConfirmedAt: Date | null;
}): boolean {
    return Boolean(row.userASlotConfirmedAt && row.userBSlotConfirmedAt);
}

const SLOT_CONFIRM_STATUSES = ["mutual", "being_arranged"] as const;

export type SlotConfirmStatus = (typeof SLOT_CONFIRM_STATUSES)[number];

export function isSlotConfirmEligibleStatus(
    status: string,
): status is SlotConfirmStatus {
    return (SLOT_CONFIRM_STATUSES as readonly string[]).includes(status);
}
