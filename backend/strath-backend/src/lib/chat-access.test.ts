import { test } from "node:test";
import assert from "node:assert/strict";

import { shouldBlockChatForSlotConfirmation } from "@/lib/chat-access";

test("shouldBlockChatForSlotConfirmation allows being_arranged without viewer confirm", () => {
    const blocked = shouldBlockChatForSlotConfirmation("being_arranged", {
        needsSlotConfirmation: true,
        viewerSlotConfirmed: false,
    });
    assert.equal(blocked, false);
});

test("shouldBlockChatForSlotConfirmation blocks mutual when slot pending", () => {
    const blocked = shouldBlockChatForSlotConfirmation("mutual", {
        needsSlotConfirmation: true,
        viewerSlotConfirmed: false,
    });
    assert.equal(blocked, true);
});

test("shouldBlockChatForSlotConfirmation allows mutual when viewer confirmed", () => {
    const blocked = shouldBlockChatForSlotConfirmation("mutual", {
        needsSlotConfirmation: true,
        viewerSlotConfirmed: true,
    });
    assert.equal(blocked, false);
});

test("shouldBlockChatForSlotConfirmation allows upcoming without slot gate", () => {
    const blocked = shouldBlockChatForSlotConfirmation("upcoming", {
        needsSlotConfirmation: false,
        viewerSlotConfirmed: false,
    });
    assert.equal(blocked, false);
});
