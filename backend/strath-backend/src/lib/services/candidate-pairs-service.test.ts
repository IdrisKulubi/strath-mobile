import test from "node:test";
import assert from "node:assert/strict";
import {
    addUtcDays,
    canonicalizePairUsers,
    getCurrentUserDecision,
    getPairRole,
    resolveCandidatePairStatus,
    startOfNextUtcDay,
    startOfUtcDay,
} from "@/lib/services/candidate-pairs-service";
import { mapLegacyDateStatus } from "@/lib/services/mutual-match-service";

test("startOfNextUtcDay returns following UTC midnight", () => {
    const from = new Date(Date.UTC(2026, 3, 19, 14, 30, 0));
    const next = startOfNextUtcDay(from);
    assert.equal(next.toISOString(), "2026-04-20T00:00:00.000Z");
});

test("startOfUtcDay normalizes to UTC midnight", () => {
    const d = new Date(Date.UTC(2026, 0, 2, 23, 59, 59));
    const s = startOfUtcDay(d);
    assert.equal(s.toISOString(), "2026-01-02T00:00:00.000Z");
});

test("addUtcDays advances calendar days in UTC", () => {
    const base = new Date(Date.UTC(2026, 0, 28, 12, 0, 0));
    const out = addUtcDays(base, 3);
    assert.equal(out.toISOString(), "2026-01-31T12:00:00.000Z");
});

test("canonicalizePairUsers stores pair members deterministically", () => {
    assert.deepEqual(
        canonicalizePairUsers("user-z", "user-a"),
        { userAId: "user-a", userBId: "user-z" },
    );
});

test("getPairRole and decision resolve the caller correctly", () => {
    const pair = {
        userAId: "idris",
        userBId: "morin",
        aDecision: "open_to_meet" as const,
        bDecision: "pending" as const,
    };

    assert.equal(getPairRole(pair, "idris"), "a");
    assert.equal(getPairRole(pair, "morin"), "b");
    assert.equal(getCurrentUserDecision(pair, "idris"), "open_to_meet");
    assert.equal(getCurrentUserDecision(pair, "morin"), "pending");
});

test("resolveCandidatePairStatus closes on any pass", () => {
    assert.equal(resolveCandidatePairStatus("passed", "pending"), "closed");
    assert.equal(resolveCandidatePairStatus("open_to_meet", "passed"), "closed");
});

test("resolveCandidatePairStatus becomes mutual only on double yes", () => {
    assert.equal(resolveCandidatePairStatus("open_to_meet", "open_to_meet"), "mutual");
    assert.equal(resolveCandidatePairStatus("open_to_meet", "pending"), "active");
});

test("mapLegacyDateStatus keeps legacy date matches compatible with new sections", () => {
    const baseDateMatch = {
        id: "date-1",
        requestId: null,
        candidatePairId: null,
        userAId: "idris",
        userBId: "morin",
        vibe: "coffee" as const,
        callCompleted: false,
        userAConfirmed: false,
        userBConfirmed: false,
        status: "pending_setup" as const,
        locationId: null,
        venueName: null,
        venueAddress: null,
        scheduledAt: null,
        createdAt: new Date(),
    };

    assert.equal(mapLegacyDateStatus(baseDateMatch), "call_pending");
    assert.equal(
        mapLegacyDateStatus({ ...baseDateMatch, callCompleted: true, userAConfirmed: true, userBConfirmed: true }),
        "being_arranged",
    );
    assert.equal(
        mapLegacyDateStatus({ ...baseDateMatch, callCompleted: true, userAConfirmed: true, userBConfirmed: false }),
        "call_pending",
    );
    assert.equal(mapLegacyDateStatus({ ...baseDateMatch, status: "scheduled", callCompleted: true }), "upcoming");
    assert.equal(mapLegacyDateStatus({ ...baseDateMatch, status: "attended" }), "completed");
    assert.equal(mapLegacyDateStatus({ ...baseDateMatch, status: "cancelled" }), "cancelled");
});
