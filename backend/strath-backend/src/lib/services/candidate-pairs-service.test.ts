import test from "node:test";
import assert from "node:assert/strict";
import {
    canonicalizePairUsers,
    getCurrentUserDecision,
    getPairRole,
    resolveCandidatePairStatus,
} from "@/lib/services/candidate-pairs-service";
import { mapLegacyDateStatus } from "@/lib/services/mutual-match-service";

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
