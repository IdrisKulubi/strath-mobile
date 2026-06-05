import test from "node:test";
import assert from "node:assert/strict";
import {
    countCounterProposalsInChain,
    findMatchingSlotOption,
    getPartnerUserId,
    isDeclineReasonValid,
    isRescheduleEligibleMatchStatus,
    isViewerSlotConfirmed,
    MAX_COUNTER_PROPOSALS,
} from "@/lib/meetup-reschedule/validation";
import { getNairobiParts, nairobiLocalToUtc } from "@/lib/services/meetup-slot-service";

function mutualAtNairobi(
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
): Date {
    return nairobiLocalToUtc(year, month, day, hour, minute);
}

test("getPartnerUserId returns the other user", () => {
    const row = { userAId: "a", userBId: "b" };
    assert.equal(getPartnerUserId(row, "a"), "b");
    assert.equal(getPartnerUserId(row, "c"), null);
});

test("isViewerSlotConfirmed reflects confirmation timestamps", () => {
    const row = {
        userAId: "a",
        userBId: "b",
        userASlotConfirmedAt: new Date(),
        userBSlotConfirmedAt: null,
    };
    assert.equal(isViewerSlotConfirmed(row, "a"), true);
    assert.equal(isViewerSlotConfirmed(row, "b"), false);
});

test("isRescheduleEligibleMatchStatus allows mutual and being_arranged only", () => {
    assert.equal(isRescheduleEligibleMatchStatus("mutual"), true);
    assert.equal(isRescheduleEligibleMatchStatus("being_arranged"), true);
    assert.equal(isRescheduleEligibleMatchStatus("upcoming"), false);
});

test("findMatchingSlotOption returns a valid upcoming slot", () => {
    const now = mutualAtNairobi(2026, 6, 5, 10, 0);
    const match = findMatchingSlotOption(mutualAtNairobi(2026, 6, 6, 15, 0), now);
    assert.ok(match);
    assert.equal(match.slot, "saturday");
    assert.equal(getNairobiParts(match.scheduledAt).day, 6);
});

test("findMatchingSlotOption excludes current assignment", () => {
    const now = mutualAtNairobi(2026, 6, 5, 10, 0);
    const current = mutualAtNairobi(2026, 6, 6, 15, 0);
    const match = findMatchingSlotOption(current, now, { excludeScheduledAt: current });
    assert.equal(match, null);
});

test("countCounterProposalsInChain counts counter-linked rows", () => {
    assert.equal(
        countCounterProposalsInChain([
            { counterOfRequestId: null },
            { counterOfRequestId: "x" },
            { counterOfRequestId: "y" },
        ]),
        2,
    );
    assert.equal(countCounterProposalsInChain([]), 0);
    assert.equal(
        countCounterProposalsInChain(
            Array.from({ length: MAX_COUNTER_PROPOSALS }, () => ({
                counterOfRequestId: "prev",
            })),
        ),
        MAX_COUNTER_PROPOSALS,
    );
});

test("isDeclineReasonValid enforces minimum length", () => {
    assert.equal(isDeclineReasonValid("ok"), false);
    assert.equal(isDeclineReasonValid("  works for me  "), true);
});
