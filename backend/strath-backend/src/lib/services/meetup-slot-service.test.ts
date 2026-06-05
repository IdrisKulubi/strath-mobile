import test from "node:test";
import assert from "node:assert/strict";
import {
    assignLegacyArrangingSlot,
    assignMeetupSlot,
    getMeetupSlotConfig,
    getNairobiParts,
    getThisWeekWednesdayOccurrence,
    isConfirmWindowOpen,
    listUpcomingMeetupSlotOptions,
    pickSlotKindForMatchDay,
    nairobiLocalToUtc,
} from "@/lib/services/meetup-slot-service";

const CONFIG = {
    wednesdayHour: 17,
    wednesdayMinute: 30,
    saturdayHour: 15,
    saturdayMinute: 0,
    confirmLeadHours: 6,
};

function mutualAtNairobi(
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
): Date {
    return nairobiLocalToUtc(year, month, day, hour, minute);
}

test("pickSlotKindForMatchDay maps Sun–Wed to wednesday, Thu–Fri to saturday, Sat to wednesday", () => {
    assert.equal(pickSlotKindForMatchDay(0), "wednesday");
    assert.equal(pickSlotKindForMatchDay(3), "wednesday");
    assert.equal(pickSlotKindForMatchDay(4), "saturday");
    assert.equal(pickSlotKindForMatchDay(5), "saturday");
    assert.equal(pickSlotKindForMatchDay(6), "wednesday");
});

test("Monday match assigns next Wednesday 17:30 EAT", () => {
    const mutualAt = mutualAtNairobi(2026, 5, 18, 10, 0);
    assert.equal(getNairobiParts(mutualAt).dayOfWeek, 1);

    const { slot, scheduledAt } = assignMeetupSlot(mutualAt, CONFIG);
    assert.equal(slot, "wednesday");

    const scheduled = getNairobiParts(scheduledAt);
    assert.equal(scheduled.dayOfWeek, 3);
    assert.equal(scheduled.hour, 17);
    assert.equal(scheduled.minute, 30);
    assert.equal(scheduled.year, 2026);
    assert.equal(scheduled.month, 5);
    assert.equal(scheduled.day, 20);
});

test("Thursday match assigns next Saturday 15:00 EAT", () => {
    const mutualAt = mutualAtNairobi(2026, 5, 21, 9, 0);
    const { slot, scheduledAt } = assignMeetupSlot(mutualAt, CONFIG);
    assert.equal(slot, "saturday");

    const scheduled = getNairobiParts(scheduledAt);
    assert.equal(scheduled.dayOfWeek, 6);
    assert.equal(scheduled.hour, 15);
    assert.equal(scheduled.minute, 0);
    assert.equal(scheduled.day, 23);
});

test("Saturday match assigns next Wednesday (not Saturday)", () => {
    const mutualAt = mutualAtNairobi(2026, 5, 23, 11, 0);
    const { slot, scheduledAt } = assignMeetupSlot(mutualAt, CONFIG);
    assert.equal(slot, "wednesday");

    const scheduled = getNairobiParts(scheduledAt);
    assert.equal(scheduled.dayOfWeek, 3);
    assert.equal(scheduled.day, 27);
});

test("confirmBy is six hours before scheduledAt", () => {
    const mutualAt = mutualAtNairobi(2026, 5, 18, 10, 0);
    const { scheduledAt, confirmBy } = assignMeetupSlot(mutualAt, CONFIG);
    const diffMs = scheduledAt.getTime() - confirmBy.getTime();
    assert.equal(diffMs, 6 * 60 * 60 * 1000);
});

test("isConfirmWindowOpen respects confirmBy", () => {
    const confirmBy = new Date("2026-05-20T11:30:00.000Z");
    assert.equal(isConfirmWindowOpen(confirmBy, new Date("2026-05-20T11:00:00.000Z")), true);
    assert.equal(isConfirmWindowOpen(confirmBy, new Date("2026-05-20T12:00:00.000Z")), false);
});

test("getThisWeekWednesdayOccurrence uses current week Wednesday in Nairobi", () => {
    const thu = mutualAtNairobi(2026, 5, 21, 10, 0);
    const scheduled = getThisWeekWednesdayOccurrence(thu, CONFIG);
    const parts = getNairobiParts(scheduled);
    assert.equal(parts.dayOfWeek, 3);
    assert.equal(parts.day, 20);
});

test("assignLegacyArrangingSlot uses grace confirmBy when Wednesday already passed", () => {
    const sat = mutualAtNairobi(2026, 5, 23, 12, 0);
    const { slot, scheduledAt, confirmBy } = assignLegacyArrangingSlot(sat, CONFIG);
    assert.equal(slot, "wednesday");
    assert.equal(getNairobiParts(scheduledAt).day, 20);
    assert.ok(confirmBy.getTime() > sat.getTime());
});

test("getMeetupSlotConfig returns defaults when env unset", () => {
    const cfg = getMeetupSlotConfig();
    assert.equal(cfg.wednesdayHour, 17);
    assert.equal(cfg.saturdayHour, 15);
    assert.equal(cfg.confirmLeadHours, 6);
});

test("listUpcomingMeetupSlotOptions returns next four Wed/Sat slots in chronological order", () => {
    const now = mutualAtNairobi(2026, 6, 5, 10, 0);
    const options = listUpcomingMeetupSlotOptions(now, { count: 4, config: CONFIG });

    assert.equal(options.length, 4);

    const expected = [
        { slot: "saturday" as const, day: 6, hour: 15, minute: 0 },
        { slot: "wednesday" as const, day: 10, hour: 17, minute: 30 },
        { slot: "saturday" as const, day: 13, hour: 15, minute: 0 },
        { slot: "wednesday" as const, day: 17, hour: 17, minute: 30 },
    ];

    for (let i = 0; i < expected.length; i++) {
        const opt = options[i];
        const exp = expected[i];
        assert.equal(opt.slot, exp.slot);
        const parts = getNairobiParts(opt.scheduledAt);
        assert.equal(parts.month, 6);
        assert.equal(parts.day, exp.day);
        assert.equal(parts.hour, exp.hour);
        assert.equal(parts.minute, exp.minute);
        assert.equal(
            opt.scheduledAt.getTime() - opt.confirmBy.getTime(),
            6 * 60 * 60 * 1000,
        );
        assert.ok(opt.confirmBy.getTime() > now.getTime());
    }
});

test("listUpcomingMeetupSlotOptions excludes current assignment instant", () => {
    const now = mutualAtNairobi(2026, 6, 5, 10, 0);
    const currentSaturday = mutualAtNairobi(2026, 6, 6, 15, 0);

    const options = listUpcomingMeetupSlotOptions(now, {
        count: 4,
        excludeScheduledAt: currentSaturday,
        config: CONFIG,
    });

    assert.equal(options.length, 4);
    assert.ok(
        options.every((o) => o.scheduledAt.getTime() !== currentSaturday.getTime()),
    );
    assert.equal(options[0].slot, "wednesday");
    assert.equal(getNairobiParts(options[0].scheduledAt).day, 10);
});

test("listUpcomingMeetupSlotOptions skips slots whose confirm window has closed", () => {
    const saturdaySlot = mutualAtNairobi(2026, 6, 6, 15, 0);
    const now = mutualAtNairobi(2026, 6, 6, 14, 0);

    const options = listUpcomingMeetupSlotOptions(now, { count: 2, config: CONFIG });

    assert.equal(options.length, 2);
    assert.ok(
        options.every((o) => o.scheduledAt.getTime() !== saturdaySlot.getTime()),
    );
    assert.equal(options[0].slot, "wednesday");
    assert.equal(getNairobiParts(options[0].scheduledAt).day, 10);
});
