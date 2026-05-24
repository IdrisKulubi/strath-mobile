import test from "node:test";
import assert from "node:assert/strict";
import { mapDateMatchStatusToMutualStatus } from "@/lib/services/mutual-match-service";

const base = {
    status: "pending_setup" as const,
    callCompleted: false,
    userAConfirmed: false,
    userBConfirmed: false,
};

test("mapDateMatchStatusToMutualStatus resolves pending_setup to being_arranged", () => {
    assert.equal(mapDateMatchStatusToMutualStatus(base), "being_arranged");
});

test("mapDateMatchStatusToMutualStatus promotes scheduled dates to upcoming", () => {
    assert.equal(
        mapDateMatchStatusToMutualStatus({
            ...base,
            status: "scheduled",
            callCompleted: true,
            userAConfirmed: true,
            userBConfirmed: true,
        }),
        "upcoming",
    );
});

test("mapDateMatchStatusToMutualStatus promotes attended dates to completed", () => {
    assert.equal(
        mapDateMatchStatusToMutualStatus({
            ...base,
            status: "attended",
            callCompleted: true,
            userAConfirmed: true,
            userBConfirmed: true,
        }),
        "completed",
    );
});

test("mapDateMatchStatusToMutualStatus flattens cancelled / no_show to cancelled", () => {
    assert.equal(
        mapDateMatchStatusToMutualStatus({ ...base, status: "cancelled" }),
        "cancelled",
    );
    assert.equal(
        mapDateMatchStatusToMutualStatus({ ...base, status: "no_show" }),
        "cancelled",
    );
});
