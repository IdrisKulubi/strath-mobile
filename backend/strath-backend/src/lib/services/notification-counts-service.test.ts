import { test } from "node:test";
import assert from "node:assert/strict";

import { buildSlotConfirmationView } from "@/lib/services/meetup-confirmation-service";
import type { mutualMatches } from "@/db/schema";

type MutualRow = typeof mutualMatches.$inferSelect;

function makeRow(overrides: Partial<MutualRow>): MutualRow {
    return {
        id: "mm-1",
        candidatePairId: "cp-1",
        userAId: "user-a",
        userBId: "user-b",
        status: "mutual",
        legacyMatchId: null,
        legacyDateMatchId: null,
        venueName: null,
        venueAddress: null,
        scheduledAt: new Date("2026-05-27T14:30:00.000Z"),
        userASlotConfirmedAt: null,
        userBSlotConfirmedAt: null,
        slotConfirmBy: new Date(Date.now() + 86400000),
        assignedSlot: "wednesday",
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
}

test("buildSlotConfirmationView flags pending confirm for viewer", () => {
    const slot = buildSlotConfirmationView(makeRow({}), "user-a");
    assert.equal(slot.needsSlotConfirmation, true);
    assert.equal(slot.viewerSlotConfirmed, false);
    assert.equal(slot.partnerSlotConfirmed, false);
});

test("buildSlotConfirmationView flags partner waiting when B confirmed", () => {
    const slot = buildSlotConfirmationView(
        makeRow({ userBSlotConfirmedAt: new Date() }),
        "user-a",
    );
    assert.equal(slot.viewerSlotConfirmed, false);
    assert.equal(slot.partnerSlotConfirmed, true);
});

test("buildSlotConfirmationView clears needs when both confirmed", () => {
    const slot = buildSlotConfirmationView(
        makeRow({
            userASlotConfirmedAt: new Date(),
            userBSlotConfirmedAt: new Date(),
        }),
        "user-a",
    );
    assert.equal(slot.needsSlotConfirmation, false);
});
