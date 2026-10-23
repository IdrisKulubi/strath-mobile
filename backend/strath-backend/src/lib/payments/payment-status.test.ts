import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { DatePayment } from "@/db/schema";
import {
    isDateMatchParticipant,
    isPaymentRowPaid,
    resolveOtherUserId,
} from "@/lib/payments/payment-status-service";

const match = { userAId: "user-a", userBId: "user-b" };

describe("payment-status helpers", () => {
    it("isDateMatchParticipant accepts both users", () => {
        assert.equal(isDateMatchParticipant(match, "user-a"), true);
        assert.equal(isDateMatchParticipant(match, "user-b"), true);
        assert.equal(isDateMatchParticipant(match, "stranger"), false);
    });

    it("resolveOtherUserId returns the partner", () => {
        assert.equal(resolveOtherUserId(match, "user-a"), "user-b");
        assert.equal(resolveOtherUserId(match, "user-b"), "user-a");
        assert.equal(resolveOtherUserId(match, "stranger"), null);
    });

    it("isPaymentRowPaid is true only for paid status", () => {
        assert.equal(isPaymentRowPaid(null), false);
        assert.equal(
            isPaymentRowPaid({ status: "pending" } as DatePayment),
            false,
        );
        assert.equal(
            isPaymentRowPaid({ status: "paid" } as DatePayment),
            true,
        );
    });
});
