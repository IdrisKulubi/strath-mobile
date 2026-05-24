import test from "node:test";
import assert from "node:assert/strict";
import {
    assignMeetupSlot,
    getMeetupSlotConfig,
    getNairobiParts,
    isConfirmWindowOpen,
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

test("getMeetupSlotConfig returns defaults when env unset", () => {
    const cfg = getMeetupSlotConfig();
    assert.equal(cfg.wednesdayHour, 17);
    assert.equal(cfg.saturdayHour, 15);
    assert.equal(cfg.confirmLeadHours, 6);
});
