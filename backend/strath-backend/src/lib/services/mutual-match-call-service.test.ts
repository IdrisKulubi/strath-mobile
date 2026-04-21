import test from "node:test";
import assert from "node:assert/strict";

import {
    canonicalizeMatchUsers,
    shouldSendCallReadyNotification,
} from "@/lib/services/mutual-match-call-service";

test("canonicalizeMatchUsers stores the legacy chat pair deterministically", () => {
    assert.deepEqual(
        canonicalizeMatchUsers("user-z", "user-a"),
        { user1Id: "user-a", user2Id: "user-z" },
    );
    assert.deepEqual(
        canonicalizeMatchUsers("user-a", "user-z"),
        { user1Id: "user-a", user2Id: "user-z" },
    );
});

test("shouldSendCallReadyNotification only nudges for a newly created call", () => {
    assert.equal(shouldSendCallReadyNotification("ExponentPushToken[123]", true), true);
    assert.equal(shouldSendCallReadyNotification("ExponentPushToken[123]", false), false);
    assert.equal(shouldSendCallReadyNotification(null, true), false);
});
